"""Episode processing worker for parallel execution.

Each worker processes a single episode through all 4 pipeline steps
(transcribe → chunk → summarize → extract) in its own subprocess,
using per-episode state files for safe concurrent execution.
"""

import time
import traceback
from dataclasses import dataclass
from pathlib import Path

from app.ingestion.chunk import chunk_episode
from app.ingestion.extract import extract_episode_clips
from app.ingestion.state import load_episode_state, save_episode_state
from app.ingestion.summarize import summarize_episode
from app.ingestion.transcribe import transcribe_episode


@dataclass
class EpisodeResult:
    """Result from processing a single episode. All fields are primitive types for pickling."""

    episode_id: str
    success: bool
    error: str | None
    scene_count: int
    duration_secs: float


def _log(episode_id: str, msg: str) -> None:
    print(f"  [{episode_id}] {msg}", flush=True)


def process_episode_worker(
    video_path_str: str,
    episode_id: str,
    episode_title: str,
) -> EpisodeResult:
    """Process one episode through steps 1-4. Designed to run in a subprocess.

    Uses per-episode state files for resume support. One episode failing
    does not affect other workers.
    """
    start = time.monotonic()
    video_path = Path(video_path_str)
    scene_count = 0

    try:
        ep_state = load_episode_state(episode_id)
        ep_state["video_path"] = video_path_str

        # Step 1: Transcribe
        if not ep_state["transcribed"]:
            _log(episode_id, "[1/4] Transcribing...")
            transcript = transcribe_episode(video_path, episode_id)
            ep_state["transcribed"] = True
            save_episode_state(episode_id, ep_state)
            source = transcript.get("transcript_source", "unknown")
            _log(episode_id, f"  Source: {source} ({len(transcript.get('segments', []))} segments)")
        else:
            _log(episode_id, "[1/4] Transcription cached")
            transcript = transcribe_episode(video_path, episode_id)

        # Step 2: Chunk
        if not ep_state["chunked"]:
            _log(episode_id, "[2/4] Chunking...")
            scenes = chunk_episode(video_path, episode_id, transcript)
            ep_state["chunked"] = True
            save_episode_state(episode_id, ep_state)
            _log(episode_id, f"  {len(scenes)} scenes detected")
        else:
            _log(episode_id, "[2/4] Chunks cached")
            scenes = chunk_episode(video_path, episode_id, transcript)

        # Step 3: Summarize
        if not ep_state["summarized"]:
            _log(episode_id, "[3/4] Summarizing...")
            summaries = summarize_episode(video_path, episode_id, episode_title, scenes)
            ep_state["summarized"] = True
            save_episode_state(episode_id, ep_state)
            valid = sum(1 for s in summaries if s is not None)
            _log(episode_id, f"  {valid} scenes summarized")
        else:
            _log(episode_id, "[3/4] Summaries cached")

        # Step 4: Extract clips
        if not ep_state["clipped"]:
            _log(episode_id, "[4/4] Extracting clips...")
            extract_episode_clips(video_path, scenes)
            ep_state["clipped"] = True
            save_episode_state(episode_id, ep_state)
        else:
            _log(episode_id, "[4/4] Clips cached")

        scene_count = len(scenes)
        elapsed = time.monotonic() - start
        return EpisodeResult(
            episode_id=episode_id,
            success=True,
            error=None,
            scene_count=scene_count,
            duration_secs=round(elapsed, 1),
        )

    except Exception as e:
        elapsed = time.monotonic() - start
        _log(episode_id, f"FAILED: {e}")
        traceback.print_exc()
        return EpisodeResult(
            episode_id=episode_id,
            success=False,
            error=str(e),
            scene_count=scene_count,
            duration_secs=round(elapsed, 1),
        )
