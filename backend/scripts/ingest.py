#!/usr/bin/env python3
"""CLI entry point for the ingestion pipeline."""

import argparse
import sys
from pathlib import Path

# Add parent to path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ingestion.pipeline import run_pipeline


def main():
    parser = argparse.ArgumentParser(
        description="PepTalk ingestion pipeline — process Peppa Pig episodes into searchable clips",
    )
    parser.add_argument(
        "--episode",
        type=Path,
        help="Path to a single episode file (.avi, .mkv, .mp4)",
    )
    parser.add_argument(
        "--dir",
        type=Path,
        help="Path to directory containing episode files",
    )
    parser.add_argument(
        "--ext",
        type=str,
        default="mkv,avi,mp4",
        help="Comma-separated file extensions to look for (default: mkv,avi,mp4)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of episodes to process in parallel (default: 1). "
             "Use 1 if episodes need Whisper transcription (no SRT files) to avoid GPU contention.",
    )

    args = parser.parse_args()

    if args.episode:
        if not args.episode.exists():
            print(f"Error: File not found: {args.episode}")
            sys.exit(1)
        episode_paths = [args.episode]
    elif args.dir:
        if not args.dir.exists():
            print(f"Error: Directory not found: {args.dir}")
            sys.exit(1)
        extensions = args.ext.split(",")
        episode_paths = sorted(
            p
            for ext in extensions
            for p in args.dir.glob(f"*.{ext.strip()}")
        )
        if not episode_paths:
            print(f"Error: No episodes found in {args.dir} with extensions {extensions}")
            sys.exit(1)
    else:
        # Default: look in data/episodes/
        episodes_dir = Path(__file__).resolve().parent.parent / "data" / "episodes"
        if not episodes_dir.exists():
            print(f"Error: No episodes directory found at {episodes_dir}")
            print("Usage: python scripts/ingest.py --episode path/to/file.mkv")
            print("   or: python scripts/ingest.py --dir path/to/episodes/")
            sys.exit(1)
        extensions = args.ext.split(",")
        episode_paths = sorted(
            p
            for ext in extensions
            for p in episodes_dir.glob(f"*.{ext.strip()}")
        )
        if not episode_paths:
            print(f"No episodes found in {episodes_dir}")
            sys.exit(1)

    # Cap workers at episode count and CPU count
    import os
    workers = max(1, min(args.workers, len(episode_paths), os.cpu_count() or 1))

    print(f"PepTalk Ingestion Pipeline")
    print(f"Found {len(episode_paths)} episode(s) to process with {workers} worker(s)")
    print("=" * 50)

    run_pipeline(episode_paths, workers=workers)


if __name__ == "__main__":
    main()
