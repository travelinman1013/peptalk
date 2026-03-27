import json
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import settings


class SearchEngine:
    def __init__(self) -> None:
        self.scenes: list[dict] = []
        self.scene_index: dict[str, int] = {}
        self.retrieval_embeddings: np.ndarray | None = None
        self.content_embeddings: np.ndarray | None = None
        self.model: SentenceTransformer | None = None

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

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        if self.model is None or self.retrieval_embeddings is None:
            return []

        query_embedding = self.model.encode(query, convert_to_numpy=True)
        query_embedding = query_embedding / np.linalg.norm(query_embedding)

        retrieval_scores = self.retrieval_embeddings @ query_embedding
        content_scores = self.content_embeddings @ query_embedding

        combined = (
            settings.retrieval_weight * retrieval_scores
            + settings.content_weight * content_scores
        )

        top_indices = np.argsort(combined)[-top_k:][::-1]

        results = []
        for idx in top_indices:
            scene = self.scenes[idx].copy()
            scene["score"] = float(combined[idx])
            scene["clip_url"] = f"/clips/{scene['scene_id']}/video"
            scene["thumbnail_url"] = f"/clips/{scene['scene_id']}/thumbnail"
            # Remove embedding from response
            scene.pop("embedding", None)
            results.append(scene)

        return results

    def get_scene(self, scene_id: str) -> dict | None:
        idx = self.scene_index.get(scene_id)
        if idx is None:
            return None
        scene = self.scenes[idx].copy()
        scene.pop("embedding", None)
        return scene

    @staticmethod
    def _normalize(matrix: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)
        return matrix / norms


search_engine = SearchEngine()
