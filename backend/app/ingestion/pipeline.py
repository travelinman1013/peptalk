"""Pipeline orchestrator with resumable state.

Runs all ingestion steps in sequence for each episode,
tracking progress in pipeline_state.json for resumability.
"""

import json
from pathlib import Path

from app.core.config import settings
from app.ingestion.chunk import chunk_episode
from app.ingestion.embed import embed_all_episodes
from app.ingestion.extract import extract_episode_clips
from app.ingestion.summarize import summarize_episode
from app.ingestion.transcribe import transcribe_episode

STATE_FILE = "pipeline_state.json"


def load_state() -> dict:
    state_path = settings.data_dir / STATE_FILE
    if state_path.exists():
        with open(state_path) as f:
            return json.load(f)
    return {}


def save_state(state: dict) -> None:
    state_path = settings.data_dir / STATE_FILE
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    with open(state_path, "w") as f:
        json.dump(state, f, indent=2)


def get_episode_id(video_path: Path) -> str:
    """Derive episode ID from filename. Expects format like s01e01 or S01E01."""
    stem = video_path.stem.lower()
    # Try to extract season/episode pattern
    import re
    match = re.search(r"s(\d+)e(\d+)", stem)
    if match:
        return f"s{int(match.group(1)):02d}e{int(match.group(2)):02d}"
    # Fallback: use sanitized filename
    return re.sub(r"[^a-z0-9]", "_", stem).strip("_")


def get_episode_title(video_path: Path) -> str:
    """Extract episode title from filename."""
    stem = video_path.stem
    # Remove common patterns like "S01E01 - " or "s01e01_"
    import re
    title = re.sub(r"[Ss]\d+[Ee]\d+[\s_\-\.]*", "", stem)
    title = title.replace("_", " ").replace(".", " ").strip()
    return title or stem


def process_episode(video_path: Path, state: dict) -> tuple[list[dict], list[dict | None]]:
    """Process a single episode through all pipeline stages."""
    episode_id = get_episode_id(video_path)
    episode_title = get_episode_title(video_path)

    if episode_id not in state:
        state[episode_id] = {
            "transcribed": False,
            "chunked": False,
            "summarized": False,
            "clipped": False,
            "video_path": str(video_path),
        }

    ep_state = state[episode_id]

    # Step 1: Transcribe
    print(f"  [1/4] Transcribing {episode_id}...")
    transcript = transcribe_episode(video_path, episode_id)
    ep_state["transcribed"] = True
    save_state(state)
    source = transcript.get("transcript_source", "unknown")
    print(f"    Source: {source} ({len(transcript.get('segments', []))} segments)")

    # Step 2: Chunk
    print(f"  [2/4] Chunking {episode_id}...")
    scenes = chunk_episode(video_path, episode_id, transcript)
    ep_state["chunked"] = True
    save_state(state)
    print(f"    {len(scenes)} scenes detected")

    # Step 3: Summarize
    print(f"  [3/4] Summarizing {episode_id}...")
    summaries = summarize_episode(video_path, episode_id, episode_title, scenes)
    ep_state["summarized"] = True
    save_state(state)
    valid_summaries = sum(1 for s in summaries if s is not None)
    print(f"    {valid_summaries} scenes summarized")

    # Step 4: Extract clips
    print(f"  [4/4] Extracting clips for {episode_id}...")
    extract_episode_clips(video_path, scenes)
    ep_state["clipped"] = True
    save_state(state)

    return scenes, summaries


def build_scenes_db(
    all_scenes: list[dict],
    all_summaries: list[dict | None],
) -> None:
    """Combine scenes and summaries into the final scenes.json database."""
    db_scenes = []

    for scene, summary in zip(all_scenes, all_summaries):
        if summary is None:
            continue

        db_scene = {
            "scene_id": scene["scene_id"],
            "episode_id": scene["episode_id"],
            "start_time": scene["start_time"],
            "end_time": scene["end_time"],
            "duration": scene["duration"],
            "clip_path": f"clips/{scene['scene_id']}.mp4",
            "thumbnail_path": f"thumbnails/{scene['scene_id']}.jpg",
            "scene_type": scene.get("scene_type", "narrative"),
            "transcript": scene.get("transcript_text", ""),
            "visual_cuts": scene.get("visual_cuts", []),
            "has_clean_start": True,  # Default; can be refined later
            "has_clean_end": True,
            "trim_in": 0.0,
            "trim_out": scene["duration"],
            "segments": [],  # Empty for PoC; future multi-clip composition
            # Merge summary fields
            **summary,
        }
        db_scenes.append(db_scene)

    settings.db_dir.mkdir(parents=True, exist_ok=True)
    with open(settings.db_dir / "scenes.json", "w") as f:
        json.dump(db_scenes, f, indent=2)

    return db_scenes


def run_pipeline(episode_paths: list[Path]) -> None:
    """Run the full ingestion pipeline across all episodes."""
    state = load_state()

    all_scenes: list[dict] = []
    all_summaries: list[dict | None] = []

    for i, video_path in enumerate(episode_paths, 1):
        episode_id = get_episode_id(video_path)
        print(f"\n[{i}/{len(episode_paths)}] Processing: {video_path.name} ({episode_id})")

        scenes, summaries = process_episode(video_path, state)
        all_scenes.extend(scenes)
        all_summaries.extend(summaries)

    # Step 5: Build combined database and embeddings
    print("\n[Final] Building scenes database...")
    db_scenes = build_scenes_db(all_scenes, all_summaries)
    print(f"  {len(db_scenes)} scenes in database")

    print("[Final] Generating embeddings...")
    embed_all_episodes(all_scenes, all_summaries)
    print("  Embeddings saved")

    print(f"\nPipeline complete! {len(db_scenes)} searchable clips ready.")
