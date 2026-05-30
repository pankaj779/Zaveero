"""Billing service — Stripe-ready subscription management."""

from __future__ import annotations

from typing import Any

from app.db import prisma

PLAN_TIER_ORDER = ("free", "starter", "pro", "enterprise")


def tier_rank(tier: str) -> int:
    try:
        return PLAN_TIER_ORDER.index(tier.lower())
    except ValueError:
        return 0


def tier_meets_requirement(current: str, required: str) -> bool:
    return tier_rank(current) >= tier_rank(required)


async def get_billing_summary(workspace_id: str) -> dict[str, Any]:
    account = await prisma.billingaccount.find_unique(where={"workspaceId": workspace_id})
    subscription = await prisma.subscription.find_first(
        where={"workspaceId": workspace_id, "status": {"in": ["ACTIVE", "TRIALING"]}},
        include={"plan": True, "addons": {"include": {"product": True}}},
        order={"createdAt": "desc"},
    )
    plans = await prisma.platformplan.find_many(
        where={"isPublic": True},
        order={"sortOrder": "asc"},
    )

    plan_tier = account.planTier if account else "free"
    return {
        "billing_account": account,
        "subscription": subscription,
        "plan_tier": plan_tier,
        "available_plans": plans,
        "stripe_configured": False,  # flip when STRIPE_SECRET_KEY is set
    }


async def ensure_billing_account(*, workspace_id: str, billing_email: str) -> None:
    existing = await prisma.billingaccount.find_unique(where={"workspaceId": workspace_id})
    if not existing:
        await prisma.billingaccount.create(
            data={
                "workspaceId": workspace_id,
                "billingEmail": billing_email,
                "planTier": "free",
                "status": "ACTIVE",
            }
        )
