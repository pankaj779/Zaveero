import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.db import prisma
from app.deps import get_current_user, require_workspace_admin
from app.services.roles import is_admin

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
async def list_history(
    user=Depends(get_current_user),
    connection_id: uuid.UUID | None = None,
    limit: int = 100,
):
    where: dict = {"workspaceId": str(user.workspaceId)}
    if connection_id:
        where["connectionId"] = str(connection_id)
    if not is_admin(user.role):
        where["userId"] = str(user.id)

    rows = await prisma.queryhistory.find_many(
        where=where,
        order={"createdAt": "desc"},
        take=min(limit, 500),
    )
    return [
        {
            "id": r.id,
            "workspace_id": r.workspaceId,
            "user_id": r.userId,
            "connection_id": r.connectionId,
            "metadata_version_id": r.metadataVersionId,
            "question": r.question,
            "sql_text": r.sqlText,
            "result_row_count": r.resultRowCount,
            "chart_type": r.chartType,
            "explanation": r.explanation,
            "confidence_score": r.confidenceScore,
            "created_at": r.createdAt.isoformat(),
        }
        for r in rows
    ]


@router.delete("/{history_id}")
async def delete_history_entry(history_id: uuid.UUID, user=Depends(require_workspace_admin)):
    row = await prisma.queryhistory.find_first(
        where={"id": str(history_id), "workspaceId": str(user.workspaceId)}
    )
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    await prisma.queryhistory.delete(where={"id": str(history_id)})
    return {"ok": True}
