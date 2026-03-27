from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.clips import router as clips_router
from app.api.search import router as search_router
from app.core.config import settings
from app.core.search_engine import search_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load search engine
    search_engine.load()
    yield


app = FastAPI(
    title="PepTalk API",
    description="Gestalt language translation via Peppa Pig clips",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)
app.include_router(clips_router)


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "scenes_loaded": len(search_engine.scenes),
    }
