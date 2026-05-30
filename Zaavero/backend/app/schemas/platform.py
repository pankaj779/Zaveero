"""Pydantic request/response schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


# ─── Auth ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=120)
    workspace_name: str = Field(min_length=1, max_length=120)


class JoinRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=120)
    workspace_slug: str = Field(min_length=2, max_length=64)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str | None
    role: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class WorkspaceOut(BaseModel):
    id: str
    name: str
    slug: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    workspace: WorkspaceOut


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    avatar_url: str | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


# ─── Products ────────────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    id: str
    slug: str
    name: str
    tagline: str | None
    description: str
    long_description: str | None
    icon: str
    category: str
    status: str
    launch_url: str
    documentation_url: str | None
    is_core: bool
    min_plan_tier: str
    addon_price_cents: int
    enabled: bool = False
    workspace_status: str | None = None


class EnableProductRequest(BaseModel):
    config: dict[str, Any] = Field(default_factory=dict)


class LaunchProductResponse(BaseModel):
    product_slug: str
    launch_url: str
    sso_token: str
    expires_in_seconds: int


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardOverview(BaseModel):
    workspace: WorkspaceOut
    plan_tier: str
    total_products_enabled: int
    total_users: int
    active_users_7d: int
    usage_metrics: dict[str, Any]
    recent_activity: list[dict[str, Any]]
    announcements: list[dict[str, Any]]
    enabled_products: list[ProductOut]


# ─── Billing ─────────────────────────────────────────────────────────────────

class BillingSummaryOut(BaseModel):
    plan_tier: str
    billing_email: str | None
    status: str
    subscription_status: str | None
    current_period_end: datetime | None
    stripe_configured: bool
    available_plans: list[dict[str, Any]]
    addons: list[dict[str, Any]]


# ─── Workspace ───────────────────────────────────────────────────────────────

class WorkspaceMemberOut(BaseModel):
    id: str
    email: str
    name: str | None
    role: str
    created_at: datetime


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = "ANALYST"


class UpdateMemberRoleRequest(BaseModel):
    role: str


class WorkspaceSettingsUpdate(BaseModel):
    name: str | None = None
    allow_self_serve_join: bool | None = None
    default_join_role: str | None = None
