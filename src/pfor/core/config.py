"""
PFOR Platform — Application Configuration
Loads settings from environment variables or .env file.
Falls back to safe defaults so the app always starts.
"""
import secrets
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Gemini AI ---
    gemini_api_key: str = ""  # Empty string triggers mock fallback

    # --- Database ---
    database_url: str = "sqlite:///./pfor_local.db"

    # --- JWT Auth ---
    secret_key: str = secrets.token_urlsafe(32)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # --- CORS ---
    allowed_origins: list[str] = ["*"]

    @property
    def gemini_enabled(self) -> bool:
        """Return True if a valid Gemini API key is configured."""
        return bool(self.gemini_api_key and self.gemini_api_key.strip())


@lru_cache()
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
