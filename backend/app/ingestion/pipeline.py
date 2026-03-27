"""Pipeline orchestrator with parallel episode processing.

Phase A: Process episodes in parallel (transcribe → chunk → summarize → extract)
Phase B: Merge all episodes into the global database and generate embeddings
"""

import json
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

from app.core.config import settings
from app.ingestion.embed import embed_all_episodes
from app.ingestion.state import (
    get_episode_id,
    is_episode_complete,
    load_all_states,
    migrate_legacy_state,
)
from app.ingestion.worker import EpisodeResult, process_episode_worker


def load_existing_episode(episode_id: str) -> tuple[list[dict], list[dict | None]]:
    """Load scenes and summaries from disk for an already-processed episode."""
    scenes_path = settings.scenes_dir / f"{episode_id}.json"
    summaries_path = settings.summaries_dir / f"{episode_id}.json"

    with open(scenes_path) as f:
        scenes = json.load(f)
    with open(summaries_path) as f:
        summaries = json.load(f)

    return scenes, summaries


def build_scenes_db(
    all_scenes: list[dict],
    all_summaries: list[dict | None],
) -> list[dict]:
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
            "has_clean_start": True,
            "has_clean_end": True,
            "trim_in": 0.0,
            "trim_out": scene["duration"],
            "segments": [],
            **summary,
        }
        db_scenes.append(db_scene)

    settings.db_dir.mkdir(parents=True, exist_ok=True)
    with open(settings.db_dir / "scenes.json", "w") as f:
        json.dump(db_scenes, f, indent=2)

    return db_scenes


def run_pipeline(episode_paths: list[Path], workers: int = 1) -> None:
    """Run the full ingestion pipeline across all episodes.

    Args:
        episode_paths: List of video file paths to process.
        workers: Number of episodes to process in parallel.
    """
    # One-time migration from legacy single state file
    migrate_legacy_state()

    # Identify which episodes need processing
    episodes_to_process = []
    episodes_already_done = []

    for video_path in episode_paths:
        episode_id = get_episode_id(video_path)
        if is_episode_complete(episode_id):
            episodes_already_done.append(episode_id)
        else:
            episodes_to_process.append(video_path)

    if episodes_already_done:
        print(f"Skipping {len(episodes_already_done)} already-complete episode(s)")

    # ── Phase A: Parallel per-episode processing ──

    results: list[EpisodeResult] = []

    if episodes_to_process:
        total = len(episodes_to_process)
        print(f"\nProcessing {total} episode(s) with {workers} worker(s)...")

        if workers == 1:
            # Sequential — avoid ProcessPoolExecutor overhead
            for i, video_path in enumerate(episodes_to_process, 1):
                episode_id = get_episode_id(video_path)
                episode_title = _get_episode_title(video_path)
                print(f"\n[{i}/{total}] {video_path.name} ({episode_id})")
                result = process_episode_worker(str(video_path), episode_id, episode_title)
                results.append(result)
                _print_result(result, i, total)
        else:
            # Parallel
            with ProcessPoolExecutor(max_workers=workers) as pool:
                future_to_path = {}
                for video_path in episodes_to_process:
                    episode_id = get_episode_id(video_path)
                    episode_title = _get_episode_title(video_path)
                    future = pool.submit(
                        process_episode_worker,
                        str(video_path),
                        episode_id,
                        episode_title,
                    )
                    future_to_path[future] = video_path

                completed = 0
                for future in as_completed(future_to_path):
                    completed += 1
                    result = future.result()
                    results.append(result)
                    _print_result(result, completed, total)

    # Report failures
    failures = [r for r in results if not r.success]
    if failures:
        print(f"\n{'='*50}")
        print(f"{len(failures)} episode(s) FAILED:")
        for r in failures:
            print(f"  {r.episode_id}: {r.error}")
        print(f"{'='*50}")

    # ── Phase B: Global merge (load all completed episodes from disk) ──

    all_scenes: list[dict] = []
    all_summaries: list[dict | None] = []

    # Load ALL completed episodes (this run + previous runs)
    all_states = load_all_states()
    for episode_id, ep_state in sorted(all_states.items()):
        if all(ep_state.get(step) for step in ("transcribed", "chunked", "summarized", "clipped")):
            try:
                scenes, summaries = load_existing_episode(episode_id)
                all_scenes.extend(scenes)
                all_summaries.extend(summaries)
            except FileNotFoundError:
                print(f"Warning: Could not load data for {episode_id}, skipping in merge")

    if not all_scenes:
        print("\nNo scenes to build database from.")
        return

    print(f"\n[Merge] Building scenes database from {len(all_states)} episode(s)...")
    db_scenes = build_scenes_db(all_scenes, all_summaries)
    print(f"  {len(db_scenes)} scenes in database")

    print("[Merge] Generating embeddings...")
    embed_all_episodes(all_scenes, all_summaries)
    print("  Embeddings saved")

    succeeded = sum(1 for r in results if r.success)
    print(f"\nPipeline complete! {succeeded} new + {len(episodes_already_done)} cached = {len(db_scenes)} searchable clips.")


def _get_episode_title(video_path: Path) -> str:
    """Extract episode title from filename."""
    import re
    stem = video_path.stem
    title = re.sub(r"[Ss]\d+[Ee]\d+[\s_\-\.]*", "", stem)
    title = title.replace("_", " ").replace(".", " ").strip()
    return title or stem


def _print_result(result: EpisodeResult, completed: int, total: int) -> None:
    if result.success:
        print(f"\n[{completed}/{total} done] {result.episode_id}: {result.scene_count} scenes in {result.duration_secs}s")
    else:
        print(f"\n[{completed}/{total} done] {result.episode_id}: FAILED — {result.error}")
