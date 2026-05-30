"""Product catalog and module launch routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from prisma import Json

from app.config import get_settings
from app.db import prisma
from app.deps import get_current_user, require_product_manager
from app.schemas.platform import EnableProductRequest, LaunchProductResponse, ProductOut
from app.services.activity import log_activity
from app.services.billing import get_billing_summary, tier_meets_requirement
from app.services.product_registry import get_module_by_slug
from app.services.tokens import create_sso_launch_token

router = APIRouter(prefix="/products", tags=["products"])


def _json_config(config: dict[str, Any] | None = None) -> Json:
    return Json(config or {})


async def _serialize_product(product, workspace_id: str | None = None) -> ProductOut:
    enabled = False
    ws_status = None
    if workspace_id:
        wp = await prisma.workspaceproduct.find_first(
            where={"workspaceId": workspace_id, "productId": str(product.id)},
        )
        if wp:
            enabled = wp.status == "ACTIVE"
            ws_status = wp.status
    return ProductOut(
        id=str(product.id),
        slug=product.slug,
        name=product.name,
        tagline=product.tagline,
        description=product.description,
        long_description=product.longDescription,
        icon=product.icon,
        category=product.category,
        status=product.status,
        launch_url=product.launchUrl,
        documentation_url=product.documentationUrl,
        is_core=product.isCore,
        min_plan_tier=product.minPlanTier,
        addon_price_cents=product.addonPriceCents,
        enabled=enabled,
        workspace_status=ws_status,
    )


@router.get("", response_model=list[ProductOut])
async def list_products(user=Depends(get_current_user)):
    products = await prisma.product.find_many(order={"sortOrder": "asc"})
    return [await _serialize_product(p, str(user.workspaceId)) for p in products]


@router.get("/enabled", response_model=list[ProductOut])
async def list_enabled_products(user=Depends(get_current_user)):
    rows = await prisma.workspaceproduct.find_many(
        where={"workspaceId": str(user.workspaceId), "status": "ACTIVE"},
        include={"product": True},
    )
    result = []
    for row in rows:
        p = await _serialize_product(row.product, str(user.workspaceId))
        p.enabled = True
        result.append(p)
    return result


@router.get("/{slug}", response_model=ProductOut)
async def get_product(slug: str, user=Depends(get_current_user)):
    product = await prisma.product.find_unique(where={"slug": slug})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return await _serialize_product(product, str(user.workspaceId))


@router.post("/{slug}/enable", response_model=ProductOut)
async def enable_product(
    slug: str,
    body: EnableProductRequest,
    user=Depends(require_product_manager),
):
    product = await prisma.product.find_unique(where={"slug": slug})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.status not in ("ACTIVE", "BETA"):
        raise HTTPException(status_code=400, detail="Product is not available yet")

    billing = await get_billing_summary(str(user.workspaceId))
    if not tier_meets_requirement(billing["plan_tier"], product.minPlanTier):
        raise HTTPException(
            status_code=403,
            detail=f"Requires {product.minPlanTier} plan or higher",
        )

    plan = await prisma.platformplan.find_unique(where={"slug": billing["plan_tier"]})
    max_products = plan.maxProducts if plan else 1
    active_count = await prisma.workspaceproduct.count(
        where={"workspaceId": str(user.workspaceId), "status": "ACTIVE"},
    )
    existing = await prisma.workspaceproduct.find_first(
        where={"workspaceId": str(user.workspaceId), "productId": str(product.id)},
    )
    if existing:
        if existing.status != "ACTIVE":
            await prisma.workspaceproduct.update(
                where={"id": str(existing.id)},
                data={"status": "ACTIVE", "config": _json_config(body.config)},
            )
        else:
            await prisma.workspaceproduct.update(
                where={"id": str(existing.id)},
                data={"config": _json_config(body.config)},
            )
    else:
        if active_count >= max_products:
            raise HTTPException(
                status_code=403,
                detail=f"Plan limit reached ({max_products} products). Upgrade to enable more.",
            )
        await prisma.workspaceproduct.create(
            data={
                "workspaceId": str(user.workspaceId),
                "productId": str(product.id),
                "enabledById": str(user.id),
                "status": "ACTIVE",
                "config": _json_config(body.config),
            },
        )

    await log_activity(
        workspace_id=str(user.workspaceId),
        user_id=str(user.id),
        action="product.enabled",
        resource_type="product",
        resource_id=str(product.id),
        metadata={"slug": slug},
    )
    return await _serialize_product(product, str(user.workspaceId))


@router.post("/{slug}/disable")
async def disable_product(slug: str, user=Depends(require_product_manager)):
    product = await prisma.product.find_unique(where={"slug": slug})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = await prisma.workspaceproduct.find_first(
        where={"workspaceId": str(user.workspaceId), "productId": str(product.id)},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Product not enabled")

    await prisma.workspaceproduct.update(
        where={"id": str(existing.id)},
        data={"status": "DISABLED"},
    )
    await log_activity(
        workspace_id=str(user.workspaceId),
        user_id=str(user.id),
        action="product.disabled",
        resource_type="product",
        resource_id=str(product.id),
        metadata={"slug": slug},
    )
    return {"ok": True}


@router.post("/{slug}/launch", response_model=LaunchProductResponse)
async def launch_product(slug: str, user=Depends(get_current_user)):
    product = await prisma.product.find_unique(where={"slug": slug})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    wp = await prisma.workspaceproduct.find_first(
        where={
            "workspaceId": str(user.workspaceId),
            "productId": str(product.id),
            "status": "ACTIVE",
        },
    )
    if not wp and not product.isCore:
        raise HTTPException(status_code=403, detail="Product not enabled for this workspace")

    workspace = await prisma.workspace.find_unique(where={"id": str(user.workspaceId)})
    sso_token = create_sso_launch_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role,
        workspace_id=str(user.workspaceId),
        workspace_slug=workspace.slug if workspace else "",
        product_slug=slug,
    )
    settings = get_settings()
    launch_url = product.launchUrl or ""
    separator = "&" if "?" in launch_url else "?"
    full_url = f"{launch_url}{separator}zaavero_token={sso_token}" if launch_url else ""

    await log_activity(
        workspace_id=str(user.workspaceId),
        user_id=str(user.id),
        action="product.launched",
        resource_type="product",
        resource_id=str(product.id),
        metadata={"slug": slug},
    )
    return LaunchProductResponse(
        product_slug=slug,
        launch_url=full_url,
        sso_token=sso_token,
        expires_in_seconds=settings.sso_token_expire_minutes * 60,
    )
