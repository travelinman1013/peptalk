"""Transcription with subtitle-first fallback strategy.

Priority:
1. Bundled .srt/.vtt files alongside the video
2. faster-whisper with large-v3
"""

import json
import re
from pathlib import Path

import pysrt

from app.core.config import settings


def find_subtitle_file(video_path: Path) -> Path | None:
    stem = video_path.stem
    parent = video_path.parent
    for ext in [".srt", ".vtt", ".ass", ".ssa"]:
        sub_path = parent / f"{stem}{ext}"
        if sub_path.exists():
            return sub_path
    # Check for subtitle in a 'subs' subdirectory
    subs_dir = parent / "subs"
    if subs_dir.exists():
        for ext in [".srt", ".vtt"]:
            sub_path = subs_dir / f"{stem}{ext}"
            if sub_path.exists():
                return sub_path
    return None


def parse_srt(srt_path: Path) -> list[dict]:
    subs = pysrt.open(str(srt_path))
    segments = []
    for sub in subs:
        start = (
            sub.start.hours * 3600
            + sub.start.minutes * 60
            + sub.start.seconds
            + sub.start.milliseconds / 1000
        )
        end = (
            sub.end.hours * 3600
            + sub.end.minutes * 60
            + sub.end.seconds
            + sub.end.milliseconds / 1000
        )
        # Clean HTML tags and formatting from subtitle text
        text = re.sub(r"<[^>]+>", "", sub.text)
        text = re.sub(r"\{[^}]+\}", "", text)
        text = text.strip()
        if text:
            segments.append({"start": start, "end": end, "text": text})
    return segments


def transcribe_with_whisper(video_path: Path) -> list[dict]:
    from faster_whisper import WhisperModel

    model = WhisperModel(
        settings.whisper_model,
        device=settings.whisper_device,
        compute_type="auto",
    )

    segments_iter, info = model.transcribe(
        str(video_path),
        language="en",
        beam_size=5,
        best_of=5,
        condition_on_previous_text=False,
        initial_prompt=(
            "Peppa Pig, George, Mummy Pig, Daddy Pig, Narrator, "
            "Suzy Sheep, Danny Dog, Pedro Pony, Rebecca Rabbit, "
            "Emily Elephant, muddy puddles"
        ),
    )

    segments = []
    for segment in segments_iter:
        segments.append(
            {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
            }
        )

    return segments


def transcribe_episode(video_path: Path, episode_id: str) -> dict:
    output_path = settings.transcripts_dir / f"{episode_id}.json"
    if output_path.exists():
        with open(output_path) as f:
            return json.load(f)

    # Try subtitle files first
    sub_path = find_subtitle_file(video_path)
    if sub_path is not None:
        segments = parse_srt(sub_path)
        source = f"subtitle_file:{sub_path.name}"
    else:
        segments = transcribe_with_whisper(video_path)
        source = f"whisper:{settings.whisper_model}"

    result = {
        "episode_id": episode_id,
        "video_path": str(video_path),
        "transcript_source": source,
        "segments": segments,
    }

    settings.transcripts_dir.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)

    return result
