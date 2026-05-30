"""Billing routes — Stripe-ready architecture."""

from fastapi import APIRouter, Depends, HTTPException

from app.config import get_settings
from app.db import prisma
from app.deps import get_current_user, require_admin
from app.schemas.platform import BillingSummaryOut
from app.services.billing import get_billing_summary

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/summary")
async def billing_summary(user=Depends(get_current_user)):
    data = await get_billing_summary(str(user.workspaceId))
    account = data["billing_account"]
    sub = data["subscription"]
    settings = get_settings()

    addons = []
    if sub and sub.addons:
        for addon in sub.addons:
            addons.append(
                {
                    "product_slug": addon.product.slug,
                    "product_name": addon.product.name,
                    "quantity": addon.quantity,
                    "unit_price_cents": addon.unitPriceCents,
                }
            )

    return BillingSummaryOut(
        plan_tier=data["plan_tier"],
        billing_email=account.billingEmail if account else None,
        status=account.status if account else "ACTIVE",
        subscription_status=sub.status if sub else None,
        current_period_end=sub.currentPeriodEnd if sub else None,
        stripe_configured=bool(settings.stripe_secret_key),
        available_plans=[
            {
                "slug": p.slug,
                "name": p.name,
                "description": p.description,
                "price_monthly_cents": p.priceMonthlyCents,
                "price_yearly_cents": p.priceYearlyCents,
                "max_users": p.maxUsers,
                "max_products": p.maxProducts,
                "features": p.features,
            }
            for p in data["available_plans"]
        ],
        addons=addons,
    )


@router.post("/checkout-session")
async def create_checkout_session(user=Depends(require_admin)):
    """Placeholder for Stripe Checkout — wire when STRIPE_SECRET_KEY is configured."""
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=501,
            detail="Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.",
        )
    # Future: stripe.checkout.Session.create(...)
    raise HTTPException(status_code=501, detail="Stripe checkout not yet implemented")


@router.post("/portal-session")
async def create_portal_session(user=Depends(require_admin)):
    """Placeholder for Stripe Customer Portal."""
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=501, detail="Stripe is not configured")
    raise HTTPException(status_code=501, detail="Stripe portal not yet implemented")
