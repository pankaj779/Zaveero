"""JWT token creation and validation."""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt

from app.config import get_settings


def create_access_token(
    *,
    user_id: str,
    email: str,
    role: str,
    workspace_id: str,
    workspace_slug: str,
    enabled_products: list[str] | None = None,
    expires_minutes: int | None = None,
) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "role": role,
        "wid": workspace_id,
        "wslug": workspace_slug,
        "products": enabled_products or [],
        "exp": expire,
        "type": "platform",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_sso_launch_token(
    *,
    user_id: str,
    email: str,
    role: str,
    workspace_id: str,
    workspace_slug: str,
    product_slug: str,
) -> str:
    """Short-lived token for launching a product module with platform SSO."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.sso_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "role": role,
        "wid": workspace_id,
        "wslug": workspace_slug,
        "product": product_slug,
        "exp": expire,
        "type": "sso_launch",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
