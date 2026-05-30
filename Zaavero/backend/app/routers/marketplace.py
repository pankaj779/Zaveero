"""Marketplace — browse and enable products."""

from fastapi import APIRouter, Depends

from app.db import prisma
from app.deps import get_current_user
from app.schemas.platform import ProductOut
from app.services.billing import get_billing_summary, tier_meets_requirement

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


@router.get("")
async def marketplace_catalog(user=Depends(get_current_user)):
    products = await prisma.product.find_many(order={"sortOrder": "asc"})
    billing = await get_billing_summary(str(user.workspaceId))
    plan_tier = billing["plan_tier"]

    enabled_ids = {
        str(wp.productId)
        for wp in await prisma.workspaceproduct.find_many(
            where={"workspaceId": str(user.workspaceId), "status": "ACTIVE"},
        )
    }

    catalog = []
    for p in products:
        wp = await prisma.workspaceproduct.find_first(
            where={"workspaceId": str(user.workspaceId), "productId": str(p.id)},
        )
        catalog.append(
            {
                "id": str(p.id),
                "slug": p.slug,
                "name": p.name,
                "tagline": p.tagline,
                "description": p.description,
                "long_description": p.longDescription,
                "icon": p.icon,
                "category": p.category,
                "status": p.status,
                "is_core": p.isCore,
                "min_plan_tier": p.minPlanTier,
                "addon_price_cents": p.addonPriceCents,
                "documentation_url": p.documentationUrl,
                "enabled": str(p.id) in enabled_ids,
                "workspace_status": wp.status if wp else None,
                "plan_eligible": tier_meets_requirement(plan_tier, p.minPlanTier),
                "can_enable": p.status in ("ACTIVE", "BETA")
                and tier_meets_requirement(plan_tier, p.minPlanTier),
            }
        )

    return {
        "plan_tier": plan_tier,
        "products": catalog,
        "categories": sorted({p["category"] for p in catalog}),
    }
