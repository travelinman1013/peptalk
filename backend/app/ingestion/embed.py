"""Dual-vector embedding generation.

Creates two embeddings per scene:
1. Retrieval embedding — from parent trigger phrases + child situations + themes + tags
2. Content embedding — from narrative summary + visual description + emotional tone
"""

import json
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import settings


def build_retrieval_text(summary: dict) -> str:
    parts = []
    if phrases := summary.get("parent_trigger_phrases"):
        parts.append(", ".join(phrases))
    if situations := summary.get("child_situations"):
        parts.append("; ".join(situations))
    if themes := summary.get("communicative_themes"):
        parts.append(", ".join(themes))
    if tags := summary.get("activity_tags"):
        parts.append(", ".join(tags))
    return ". ".join(parts)


def build_content_text(summary: dict) -> str:
    parts = []
    if narrative := summary.get("narrative_summary"):
        parts.append(narrative)
    if visual := summary.get("visual_description"):
        parts.append(visual)
    if tone := summary.get("emotional_tone"):
        parts.append(f"Tone: {tone}")
    return " ".join(parts)


def generate_embeddings(
    scenes: list[dict],
    summaries: list[dict | None],
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    model = SentenceTransformer(settings.embedding_model)

    retrieval_texts = []
    content_texts = []
    scene_ids = []

    for scene, summary in zip(scenes, summaries):
        if summary is None:
            continue
        scene_ids.append(scene["scene_id"])
        retrieval_texts.append(build_retrieval_text(summary))
        content_texts.append(build_content_text(summary))

    retrieval_embeddings = model.encode(retrieval_texts, convert_to_numpy=True, show_progress_bar=True)
    content_embeddings = model.encode(content_texts, convert_to_numpy=True, show_progress_bar=True)

    return retrieval_embeddings, content_embeddings, scene_ids


def save_embeddings(
    retrieval: np.ndarray,
    content: np.ndarray,
    scene_ids: list[str],
) -> None:
    settings.db_dir.mkdir(parents=True, exist_ok=True)
    np.savez(
        settings.db_dir / "embeddings.npz",
        retrieval=retrieval,
        content=content,
        scene_ids=np.array(scene_ids),
    )


def embed_all_episodes(all_scenes: list[dict], all_summaries: list[dict | None]) -> None:
    retrieval, content, scene_ids = generate_embeddings(all_scenes, all_summaries)
    save_embeddings(retrieval, content, scene_ids)
