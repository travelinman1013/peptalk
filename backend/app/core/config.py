from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Paths
    data_dir: Path = Path(__file__).resolve().parent.parent.parent / "data"
    episodes_dir: Path = Path("")
    clips_dir: Path = Path("")
    thumbnails_dir: Path = Path("")
    transcripts_dir: Path = Path("")
    scenes_dir: Path = Path("")
    summaries_dir: Path = Path("")
    db_dir: Path = Path("")

    # API
    anthropic_api_key: str = ""
    cors_origins: list[str] = ["http://localhost:3000", "https://peppatalk.com", "https://www.peppatalk.com"]
    media_base_url: str = ""  # e.g. "https://media.peppatalk.com"

    # Ingestion
    whisper_model: str = "large-v3"
    whisper_device: str = "auto"
    scene_detect_threshold: float = 4.0
    scene_detect_min_scene_len: int = 90
    min_chunk_duration: float = 5.0
    max_chunk_duration: float = 45.0
    target_chunk_duration: float = 20.0

    # Summarization
    claude_model: str = "claude-haiku-4-5-20251001"
    summarize_temperature: float = 0.0
    frames_per_scene: int = 3

    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"
    retrieval_weight: float = 0.7
    content_weight: float = 0.3

    # Clip extraction
    clip_resolution: str = "1280:720"
    clip_fps: int = 25
    clip_video_bitrate: str = "1000k"
    clip_audio_bitrate: str = "128k"
    clip_loudness_target: float = -16.0

    model_config = {"env_prefix": "PEPTALK_", "env_file": ".env"}

    def model_post_init(self, __context: object) -> None:
        # Set derived paths if not explicitly provided
        if not self.episodes_dir.parts:
            self.episodes_dir = self.data_dir / "episodes"
        if not self.clips_dir.parts:
            self.clips_dir = self.data_dir / "clips"
        if not self.thumbnails_dir.parts:
            self.thumbnails_dir = self.data_dir / "thumbnails"
        if not self.transcripts_dir.parts:
            self.transcripts_dir = self.data_dir / "transcripts"
        if not self.scenes_dir.parts:
            self.scenes_dir = self.data_dir / "scenes"
        if not self.summaries_dir.parts:
            self.summaries_dir = self.data_dir / "summaries"
        if not self.db_dir.parts:
            self.db_dir = self.data_dir / "db"


settings = Settings()
