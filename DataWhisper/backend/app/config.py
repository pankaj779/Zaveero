from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://datawhisper:datawhisper_secret@localhost:5432/datawhisper"
    jwt_secret: str = "change-me-in-production-use-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    encryption_key: str = ""
    # LLM: OpenAI and/or Google Gemini (Gemini API key from AI Studio). See llm_provider.resolve_provider.
    ai_provider: str = "auto"  # auto | openai | gemini
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1"
    gemini_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    )
    gemini_model: str = "gemini-2.0-flash"

    @field_validator(
        "openai_api_key",
        "openai_model",
        "gemini_api_key",
        "gemini_model",
        "ai_provider",
        mode="before",
    )
    @classmethod
    def strip_secrets(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    zaavero_api_url: str = "http://127.0.0.1:8000"
    cron_secret: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)


@lru_cache
def get_settings() -> Settings:
    return Settings()
