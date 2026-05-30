"""Role helpers for platform RBAC."""

ROLES = ("ADMIN", "ANALYST", "VIEWER")


def normalize_role(role: str) -> str:
    r = (role or "ANALYST").upper()
    if r == "USER":
        return "ANALYST"
    return r if r in ROLES else "ANALYST"


def is_admin(role: str) -> bool:
    return normalize_role(role) == "ADMIN"


def can_manage_products(role: str) -> bool:
    return normalize_role(role) == "ADMIN"


def can_view_analytics(role: str) -> bool:
    return normalize_role(role) in ("ADMIN", "ANALYST")


def role_label(role: str) -> str:
    labels = {"ADMIN": "Admin", "ANALYST": "Analyst", "VIEWER": "Viewer"}
    return labels.get(normalize_role(role), role)
