"""Workspace role helpers. Legacy USER is treated as ANALYST."""

ROLE_ADMIN = "ADMIN"
ROLE_ANALYST = "ANALYST"
ROLE_VIEWER = "VIEWER"
ROLE_LEGACY_USER = "USER"


def effective_role(role: str) -> str:
    if role == ROLE_LEGACY_USER:
        return ROLE_ANALYST
    return role


def is_admin(role: str) -> bool:
    return role == ROLE_ADMIN


def is_viewer(role: str) -> bool:
    return effective_role(role) == ROLE_VIEWER


def can_run_sql(role: str) -> bool:
    return effective_role(role) in (ROLE_ADMIN, ROLE_ANALYST)


def can_manage_workspace_settings(role: str) -> bool:
    return role == ROLE_ADMIN
