"""Per-user usage counters for AI generations and SQL executions."""

from app.db import prisma


async def record_ai_generation(user_id: str, workspace_id: str) -> None:
    existing = await prisma.userusage.find_unique(where={"userId": user_id})
    if existing:
        await prisma.userusage.update(
            where={"userId": user_id},
            data={"totalAiGenerations": {"increment": 1}},
        )
    else:
        await prisma.userusage.create(
            data={
                "userId": user_id,
                "workspaceId": workspace_id,
                "totalAiGenerations": 1,
                "totalExecutions": 0,
            }
        )


async def record_execution(user_id: str, workspace_id: str) -> None:
    existing = await prisma.userusage.find_unique(where={"userId": user_id})
    if existing:
        await prisma.userusage.update(
            where={"userId": user_id},
            data={"totalExecutions": {"increment": 1}},
        )
    else:
        await prisma.userusage.create(
            data={
                "userId": user_id,
                "workspaceId": workspace_id,
                "totalAiGenerations": 0,
                "totalExecutions": 1,
            }
        )
