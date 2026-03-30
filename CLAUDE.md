# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

PepTalk is a personal assistive PWA that helps a parent (Sam) communicate with her autistic son (Julian, 8) who uses Gestalt Language Processing. Sam types what she wants to say → the app finds the most relevant Peppa Pig clip to play for Julian.

## Production Deployment

PepTalk is deployed at **https://peppatalk.com** using three Cloudflare services:

| Service | URL | Hosted On |
|---------|-----|-----------|
| Frontend | `peppatalk.com` | Cloudflare Pages (static Next.js export) |
| API | `api.peppatalk.com` | Mac Studio via Cloudflare Tunnel → `localhost:8111` |
| Media | `media.peppatalk.com` | Cloudflare R2 (clips + thumbnails) |

### Services That Must Be Running

Two services run as **macOS Launch Agents** (auto-start on login):

1. **Cloudflare Tunnel** (`com.cloudflare.cloudflared`) — routes `api.peppatalk.com` to `localhost:8111`
2. **PepTalk Backend** (`com.peptalk.backend`) — FastAPI + search engine on port 8111

```bash
# Check service status
launchctl list | grep -E "cloudflare|peptalk"

# Restart backend
launchctl kickstart -k gui/$(id -u)/com.peptalk.backend

# Restart tunnel
launchctl kickstart -k gui/$(id -u)/com.cloudflare.cloudflared

# View backend logs
tail -f ~/Library/Logs/peptalk-backend.log
tail -f ~/Library/Logs/peptalk-backend.err.log

# View tunnel logs
tail -f ~/Library/Logs/com.cloudflare.cloudflared.err.log
```

If the Mac Studio is off or these services are not running, the API will be unreachable and the app will show loading skeletons but no data.

### Deploy Frontend Changes

```bash
npm run deploy
```

This builds the frontend with production env vars and deploys to Cloudflare Pages.

### Sync New Clips to R2

After running the ingestion pipeline on new episodes:

```bash
rclone sync backend/data/clips/ r2:peptalk-media/clips/ --transfers 16 --progress
rclone sync backend/data/thumbnails/ r2:peptalk-media/thumbnails/ --transfers 16 --progress
```

### Environment Variables

**Backend** (`backend/.env`):
- `PEPTALK_MEDIA_BASE_URL=https://media.peppatalk.com` — enables R2 URLs in API responses
- `PEPTALK_ANTHROPIC_API_KEY` — only needed for ingestion, not runtime

**Frontend** (set at build time via `npm run deploy`):
- `NEXT_PUBLIC_API_URL=https://api.peppatalk.com`
- `NEXT_PUBLIC_MEDIA_URL=https://media.peppatalk.com`

## Commands

```bash
# Run both servers (backend + frontend) for local dev
npm run dev

# Backend only (FastAPI on :8111)
cd backend && uv run uvicorn app.main:app --reload --port 8111

# Frontend only (Next.js on :3000)
cd frontend && npm run dev

# Deploy frontend to production
npm run deploy

# Run ingestion pipeline on all episodes
cd backend && uv run python scripts/ingest.py

# Run on a single episode
cd backend && uv run python scripts/ingest.py --episode data/episodes/file.mkv

# Run on a directory
cd backend && uv run python scripts/ingest.py --dir /path/to/episodes/

# Build frontend for production
cd frontend && npx next build

# Expose app via ngrok for device testing (legacy, use peppatalk.com instead)
npm run tunnel
```

## Architecture

**Monorepo:** `backend/` (Python 3.12 FastAPI) + `frontend/` (Next.js 16, React 19, TypeScript, shadcn/ui, Tailwind v4).

### Ingestion Pipeline (`backend/app/ingestion/`)

Episodes flow through 5 sequential steps: **transcribe** (subtitle-first, falls back to faster-whisper large-v3) → **chunk** (PySceneDetect AdaptiveDetector, merge short scenes) → **summarize** (Claude multimodal API generates parent_trigger_phrases, communicative_themes, activity_tags, etc.) → **embed** (dual-vector: retrieval + content embeddings via sentence-transformers) → **extract** (ffmpeg clips + thumbnails).

Pipeline state tracked in `backend/data/pipeline_state.json` — re-running skips fully completed episodes (loads cached scenes/summaries from disk) and resumes partially completed episodes at the next incomplete step. The final `scenes.json` and `embeddings.npz` always merge all processed episodes, including previously completed ones not in the current run. Each summarization is saved per-scene for idempotency.

### Dual-Vector Search (`backend/app/core/search_engine.py`)

Two embeddings per scene, combined at query time:
- **Retrieval** (weight 0.7): parent_trigger_phrases + child_situations + communicative_themes + activity_tags
- **Content** (weight 0.3): narrative_summary + visual_description + emotional_tone

All in-memory NumPy — no vector DB needed at this scale (~4700 clips).

### Frontend Two-Mode UI

- **Browse mode** (no query): horizontal category strips grouped by activity_tags via `GET /browse`
- **Search mode** (typing): 12-result grid via `GET /search?q=...&top_k=12`
- **VideoPreview**: muted inline preview for Sam to verify before showing Julian
- **JulianPlayer**: fullscreen, no UI chrome, triple-tap to exit

### API Endpoints

- `GET /search?q=...&top_k=N` — grouped response shape (`groups[0].results`) for future multi-clip composition
- `GET /browse?max_categories=N` — clips grouped by activity_tags
- `GET /clips/{scene_id}` — metadata
- `GET /clips/{scene_id}/video` — MP4 stream with HTTP range support
- `GET /clips/{scene_id}/thumbnail` — JPEG

### Media URL Resolution

In production, `PEPTALK_MEDIA_BASE_URL` is set and `media_urls()` in `search_engine.py` returns absolute R2 URLs (`https://media.peppatalk.com/clips/{id}.mp4`). In local dev, it returns relative paths (`/clips/{id}/video`) served by the backend directly. The frontend has a parallel mechanism via `NEXT_PUBLIC_MEDIA_URL` in `api.ts` for `getVideoUrl()`/`getThumbnailUrl()` helpers.

## Critical Constraints

- **Python >=3.12, <3.14** — ML libraries (faster-whisper, sentence-transformers) don't support 3.14
- **10-bit HEVC sources** require `-pix_fmt yuv420p` in ffmpeg commands; H.264 baseline won't encode without it
- **iOS Safari playback** requires: `playsinline` attribute, H.264 baseline profile, `-movflags faststart`, `currentTime` for seeking (not Media Fragment URIs)
- **Clip normalization** (720p, 25fps, -16 LUFS loudness, H.264 baseline) is required for future ffmpeg concat composition
- **Scene schema** includes `segments: []` and `visual_cuts` for future multi-clip composition — don't remove these empty fields
- **Dark mode** uses shadcn's `.dark` class on `<html>`, not `prefers-color-scheme`

## Future Vision

Sam types a complex sentence → app decomposes into sub-intents → retrieves clip per sub-intent → composes into a single playable sequence. The grouped search response shape and scene segments array exist to support this.
