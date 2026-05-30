"""Authentication routes — single sign-on for all products."""

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import prisma
from app.deps import get_current_user
from app.schemas.platform import (
    AuthResponse,
    JoinRequest,
    LoginRequest,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    UserOut,
    WorkspaceOut,
)
from app.services.activity import log_activity
from app.services.billing import ensure_billing_account
from app.services.passwords import hash_password, verify_password
from app.services.product_registry import PRODUCT_REGISTRY
from app.services.roles import normalize_role
from app.services.tokens import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:48] or "workspace"


async def _enabled_product_slugs(workspace_id: str) -> list[str]:
    rows = await prisma.workspaceproduct.find_many(
        where={"workspaceId": workspace_id, "status": "ACTIVE"},
        include={"product": True},
    )
    return [r.product.slug for r in rows]


async def _build_auth_response(user, workspace) -> AuthResponse:
    products = await _enabled_product_slugs(str(workspace.id))
    token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role,
        workspace_id=str(workspace.id),
        workspace_slug=workspace.slug,
        enabled_products=products,
    )
    return AuthResponse(
        access_token=token,
        user=UserOut(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            avatar_url=user.avatarUrl,
        ),
        workspace=WorkspaceOut(id=str(workspace.id), name=workspace.name, slug=workspace.slug),
    )


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    existing = await prisma.user.find_unique(where={"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    base_slug = _slugify(body.workspace_name)
    slug = base_slug
    n = 1
    while await prisma.workspace.find_unique(where={"slug": slug}):
        slug = f"{base_slug}-{n}"
        n += 1

    workspace = await prisma.workspace.create(
        data={"name": body.workspace_name, "slug": slug},
    )
    user = await prisma.user.create(
        data={
            "email": body.email.lower(),
            "passwordHash": hash_password(body.password),
            "name": body.name,
            "role": "ADMIN",
            "workspaceId": str(workspace.id),
        },
    )
    await ensure_billing_account(workspace_id=str(workspace.id), billing_email=body.email.lower())

    # Starter trial for new workspaces (14-day evaluation)
    starter_plan = await prisma.platformplan.find_unique(where={"slug": "starter"})
    if starter_plan:
        await prisma.billingaccount.update(
            where={"workspaceId": str(workspace.id)},
            data={"planTier": "starter", "status": "TRIALING"},
        )
        await prisma.subscription.create(
            data={
                "workspaceId": str(workspace.id),
                "planId": str(starter_plan.id),
                "status": "TRIALING",
                "billingCycle": "monthly",
            },
        )

    # Auto-enable core products from registry
    for defn in PRODUCT_REGISTRY:
        if defn.is_core and defn.status == "ACTIVE":
            product = await prisma.product.find_unique(where={"slug": defn.slug})
            if product:
                await prisma.workspaceproduct.create(
                    data={
                        "workspaceId": str(workspace.id),
                        "productId": str(product.id),
                        "enabledById": str(user.id),
                        "status": "ACTIVE",
                    }
                )

    await log_activity(
        workspace_id=str(workspace.id),
        user_id=str(user.id),
        action="workspace.created",
        resource_type="workspace",
        resource_id=str(workspace.id),
    )
    return await _build_auth_response(user, workspace)


@router.post("/join", response_model=AuthResponse)
async def join_workspace(body: JoinRequest):
    if not _SLUG_RE.match(body.workspace_slug):
        raise HTTPException(status_code=400, detail="Invalid workspace slug")

    workspace = await prisma.workspace.find_unique(where={"slug": body.workspace_slug})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if not workspace.allowSelfServeJoin:
        raise HTTPException(status_code=403, detail="Self-serve join is disabled for this workspace")

    existing = await prisma.user.find_unique(where={"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = normalize_role(workspace.defaultJoinRole)
    user = await prisma.user.create(
        data={
            "email": body.email.lower(),
            "passwordHash": hash_password(body.password),
            "name": body.name,
            "role": role,
            "workspaceId": str(workspace.id),
        },
    )
    await log_activity(
        workspace_id=str(workspace.id),
        user_id=str(user.id),
        action="user.joined",
        resource_type="user",
        resource_id=str(user.id),
    )
    return await _build_auth_response(user, workspace)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    user = await prisma.user.find_unique(where={"email": body.email.lower()})
    if not user or not verify_password(body.password, user.passwordHash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    workspace = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
    if not workspace:
        raise HTTPException(status_code=500, detail="Workspace not found")
    return await _build_auth_response(user, workspace)


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    workspace = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
    products = await _enabled_product_slugs(str(user.workspaceId))
    return {
        "user": UserOut(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            avatar_url=user.avatarUrl,
        ),
        "workspace": WorkspaceOut(
            id=str(workspace.id),
            name=workspace.name,
            slug=workspace.slug,
        )
        if workspace
        else None,
        "enabled_products": products,
    }


@router.patch("/me", response_model=UserOut)
async def update_profile(body: ProfileUpdateRequest, user=Depends(get_current_user)):
    updated = await prisma.user.update(
        where={"id": str(user.id)},
        data={
            k: v
            for k, v in {
                "name": body.name,
                "avatarUrl": body.avatar_url,
            }.items()
            if v is not None
        },
    )
    return UserOut(
        id=str(updated.id),
        email=updated.email,
        name=updated.name,
        role=updated.role,
        avatar_url=updated.avatarUrl,
    )


@router.post("/change-password")
async def change_password(body: PasswordChangeRequest, user=Depends(get_current_user)):
    if not verify_password(body.current_password, user.passwordHash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await prisma.user.update(
        where={"id": str(user.id)},
        data={"passwordHash": hash_password(body.new_password)},
    )
    return {"ok": True}


@router.post("/sso/verify")
async def verify_sso_token(payload: dict):
    """Products call this to validate a platform SSO launch token."""
    from jose import jwt
    from app.config import get_settings

    token = payload.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="token required")
    settings = get_settings()
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if data.get("type") != "sso_launch":
        raise HTTPException(status_code=401, detail="Not an SSO launch token")
    return {
        "valid": True,
        "user_id": data.get("sub"),
        "email": data.get("email"),
        "role": data.get("role"),
        "workspace_id": data.get("wid"),
        "workspace_slug": data.get("wslug"),
        "product": data.get("product"),
    }
