"""Zaavero platform settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/zaavero"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    sso_token_expire_minutes: int = 5  # short-lived product launch tokens

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Product launch URLs (override per environment)
    agentops_launch_url: str = "http://localhost:5173/sso/zaavero"
    datawhisper_launch_url: str = "http://localhost:3001/sso/zaavero"

    # Stripe (future integration)
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""

    platform_name: str = "Zaavero"
    platform_domain: str = "zaavero.com"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
