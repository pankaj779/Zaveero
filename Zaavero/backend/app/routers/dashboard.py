"""Platform dashboard overview."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.db import prisma
from app.deps import get_current_user
from app.schemas.platform import DashboardOverview, ProductOut, WorkspaceOut
from app.services.billing import get_billing_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverview)
async def dashboard_overview(user=Depends(get_current_user)):
    workspace = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
    billing = await get_billing_summary(str(user.workspaceId))

    enabled_rows = await prisma.workspaceproduct.find_many(
        where={"workspaceId": str(user.workspaceId), "status": "ACTIVE"},
        include={"product": True},
    )
    total_users = await prisma.user.count(where={"workspaceId": str(user.workspaceId)})

    since_7d = datetime.now(timezone.utc) - timedelta(days=7)
    active_logs = await prisma.activitylog.find_many(
        where={"workspaceId": str(user.workspaceId), "createdAt": {"gte": since_7d}},
        distinct=["userId"],
    )
    active_users_7d = len({str(l.userId) for l in active_logs if l.userId})

    recent = await prisma.activitylog.find_many(
        where={"workspaceId": str(user.workspaceId)},
        order={"createdAt": "desc"},
        take=10,
        include={"user": True},
    )
    recent_activity = [
        {
            "id": str(a.id),
            "action": a.action,
            "resource_type": a.resourceType,
            "resource_id": a.resourceId,
            "metadata": a.metadata,
            "created_at": a.createdAt.isoformat(),
            "user": {"name": a.user.name, "email": a.user.email} if a.user else None,
        }
        for a in recent
    ]

    now = datetime.now(timezone.utc)
    announcements = await prisma.announcement.find_many(
        where={
            "isActive": True,
            "publishedAt": {"lte": now},
            "OR": [{"expiresAt": None}, {"expiresAt": {"gt": now}}],
        },
        order={"publishedAt": "desc"},
        take=5,
    )

    enabled_products = [
        ProductOut(
            id=str(r.product.id),
            slug=r.product.slug,
            name=r.product.name,
            tagline=r.product.tagline,
            description=r.product.description,
            long_description=r.product.longDescription,
            icon=r.product.icon,
            category=r.product.category,
            status=r.product.status,
            launch_url=r.product.launchUrl,
            documentation_url=r.product.documentationUrl,
            is_core=r.product.isCore,
            min_plan_tier=r.product.minPlanTier,
            addon_price_cents=r.product.addonPriceCents,
            enabled=True,
            workspace_status=r.status,
        )
        for r in enabled_rows
    ]

    launch_count = await prisma.activitylog.count(
        where={
            "workspaceId": str(user.workspaceId),
            "action": "product.launched",
            "createdAt": {"gte": since_7d},
        },
    )

    return DashboardOverview(
        workspace=WorkspaceOut(id=str(workspace.id), name=workspace.name, slug=workspace.slug),
        plan_tier=billing["plan_tier"],
        total_products_enabled=len(enabled_rows),
        total_users=total_users,
        active_users_7d=active_users_7d,
        usage_metrics={
            "product_launches_7d": launch_count,
            "activity_events_7d": len(active_logs),
        },
        recent_activity=recent_activity,
        announcements=[
            {
                "id": str(a.id),
                "title": a.title,
                "body": a.body,
                "type": a.type,
                "published_at": a.publishedAt.isoformat(),
            }
            for a in announcements
        ],
        enabled_products=enabled_products,
    )
