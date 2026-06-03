"""Authentication routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.deps import get_current_user
from app.services import tenant_store
from app.services.passwords import hash_password, verify_password
from app.services.tokens import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=120)
    workspace_name: str = Field(min_length=1, max_length=120)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
def register(body: RegisterBody):
    if tenant_store.get_user_by_email(body.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    ws = tenant_store.create_workspace(body.workspace_name)
    user = tenant_store.create_user(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        workspace_id=ws["id"],
        role="ADMIN",
    )
    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        workspace_id=user["workspace_id"],
    )
    workspace = tenant_store.get_workspace(user["workspace_id"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_out(user),
        "workspace": workspace,
        "has_connection": False,
    }


@router.post("/login")
def login(body: LoginBody):
    user = tenant_store.get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        workspace_id=user["workspace_id"],
    )
    workspace = tenant_store.get_workspace(user["workspace_id"])
    conn = tenant_store.resolve_user_connection(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_out(user),
        "workspace": workspace,
        "has_connection": conn is not None,
        "active_connection_id": user.get("active_connection_id") or (str(conn.id) if conn else None),
    }


@router.get("/me")
def me(user=Depends(get_current_user)):
    workspace = tenant_store.get_workspace(user["workspace_id"])
    conn = tenant_store.resolve_user_connection(user)
    connections = tenant_store.list_connections(user["workspace_id"])
    return {
        "user": _user_out(user),
        "workspace": workspace,
        "has_connection": conn is not None,
        "active_connection_id": user.get("active_connection_id") or (str(conn.id) if conn else None),
        "connections_count": len(connections),
    }


def _user_out(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name"),
        "role": user["role"],
        "workspace_id": user["workspace_id"],
    }


@router.post("/zaavero-sso")
def zaavero_sso(body: dict):
    """Exchange a Zaavero SSO launch token for an AgentOps session."""
    import secrets

    import httpx

    from app.config import get_settings

    token = (body or {}).get("token")
    if not token:
        raise HTTPException(status_code=400, detail="token required")

    settings = get_settings()
    platform_url = settings.zaavero_api_url.rstrip("/")
    try:
        resp = httpx.post(f"{platform_url}/auth/sso/verify", json={"token": token}, timeout=15.0)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Zaavero API at {platform_url}: {exc!s}"[:300],
        ) from exc

    if resp.status_code != 200:
        detail = "Invalid or expired Zaavero token"
        try:
            body = resp.json()
            if isinstance(body.get("detail"), str):
                detail = body["detail"]
        except Exception:
            pass
        raise HTTPException(status_code=401, detail=detail)

    data = resp.json()
    email = str(data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Invalid SSO payload")

    user = tenant_store.get_user_by_email(email)
    if not user:
        ws_slug = str(data.get("workspace_slug") or "zaavero-workspace")
        ws = tenant_store.create_workspace(ws_slug.replace("-", " ").title())
        user = tenant_store.create_user(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(24)),
            name=email.split("@")[0],
            workspace_id=ws["id"],
            role=str(data.get("role") or "ADMIN").upper(),
        )

    workspace = tenant_store.get_workspace(user["workspace_id"])
    conn = tenant_store.resolve_user_connection(user)
    token_out = create_access_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        workspace_id=user["workspace_id"],
    )
    return {
        "access_token": token_out,
        "token_type": "bearer",
        "user": _user_out(user),
        "workspace": workspace,
        "has_connection": conn is not None,
    }


@router.get("/integration-status")
def integration_status():
    """Public SSO wiring check (no secrets). Use after deploy to verify Zaavero ↔ AgentOps."""
    import httpx

    from app.config import get_settings

    s = get_settings()
    base = s.zaavero_api_url.rstrip("/")
    reachable = False
    detail = ""
    try:
        resp = httpx.get(f"{base}/health", timeout=8.0)
        reachable = resp.status_code == 200
        detail = f"HTTP {resp.status_code}"
    except Exception as exc:
        detail = str(exc)[:200]
    return {
        "sso_enabled": True,
        "sso_frontend_path": "/sso/zaavero",
        "zaavero_api_url": base,
        "zaavero_api_reachable": reachable,
        "zaavero_check_detail": detail,
        "hint": (
            "Launch from Zaavero → Products → AgentOps. "
            "Zaavero needs AGENTOPS_LAUNCH_URL pointing at this app's /sso/zaavero URL."
        ),
    }
