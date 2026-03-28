from pathlib import Path

import numpy as np
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse, StreamingResponse

from app.api.browse import invalidate_browse_cache, serialize_browse_clip
from app.core.config import settings
from app.core.search_engine import media_urls, search_engine

router = APIRouter(prefix="/clips")


# --- Hidden clip management (before /{scene_id} catch-all) ---


@router.get("/hidden")
def get_hidden_clips() -> dict:
    clips = search_engine.get_hidden_scenes()
    return {
        "clips": [serialize_browse_clip(s) for s in clips],
        "count": len(clips),
    }


@router.post("/hide/{scene_id}")
def hide_clip(scene_id: str) -> dict:
    scene = search_engine.get_scene(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Clip not found")
    search_engine.hide_scene(scene_id)
    invalidate_browse_cache()
    return {"hidden": True}


@router.post("/unhide/{scene_id}")
def unhide_clip(scene_id: str) -> dict:
    scene = search_engine.get_scene(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Clip not found")
    search_engine.unhide_scene(scene_id)
    invalidate_browse_cache()
    return {"hidden": False}


# --- Existing endpoints ---


@router.get("/{scene_id}")
def get_clip_metadata(scene_id: str, response: Response) -> dict:
    scene = search_engine.get_scene(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Clip not found")
    response.headers["Cache-Control"] = "public, max-age=86400"
    scene["clip_url"], scene["thumbnail_url"] = media_urls(scene_id)
    return scene


@router.get("/{scene_id}/video", response_model=None)
def stream_clip_video(scene_id: str, request: Request):
    scene = search_engine.get_scene(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Clip not found")

    clip_path = settings.clips_dir / f"{scene_id}.mp4"
    if not clip_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    file_size = clip_path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        # Parse range header for partial content
        range_spec = range_header.replace("bytes=", "")
        range_start, range_end = range_spec.split("-")
        range_start = int(range_start)
        range_end = int(range_end) if range_end else file_size - 1
        content_length = range_end - range_start + 1

        def iter_file():
            with open(clip_path, "rb") as f:
                f.seek(range_start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type="video/mp4",
            headers={
                "Content-Range": f"bytes {range_start}-{range_end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Cache-Control": "public, max-age=604800, immutable",
            },
        )

    return FileResponse(
        clip_path,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=604800, immutable",
        },
    )


@router.get("/{scene_id}/suggestions")
def get_clip_suggestions(scene_id: str, response: Response) -> dict:
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=3600"
    scene = search_engine.get_scene(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Clip not found")

    episode_id = scene["episode_id"]
    start_time = scene["start_time"]

    # Next clips in the same episode (sorted by start_time)
    same_episode = [
        s for s in search_engine.scenes
        if s["episode_id"] == episode_id
        and s["start_time"] > start_time
        and s["scene_id"] not in search_engine.hidden_ids
    ]
    same_episode.sort(key=lambda s: s["start_time"])
    next_in_episode = []
    for s in same_episode[:2]:
        clip = s.copy()
        clip.pop("embedding", None)
        clip["clip_url"], clip["thumbnail_url"] = media_urls(clip["scene_id"])
        next_in_episode.append(clip)

    # Related clips from different episodes (by embedding similarity)
    related = []
    idx = search_engine.scene_index.get(scene_id)
    if idx is not None and search_engine.retrieval_embeddings is not None:
        query_vec = search_engine.retrieval_embeddings[idx]
        scores = search_engine.retrieval_embeddings @ query_vec
        k = min(20, len(scores))
        top_k_indices = np.argpartition(scores, -k)[-k:]
        ranked = top_k_indices[np.argsort(scores[top_k_indices])[::-1]]
        for i in ranked:
            candidate = search_engine.scenes[i]
            if candidate["episode_id"] == episode_id:
                continue
            if candidate["scene_id"] in search_engine.hidden_ids:
                continue
            clip = candidate.copy()
            clip.pop("embedding", None)
            clip["clip_url"], clip["thumbnail_url"] = media_urls(clip["scene_id"])
            clip["score"] = float(scores[i])
            related.append(clip)
            if len(related) >= 2:
                break

    return {"next_in_episode": next_in_episode, "related": related}


@router.get("/{scene_id}/thumbnail", response_model=None)
def get_clip_thumbnail(scene_id: str):
    thumbnail_path = settings.thumbnails_dir / f"{scene_id}.jpg"
    if not thumbnail_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return FileResponse(
        thumbnail_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=604800, immutable"},
    )
