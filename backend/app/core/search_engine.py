import json
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import settings


def media_urls(scene_id: str) -> tuple[str, str]:
    """Return (clip_url, thumbnail_url) — R2 URLs in prod, relative in dev."""
    if settings.media_base_url:
        base = settings.media_base_url.rstrip("/")
        return f"{base}/clips/{scene_id}.mp4", f"{base}/thumbnails/{scene_id}.jpg"
    return f"/clips/{scene_id}/video", f"/clips/{scene_id}/thumbnail"


class SearchEngine:
    def __init__(self) -> None:
        self.scenes: list[dict] = []
        self.scene_index: dict[str, int] = {}
        self.retrieval_embeddings: np.ndarray | None = None
        self.content_embeddings: np.ndarray | None = None
        self.model: SentenceTransformer | None = None
        self.hidden_ids: set[str] = set()
        self._query_cache: dict[str, np.ndarray] = {}

    def load(self) -> None:
        scenes_path = settings.db_dir / "scenes.json"
        embeddings_path = settings.db_dir / "embeddings.npz"

        if not scenes_path.exists() or not embeddings_path.exists():
            return

        with open(scenes_path) as f:
            self.scenes = json.load(f)

        self.scene_index = {s["scene_id"]: i for i, s in enumerate(self.scenes)}

        data = np.load(embeddings_path)
        self.retrieval_embeddings = data["retrieval"]
        self.content_embeddings = data["content"]

        # Normalize for cosine similarity via dot product
        self.retrieval_embeddings = self._normalize(self.retrieval_embeddings)
        self.content_embeddings = self._normalize(self.content_embeddings)

        self.model = SentenceTransformer(settings.embedding_model)

        # Load hidden clip IDs
        hidden_path = settings.db_dir / "hidden.json"
        if hidden_path.exists():
            with open(hidden_path) as f:
                self.hidden_ids = set(json.load(f))

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        if self.model is None or self.retrieval_embeddings is None:
            return []

        cache_key = query.strip().lower()
        if cache_key in self._query_cache:
            query_embedding = self._query_cache[cache_key]
        else:
            query_embedding = self.model.encode(query, convert_to_numpy=True)
            query_embedding = query_embedding / np.linalg.norm(query_embedding)
            if len(self._query_cache) >= 1000:
                self._query_cache.clear()
            self._query_cache[cache_key] = query_embedding

        retrieval_scores = self.retrieval_embeddings @ query_embedding
        content_scores = self.content_embeddings @ query_embedding

        combined = (
            settings.retrieval_weight * retrieval_scores
            + settings.content_weight * content_scores
        )

        # Oversample to account for hidden clips being filtered out
        hidden_ratio = len(self.hidden_ids) / len(self.scenes) if self.scenes else 0
        safety = max(1.5, 1.0 / (1.0 - hidden_ratio)) if hidden_ratio < 1.0 else len(self.scenes)
        fetch_k = min(int(top_k * safety) + 10, len(self.scenes))
        top_indices = np.argsort(combined)[-fetch_k:][::-1]

        results = []
        for idx in top_indices:
            scene = self.scenes[idx]
            if scene["scene_id"] in self.hidden_ids:
                continue
            entry = scene.copy()
            entry["score"] = float(combined[idx])
            entry["clip_url"], entry["thumbnail_url"] = media_urls(scene["scene_id"])
            entry.pop("embedding", None)
            results.append(entry)
            if len(results) >= top_k:
                break

        return results

    def get_scene(self, scene_id: str) -> dict | None:
        idx = self.scene_index.get(scene_id)
        if idx is None:
            return None
        scene = self.scenes[idx].copy()
        scene.pop("embedding", None)
        return scene

    def hide_scene(self, scene_id: str) -> bool:
        if scene_id not in self.scene_index:
            return False
        added = scene_id not in self.hidden_ids
        self.hidden_ids.add(scene_id)
        self._save_hidden()
        return added

    def unhide_scene(self, scene_id: str) -> bool:
        if scene_id not in self.hidden_ids:
            return False
        self.hidden_ids.discard(scene_id)
        self._save_hidden()
        return True

    def get_hidden_scenes(self) -> list[dict]:
        results = []
        for scene_id in sorted(self.hidden_ids):
            scene = self.get_scene(scene_id)
            if scene:
                results.append(scene)
        return results

    def _save_hidden(self) -> None:
        hidden_path = settings.db_dir / "hidden.json"
        with open(hidden_path, "w") as f:
            json.dump(sorted(self.hidden_ids), f, indent=2)

    @staticmethod
    def _normalize(matrix: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)
        return matrix / norms


search_engine = SearchEngine()
