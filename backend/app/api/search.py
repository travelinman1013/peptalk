from fastapi import APIRouter, Query, Response

from app.core.search_engine import search_engine

router = APIRouter()


@router.get("/search")
def search_clips(
    response: Response,
    q: str = Query(..., description="Search query — what you want to communicate"),
    top_k: int = Query(5, ge=1, le=60, description="Number of results to return"),
) -> dict:
    response.headers["Cache-Control"] = "public, max-age=60"
    results = search_engine.search(q, top_k=top_k)

    # Grouped response shape for future multi-intent decomposition
    return {
        "query": q,
        "groups": [
            {
                "sub_query": q,
                "results": results,
            }
        ],
    }
