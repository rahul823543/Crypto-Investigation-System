"""
app/config.py
─────────────
Centralised settings loaded from the environment (or a .env file).
All other modules import `settings` from here — never os.getenv() directly.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server
    intelligence_port: int = 8001

    # Versioning — echoed in every API response so Fastify can validate presence
    engine_version: str = "0.1.0"

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]


# Singleton — imported everywhere
settings = Settings()
