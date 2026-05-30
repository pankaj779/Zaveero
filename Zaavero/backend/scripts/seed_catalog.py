"""Seed platform catalog from module registry."""

import asyncio

from prisma import Json

from app.config import get_settings
from app.db import prisma
from app.services.product_registry import PRODUCT_REGISTRY, resolve_launch_url


async def seed_catalog() -> None:
    settings = get_settings()
    await prisma.connect()

    # Platform plans
    plans = [
        {
            "slug": "free",
            "name": "Free",
            "description": "Explore the platform with limited products and users.",
            "priceMonthlyCents": 0,
            "priceYearlyCents": 0,
            "maxUsers": 3,
            "maxProducts": 1,
            "features": ["1 product", "3 users", "Community support"],
            "sortOrder": 0,
        },
        {
            "slug": "starter",
            "name": "Starter",
            "description": "For small teams getting started with AI analytics.",
            "priceMonthlyCents": 9900,
            "priceYearlyCents": 99000,
            "maxUsers": 10,
            "maxProducts": 2,
            "features": ["2 products", "10 users", "Email support", "SSO launch tokens"],
            "sortOrder": 1,
        },
        {
            "slug": "pro",
            "name": "Pro",
            "description": "For growing teams with advanced needs.",
            "priceMonthlyCents": 29900,
            "priceYearlyCents": 299000,
            "maxUsers": 50,
            "maxProducts": 5,
            "features": ["5 products", "50 users", "Priority support", "Feature flags"],
            "sortOrder": 2,
        },
        {
            "slug": "enterprise",
            "name": "Enterprise",
            "description": "Unlimited scale with custom SLAs and dedicated support.",
            "priceMonthlyCents": 0,
            "priceYearlyCents": 0,
            "maxUsers": 9999,
            "maxProducts": 99,
            "features": ["Unlimited products", "Custom SLA", "Dedicated support", "SCIM/SAML"],
            "sortOrder": 3,
        },
    ]
    for plan in plans:
        payload = {**plan, "features": Json(plan["features"])}
        await prisma.platformplan.upsert(
            where={"slug": plan["slug"]},
            data={"create": payload, "update": payload},
        )

    # Products from registry
    for defn in PRODUCT_REGISTRY:
        launch_url = resolve_launch_url(defn, settings)
        product_data = {
            "slug": defn.slug,
            "name": defn.name,
            "tagline": defn.tagline,
            "description": defn.description,
            "longDescription": defn.long_description,
            "icon": defn.icon,
            "category": defn.category,
            "status": defn.status,
            "launchUrl": launch_url,
            "documentationUrl": defn.documentation_url,
            "moduleConfig": Json(defn.module_config),
            "isCore": defn.is_core,
            "minPlanTier": defn.min_plan_tier,
            "addonPriceCents": defn.addon_price_cents,
            "sortOrder": defn.sort_order,
        }
        product = await prisma.product.upsert(
            where={"slug": defn.slug},
            data={"create": product_data, "update": product_data},
        )
        for flag_key in defn.feature_flags:
            await prisma.featureflag.upsert(
                where={"key": flag_key},
                data={
                    "create": {
                        "key": flag_key,
                        "description": f"Feature flag for {defn.name}",
                        "defaultOn": False,
                        "productSlug": defn.slug,
                    },
                    "update": {"productSlug": defn.slug},
                },
            )
            await prisma.productfeatureflag.upsert(
                where={"productId_flagKey": {"productId": str(product.id), "flagKey": flag_key}},
                data={
                    "create": {
                        "productId": str(product.id),
                        "flagKey": flag_key,
                        "defaultOn": False,
                    },
                    "update": {},
                },
            )

    # Platform-wide feature flags
    platform_flags = [
        ("platform.marketplace", "Enable product marketplace", True),
        ("platform.sso", "Enable SSO product launch tokens", True),
        ("platform.audit_log", "Enable activity audit log", True),
    ]
    for key, desc, default in platform_flags:
        await prisma.featureflag.upsert(
            where={"key": key},
            data={
                "create": {"key": key, "description": desc, "defaultOn": default},
                "update": {"description": desc},
            },
        )

    # Announcements
    count = await prisma.announcement.count()
    if count == 0:
        await prisma.announcement.create(
            data={
                "title": "Welcome to Zaavero",
                "body": "Your unified platform for AgentOps, DataWhisper, and future enterprise products.",
                "type": "feature",
            }
        )

    await prisma.disconnect()
    print("Seed complete: plans, products, feature flags, announcements.")


if __name__ == "__main__":
    asyncio.run(seed_catalog())
