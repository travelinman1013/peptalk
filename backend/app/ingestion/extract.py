"""Clip extraction with normalized encoding for iOS compatibility and future concatenation.

All clips are normalized to:
- 1280x720, 25fps, H.264 baseline, AAC 44.1kHz stereo
- Loudness normalized to -16 LUFS
"""

import subprocess
from pathlib import Path

from app.core.config import settings


def extract_clip(
    video_path: Path,
    scene_id: str,
    start_time: float,
    end_time: float,
) -> Path:
    output_path = settings.clips_dir / f"{scene_id}.mp4"
    if output_path.exists():
        return output_path

    settings.clips_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", str(video_path),
        "-t", str(end_time - start_time),
        # Video: H.264 baseline for iOS (yuv420p for 10-bit source compat)
        "-c:v", "libx264",
        "-profile:v", "baseline",
        "-level", "3.0",
        "-pix_fmt", "yuv420p",
        "-b:v", settings.clip_video_bitrate,
        "-vf", f"scale={settings.clip_resolution}",
        "-r", str(settings.clip_fps),
        # Audio: AAC with loudness normalization
        "-af", f"loudnorm=I={settings.clip_loudness_target}:TP=-1.5:LRA=11",
        "-c:a", "aac",
        "-b:a", settings.clip_audio_bitrate,
        "-ar", "44100",
        "-ac", "2",
        # MP4 fast start for progressive download
        "-movflags", "faststart",
        str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg clip extraction failed: {result.stderr}")

    return output_path


def extract_thumbnail(
    video_path: Path,
    scene_id: str,
    start_time: float,
    end_time: float,
) -> Path:
    output_path = settings.thumbnails_dir / f"{scene_id}.jpg"
    if output_path.exists():
        return output_path

    settings.thumbnails_dir.mkdir(parents=True, exist_ok=True)

    # Extract frame at midpoint
    midpoint = start_time + (end_time - start_time) / 2

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(midpoint),
        "-i", str(video_path),
        "-vframes", "1",
        "-q:v", "2",
        "-vf", f"scale={settings.clip_resolution}",
        str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg thumbnail extraction failed: {result.stderr}")

    return output_path


def extract_episode_clips(
    video_path: Path,
    scenes: list[dict],
) -> None:
    for scene in scenes:
        if scene.get("scene_type") == "opening":
            continue
        extract_clip(
            video_path,
            scene["scene_id"],
            scene["start_time"],
            scene["end_time"],
        )
        extract_thumbnail(
            video_path,
            scene["scene_id"],
            scene["start_time"],
            scene["end_time"],
        )
