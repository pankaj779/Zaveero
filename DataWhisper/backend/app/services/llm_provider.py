"""Pick OpenAI vs Google Gemini for NL→SQL and insights."""
from __future__ import annotations

from typing import Literal

from app.config import Settings

Provider = Literal["openai", "gemini"]


def resolve_provider(settings: Settings) -> Provider:
    """
    AI_PROVIDER=auto (default): prefer OpenAI when OPENAI_API_KEY is set, else Gemini if GEMINI_API_KEY is set.
    Force with AI_PROVIDER=gemini | openai.
    """
    mode = (settings.ai_provider or "auto").strip().lower()
    if mode == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("AI_PROVIDER=openai but OPENAI_API_KEY is not set.")
        return "openai"
    if mode == "gemini":
        if not settings.gemini_api_key:
            raise RuntimeError("AI_PROVIDER=gemini but GEMINI_API_KEY (or GOOGLE_API_KEY) is not set.")
        return "gemini"
    if settings.openai_api_key:
        return "openai"
    if settings.gemini_api_key:
        return "gemini"
    raise RuntimeError(
        "No LLM configured. Set OPENAI_API_KEY from https://platform.openai.com/api-keys "
        "or GEMINI_API_KEY from https://aistudio.google.com/apikey"
    )


def no_llm_hint() -> str:
    return (
        "Set OPENAI_API_KEY or GEMINI_API_KEY (AI_PROVIDER=auto prefers OpenAI when both are set)."
    )
