from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

from app.core.config import settings
from app.core.search_engine import search_engine

router = APIRouter(prefix="/clips")


@router.get("/{scene_id}")
def get_clip_metadata(scene_id: str) -> dict:
    scene = search_engine.get_scene(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Clip not found")
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
            },
        )

    return FileResponse(
        clip_path,
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"},
    )


@router.get("/{scene_id}/thumbnail", response_model=None)
def get_clip_thumbnail(scene_id: str):
    thumbnail_path = settings.thumbnails_dir / f"{scene_id}.jpg"
    if not thumbnail_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return FileResponse(thumbnail_path, media_type="image/jpeg")
