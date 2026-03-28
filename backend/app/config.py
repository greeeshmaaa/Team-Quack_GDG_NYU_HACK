from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "NYC Lens Backend"
    debug: bool = False

    # Google Cloud / Vertex AI
    google_cloud_project: str = "your-project-id"
    google_cloud_location: str = "us-central1"
    vertex_model_name: str = "gemini-2.0-flash"
    vertex_image_model_name: str = "imagen-4.0-generate-001"

    # App behavior
    landmark_confidence_threshold: float = 0.7

    # Data files
    landmarks_file: Path = DATA_DIR / "landmarks.json"
    community_profiles_file: Path = DATA_DIR / "community_profiles.json"
    processed_landmark_context_file: Path = DATA_DIR / "processed" / "landmark_context.json"
    processed_unified_places_file: Path = DATA_DIR / "processed" / "unified_places.json"

    @field_validator("debug", mode="before")
    @classmethod
    def normalize_debug(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False
        return value

    @property
    def has_real_gcp_project(self) -> bool:
        project = self.google_cloud_project.strip()
        return bool(project and project != "your-project-id")


settings = Settings()
