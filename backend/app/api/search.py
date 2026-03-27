from fastapi import APIRouter, Query

from app.core.search_engine import search_engine

router = APIRouter()


@router.get("/search")
def search_clips(
    q: str = Query(..., description="Search query — what you want to communicate"),
    top_k: int = Query(5, ge=1, le=20, description="Number of results to return"),
) -> dict:
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
