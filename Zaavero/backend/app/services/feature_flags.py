"""Feature flag resolution: platform → product → workspace overrides."""

from __future__ import annotations

from app.db import prisma


async def resolve_feature_flags(
    *,
    workspace_id: str,
    product_slug: str | None = None,
) -> dict[str, bool]:
    """Resolve effective feature flags for a workspace (and optional product scope)."""
    flags = await prisma.featureflag.find_many(
        where={"productSlug": product_slug} if product_slug else {"productSlug": None},
    )
    overrides = await prisma.workspacefeatureflag.find_many(where={"workspaceId": workspace_id})
    override_map = {o.flagKey: o.enabled for o in overrides}

    result: dict[str, bool] = {}
    for flag in flags:
        result[flag.key] = override_map.get(flag.key, flag.defaultOn)
    return result


async def is_feature_enabled(
    *,
    workspace_id: str,
    flag_key: str,
    product_slug: str | None = None,
) -> bool:
    override = await prisma.workspacefeatureflag.find_first(
        where={"workspaceId": workspace_id, "flagKey": flag_key},
    )
    if override is not None:
        return override.enabled

    flag = await prisma.featureflag.find_first(
        where={"key": flag_key, "productSlug": product_slug},
    )
    if flag:
        return flag.defaultOn
    return False
