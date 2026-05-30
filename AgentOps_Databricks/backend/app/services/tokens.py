"""JWT tokens for AgentOps platform auth."""

from datetime import datetime, timedelta, timezone

from jose import jwt

from app.config import get_settings


def create_access_token(*, user_id: str, email: str, role: str, workspace_id: str) -> str:
    s = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=s.access_token_expire_minutes)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "wid": workspace_id,
        "exp": expire,
        "type": "agentops",
    }
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    s = get_settings()
    try:
        data = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except Exception:
        return None
    if data.get("type") != "agentops":
        return None
    return data
