import uuid
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field

WorkspaceRole = Literal["ADMIN", "ANALYST", "VIEWER"]
JoinRole = Literal["ANALYST", "VIEWER"]


class WorkspacePoliciesOut(BaseModel):
    allow_self_serve_join: bool
    default_join_role: str
    analysts_can_manage_connections: bool


class WorkspaceSettingsPatch(BaseModel):
    allow_self_serve_join: bool | None = None
    default_join_role: JoinRole | None = None
    analysts_can_manage_connections: bool | None = None


class MemberOut(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    created_at: Any


class InviteMemberRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: WorkspaceRole


class MemberRolePatch(BaseModel):
    role: WorkspaceRole
