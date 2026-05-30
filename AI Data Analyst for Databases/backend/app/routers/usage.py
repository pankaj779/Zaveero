from fastapi import APIRouter, Depends, HTTPException

from app.db import prisma
from app.deps import get_current_user
from app.services.roles import is_admin
from app.schemas.usage import UsageOut

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/me", response_model=UsageOut)
async def get_my_usage(user=Depends(get_current_user)):
    row = await prisma.userusage.find_unique(where={"userId": str(user.id)})
    if not row:
        return UsageOut(
            id="",
            user_id=user.id,
            workspace_id=user.workspaceId,
            total_ai_generations=0,
            total_executions=0,
            updated_at="",
        )
    return UsageOut(
        id=row.id,
        user_id=row.userId,
        workspace_id=row.workspaceId,
        total_ai_generations=row.totalAiGenerations,
        total_executions=row.totalExecutions,
        updated_at=row.updatedAt.isoformat(),
    )


@router.get("/workspace", response_model=list[UsageOut])
async def workspace_usage(user=Depends(get_current_user)):
    if not is_admin(user.role):
        raise HTTPException(status_code=403, detail="Workspace admin only")
    rows = await prisma.userusage.find_many(where={"workspaceId": str(user.workspaceId)})
    return [
        UsageOut(
            id=r.id,
            user_id=r.userId,
            workspace_id=r.workspaceId,
            total_ai_generations=r.totalAiGenerations,
            total_executions=r.totalExecutions,
            updated_at=r.updatedAt.isoformat(),
        )
        for r in rows
    ]
