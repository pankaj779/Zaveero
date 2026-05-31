import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from passlib.context import CryptContext

from app.config import get_settings
from app.db import prisma
from app.schemas.auth import (
    ChangePasswordRequest,
    JoinWorkspaceRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
    WorkspaceOut,
    slugify,
)
from app.deps import get_current_user
from app.services.audit import log_audit

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(p: str) -> str:
    return pwd_context.hash(p)


def verify_password(p: str, hashed: str) -> bool:
    return pwd_context.verify(p, hashed)


def create_token(user_id: uuid.UUID, workspace_id: uuid.UUID, role: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "wid": str(workspace_id), "role": role, "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def _to_user_out(u) -> UserOut:
    return UserOut(id=uuid.UUID(u.id), email=u.email, role=u.role, workspace_id=uuid.UUID(u.workspaceId))


def _to_ws_out(w) -> WorkspaceOut:
    return WorkspaceOut(id=uuid.UUID(w.id), name=w.name, slug=w.slug)


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest):
    email = normalize_email(str(body.email))
    existing = await prisma.user.find_unique(where={"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    slug_base = slugify(body.workspace_name)
    slug = slug_base
    for _ in range(20):
        taken = await prisma.workspace.find_unique(where={"slug": slug})
        if not taken:
            break
        slug = f"{slug_base}-{uuid.uuid4().hex[:8]}"

    ws = await prisma.workspace.create(
        data={"name": body.workspace_name.strip(), "slug": slug},
    )
    user = await prisma.user.create(
        data={
            "email": email,
            "passwordHash": hash_password(body.password),
            "role": "ADMIN",
            "workspaceId": ws.id,
        }
    )
    token = create_token(uuid.UUID(user.id), uuid.UUID(ws.id), user.role)
    await log_audit(
        str(ws.id),
        str(user.id),
        "user.register",
        resource_type="user",
        resource_id=str(user.id),
        detail={"email": email},
    )
    return TokenResponse(
        access_token=token,
        user=_to_user_out(user),
        workspace=_to_ws_out(ws),
    )


@router.post("/join", response_model=TokenResponse)
async def join_workspace(body: JoinWorkspaceRequest):
    ws = await prisma.workspace.find_unique(where={"slug": body.workspace_slug.strip().lower()})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if not ws.allowSelfServeJoin:
        raise HTTPException(
            status_code=403,
            detail="This workspace does not allow open signup. Ask an admin to invite you with email and password.",
        )

    email = normalize_email(str(body.email))
    existing = await prisma.user.find_unique(where={"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    join_role = ws.defaultJoinRole if ws.defaultJoinRole in ("ANALYST", "VIEWER") else "ANALYST"
    user = await prisma.user.create(
        data={
            "email": email,
            "passwordHash": hash_password(body.password),
            "role": join_role,
            "workspaceId": ws.id,
        }
    )
    token = create_token(uuid.UUID(user.id), uuid.UUID(ws.id), user.role)
    await log_audit(
        str(ws.id),
        str(user.id),
        "user.join_workspace",
        resource_type="user",
        resource_id=str(user.id),
        detail={"email": email},
    )
    return TokenResponse(
        access_token=token,
        user=_to_user_out(user),
        workspace=_to_ws_out(ws),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    email = normalize_email(str(body.email))
    user = await prisma.user.find_unique(where={"email": email})
    if not user or not verify_password(body.password, user.passwordHash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    ws = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
    if not ws:
        raise HTTPException(status_code=500, detail="Workspace missing")
    token = create_token(uuid.UUID(user.id), uuid.UUID(ws.id), user.role)
    await log_audit(
        str(ws.id),
        str(user.id),
        "user.login",
        resource_type="user",
        resource_id=str(user.id),
        detail={"email": email},
    )
    return TokenResponse(
        access_token=token,
        user=_to_user_out(user),
        workspace=_to_ws_out(ws),
    )


@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, user=Depends(get_current_user)):
    if not verify_password(body.current_password, user.passwordHash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await prisma.user.update(
        where={"id": str(user.id)},
        data={"passwordHash": hash_password(body.new_password)},
    )
    ws = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
    if ws:
        await log_audit(
            str(ws.id),
            str(user.id),
            "user.password_change",
            resource_type="user",
            resource_id=str(user.id),
        )
    return {"ok": True}


@router.post("/zaavero-sso", response_model=TokenResponse)
async def zaavero_sso(body: dict):
    """Exchange a Zaavero SSO launch token for a DataWhisper session."""
    import secrets

    import httpx

    token = (body or {}).get("token")
    if not token:
        raise HTTPException(status_code=400, detail="token required")

    settings = get_settings()
    platform_url = settings.zaavero_api_url.rstrip("/")
    try:
        resp = httpx.post(f"{platform_url}/auth/sso/verify", json={"token": token}, timeout=60.0)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach Zaavero platform")

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired Zaavero token")

    data = resp.json()
    email = normalize_email(str(data.get("email") or ""))
    if not email:
        raise HTTPException(status_code=401, detail="Invalid SSO payload")

    user = await prisma.user.find_unique(where={"email": email})
    if not user:
        ws_slug = str(data.get("workspace_slug") or "zaavero-workspace")
        slug_base = slugify(ws_slug)
        slug = slug_base
        for _ in range(20):
            taken = await prisma.workspace.find_unique(where={"slug": slug})
            if not taken:
                break
            slug = f"{slug_base}-{uuid.uuid4().hex[:8]}"

        ws = await prisma.workspace.create(
            data={"name": ws_slug.replace("-", " ").title(), "slug": slug},
        )
        role = str(data.get("role") or "ADMIN").upper()
        if role not in ("ADMIN", "ANALYST", "VIEWER"):
            role = "ADMIN"
        user = await prisma.user.create(
            data={
                "email": email,
                "passwordHash": hash_password(secrets.token_urlsafe(24)),
                "role": role,
                "workspaceId": ws.id,
            }
        )
    else:
        ws = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
        if not ws:
            raise HTTPException(status_code=500, detail="Workspace missing")

    token_out = create_token(uuid.UUID(user.id), uuid.UUID(ws.id), user.role)
    await log_audit(
        str(ws.id),
        str(user.id),
        "user.zaavero_sso",
        resource_type="user",
        resource_id=str(user.id),
        detail={"email": email},
    )
    return TokenResponse(
        access_token=token_out,
        user=_to_user_out(user),
        workspace=_to_ws_out(ws),
    )
