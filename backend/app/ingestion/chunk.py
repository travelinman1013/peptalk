"""Scene chunking using PySceneDetect with merge logic.

Uses AdaptiveContentDetector for animation-friendly scene detection,
then merges short segments and tags structural scenes.
"""

import json
from pathlib import Path

from scenedetect import open_video, SceneManager
from scenedetect.detectors import AdaptiveDetector

from app.core.config import settings


def detect_scenes(video_path: Path) -> list[tuple[float, float]]:
    video = open_video(str(video_path))
    scene_manager = SceneManager()
    scene_manager.add_detector(
        AdaptiveDetector(
            adaptive_threshold=settings.scene_detect_threshold,
            min_scene_len=settings.scene_detect_min_scene_len,
        )
    )
    scene_manager.detect_scenes(video)

    scene_list = scene_manager.get_scene_list()
    return [
        (scene[0].get_seconds(), scene[1].get_seconds()) for scene in scene_list
    ]


def merge_short_scenes(
    scenes: list[tuple[float, float]],
    min_duration: float,
    max_duration: float,
) -> list[tuple[float, float]]:
    if not scenes:
        return []

    merged = [scenes[0]]
    for start, end in scenes[1:]:
        prev_start, prev_end = merged[-1]
        prev_duration = prev_end - prev_start
        current_duration = end - start

        # Merge with previous if current is too short
        if current_duration < min_duration:
            merged[-1] = (prev_start, end)
        # Also merge if combined would still be under max
        elif prev_duration < min_duration and (end - prev_start) <= max_duration:
            merged[-1] = (prev_start, end)
        else:
            merged.append((start, end))

    return merged


def classify_scene_type(
    start: float,
    end: float,
    total_duration: float,
    transcript_segments: list[dict],
) -> str:
    # Opening sequence: first ~15 seconds
    if start < 15.0:
        return "opening"

    # Closing sequence: last ~15 seconds
    if end > total_duration - 15.0:
        return "closing"

    # Check for narrator bridges via transcript patterns
    scene_text = " ".join(
        seg["text"]
        for seg in transcript_segments
        if seg["start"] >= start and seg["end"] <= end
    ).lower()

    narrator_patterns = [
        "this is peppa pig",
        "peppa and her friends",
        "peppa and george",
        "one day,",
        "it is a",
    ]
    if any(pattern in scene_text for pattern in narrator_patterns):
        if end - start < 10.0:
            return "narrator_bridge"

    return "narrative"


def get_transcript_for_scene(
    start: float,
    end: float,
    transcript_segments: list[dict],
) -> list[dict]:
    return [
        seg
        for seg in transcript_segments
        if seg["start"] >= start - 0.5 and seg["end"] <= end + 0.5
    ]


def chunk_episode(
    video_path: Path,
    episode_id: str,
    transcript: dict,
) -> list[dict]:
    output_path = settings.scenes_dir / f"{episode_id}.json"
    if output_path.exists():
        with open(output_path) as f:
            return json.load(f)

    # Detect raw scene boundaries
    raw_scenes = detect_scenes(video_path)
    if not raw_scenes:
        # Fallback: treat entire video as one scene
        import subprocess

        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)],
            capture_output=True, text=True,
        )
        duration = float(result.stdout.strip())
        raw_scenes = [(0.0, duration)]

    total_duration = raw_scenes[-1][1] if raw_scenes else 0.0

    # Store all raw cut points for future sub-segmentation
    all_cut_points = sorted(set(
        [t for start, end in raw_scenes for t in (start, end)]
    ))

    # Merge short scenes
    merged = merge_short_scenes(
        raw_scenes,
        min_duration=settings.min_chunk_duration,
        max_duration=settings.max_chunk_duration,
    )

    transcript_segments = transcript.get("segments", [])
    scenes = []

    for i, (start, end) in enumerate(merged):
        # Deterministic scene ID from episode + start timestamp
        scene_id = f"{episode_id}_{int(start * 10):05d}"
        duration = end - start

        scene_transcript = get_transcript_for_scene(start, end, transcript_segments)
        scene_type = classify_scene_type(start, end, total_duration, transcript_segments)

        # Visual cuts within this scene
        visual_cuts = [t for t in all_cut_points if start <= t <= end]

        scenes.append({
            "scene_id": scene_id,
            "episode_id": episode_id,
            "scene_index": i,
            "start_time": round(start, 3),
            "end_time": round(end, 3),
            "duration": round(duration, 3),
            "scene_type": scene_type,
            "visual_cuts": visual_cuts,
            "transcript_segments": scene_transcript,
            "transcript_text": " ".join(seg["text"] for seg in scene_transcript),
        })

    settings.scenes_dir.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(scenes, f, indent=2)

    return scenes
