from pathlib import Path

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"
if not ENV_FILE.is_file():
    ENV_FILE = BACKEND_DIR.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Learning Doubt Solver API"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'db' / 'app.db').as_posix()}"
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-3.8-flash"
    gemini_fallback_model: str | None = "gemini-flash-lite-latest"
    gemini_embedding_model: str = "gemini-embedding-001"
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: SecretStr | None = None
    qdrant_collection: str = "learning_content"

    @field_validator("gemini_api_key", "qdrant_api_key", mode="before")
    @classmethod
    def empty_secrets_are_unset(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


settings = Settings()