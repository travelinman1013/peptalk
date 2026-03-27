"""Per-episode state management for the ingestion pipeline.

Each episode's progress is tracked in its own file at data/state/{episode_id}.json,
enabling safe parallel processing with no write contention.
"""

import json
import os
import re
from pathlib import Path

from app.core.config import settings

STATE_DIR_NAME = "state"
LEGACY_STATE_FILE = "pipeline_state.json"
LEGACY_MIGRATED_FILE = "pipeline_state.json.migrated"

DEFAULT_EPISODE_STATE = {
    "transcribed": False,
    "chunked": False,
    "summarized": False,
    "clipped": False,
    "video_path": "",
}

COMPLETED_STEPS = ("transcribed", "chunked", "summarized", "clipped")


def _state_dir() -> Path:
    return settings.data_dir / STATE_DIR_NAME


def load_episode_state(episode_id: str) -> dict:
    """Load state for a single episode. Returns defaults if no state file exists."""
    path = _state_dir() / f"{episode_id}.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {**DEFAULT_EPISODE_STATE}


def save_episode_state(episode_id: str, state: dict) -> None:
    """Atomically save state for a single episode (write to .tmp, then os.replace)."""
    state_dir = _state_dir()
    state_dir.mkdir(parents=True, exist_ok=True)
    target = state_dir / f"{episode_id}.json"
    tmp = state_dir / f"{episode_id}.json.tmp"
    with open(tmp, "w") as f:
        json.dump(state, f, indent=2)
    os.replace(tmp, target)


def load_all_states() -> dict[str, dict]:
    """Load all per-episode state files into a combined dict."""
    state_dir = _state_dir()
    if not state_dir.exists():
        return {}
    states = {}
    for path in state_dir.glob("*.json"):
        episode_id = path.stem
        with open(path) as f:
            states[episode_id] = json.load(f)
    return states


def is_episode_complete(episode_id: str) -> bool:
    """Check if all pipeline steps are complete for an episode."""
    state = load_episode_state(episode_id)
    return all(state.get(step) for step in COMPLETED_STEPS)


def migrate_legacy_state() -> None:
    """One-time migration: split pipeline_state.json into per-episode state files.

    Writes all per-episode files first, then renames the legacy file to .migrated.
    Safe against partial failure — re-running will just overwrite the per-episode files.
    """
    legacy_path = settings.data_dir / LEGACY_STATE_FILE
    migrated_path = settings.data_dir / LEGACY_MIGRATED_FILE

    if not legacy_path.exists() or migrated_path.exists():
        return

    with open(legacy_path) as f:
        legacy_state = json.load(f)

    if not legacy_state:
        os.replace(legacy_path, migrated_path)
        return

    # Write all per-episode files
    for episode_id, ep_state in legacy_state.items():
        save_episode_state(episode_id, ep_state)

    # Verify all files were written
    state_dir = _state_dir()
    for episode_id in legacy_state:
        if not (state_dir / f"{episode_id}.json").exists():
            print(f"Warning: Migration verification failed for {episode_id}, keeping legacy file")
            return

    # Rename (not delete) the legacy file
    os.replace(legacy_path, migrated_path)
    print(f"Migrated {len(legacy_state)} episode states from {LEGACY_STATE_FILE} to per-episode files")


def get_episode_id(video_path: Path) -> str:
    """Derive episode ID from filename. Expects format like s01e01 or S01E01."""
    stem = video_path.stem.lower()
    match = re.search(r"s(\d+)e(\d+)", stem)
    if match:
        return f"s{int(match.group(1)):02d}e{int(match.group(2)):02d}"
    return re.sub(r"[^a-z0-9]", "_", stem).strip("_")


def get_episode_title(video_path: Path) -> str:
    """Extract episode title from filename."""
    stem = video_path.stem
    title = re.sub(r"[Ss]\d+[Ee]\d+[\s_\-\.]*", "", stem)
    title = title.replace("_", " ").replace(".", " ").strip()
    return title or stem
