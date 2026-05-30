import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import prisma
from app.deps import get_current_user, require_sql_runner
from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.schemas.saved_assets import (
    ReportScheduleCreate,
    ReportScheduleOut,
    SavedReportCreate,
    SavedReportOut,
    SavedReportPatch,
)
from app.services.audit import log_audit
from app.services.query_runner import run_execute_request
from app.services.roles import is_admin
from app.services.schedule_util import next_cron_fire

router = APIRouter(prefix="/reports", tags=["reports"])


def _can_read_report(user, row) -> bool:
    if str(row.workspaceId) != str(user.workspaceId):
        return False
    if is_admin(user.role):
        return True
    if str(row.userId) == str(user.id):
        return True
    return bool(row.sharedWithWorkspace)


def _can_write_report(user, row) -> bool:
    if str(row.workspaceId) != str(user.workspaceId):
        return False
    if is_admin(user.role):
        return True
    return str(row.userId) == str(user.id)


@router.get("", response_model=list[SavedReportOut])
async def list_reports(user=Depends(get_current_user)):
    if is_admin(user.role):
        rows = await prisma.savedreport.find_many(
            where={"workspaceId": str(user.workspaceId)},
            order={"updatedAt": "desc"},
        )
    else:
        rows = await prisma.savedreport.find_many(
            where={
                "workspaceId": str(user.workspaceId),
                "OR": [
                    {"userId": str(user.id)},
                    {"sharedWithWorkspace": True},
                ],
            },
            order={"updatedAt": "desc"},
        )
    return [
        SavedReportOut(
            id=uuid.UUID(r.id),
            workspace_id=uuid.UUID(r.workspaceId),
            user_id=uuid.UUID(r.userId),
            connection_id=uuid.UUID(r.connectionId),
            name=r.name,
            question=r.question or "",
            sql_text=r.sqlText,
            chart_type_hint=r.chartTypeHint,
            shared_with_workspace=r.sharedWithWorkspace,
            created_at=r.createdAt,
            updated_at=r.updatedAt,
        )
        for r in rows
    ]


@router.post("", response_model=SavedReportOut)
async def create_report(body: SavedReportCreate, user=Depends(require_sql_runner)):
    conn = await prisma.dbconnection.find_first(
        where={"id": str(body.connection_id), "workspaceId": str(user.workspaceId)}
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    row = await prisma.savedreport.create(
        data={
            "workspaceId": str(user.workspaceId),
            "userId": str(user.id),
            "connectionId": str(conn.id),
            "name": body.name,
            "question": body.question or "",
            "sqlText": body.sql_text,
            "chartTypeHint": body.chart_type_hint,
            "sharedWithWorkspace": body.shared_with_workspace,
        }
    )
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "report.create",
        resource_type="saved_report",
        resource_id=str(row.id),
        detail={"name": body.name},
    )
    return SavedReportOut(
        id=uuid.UUID(row.id),
        workspace_id=uuid.UUID(row.workspaceId),
        user_id=uuid.UUID(row.userId),
        connection_id=uuid.UUID(row.connectionId),
        name=row.name,
        question=row.question or "",
        sql_text=row.sqlText,
        chart_type_hint=row.chartTypeHint,
        shared_with_workspace=row.sharedWithWorkspace,
        created_at=row.createdAt,
        updated_at=row.updatedAt,
    )


@router.get("/{report_id}", response_model=SavedReportOut)
async def get_report(report_id: uuid.UUID, user=Depends(get_current_user)):
    row = await prisma.savedreport.find_first(where={"id": str(report_id)})
    if not row or not _can_read_report(user, row):
        raise HTTPException(status_code=404, detail="Report not found")
    return SavedReportOut(
        id=uuid.UUID(row.id),
        workspace_id=uuid.UUID(row.workspaceId),
        user_id=uuid.UUID(row.userId),
        connection_id=uuid.UUID(row.connectionId),
        name=row.name,
        question=row.question or "",
        sql_text=row.sqlText,
        chart_type_hint=row.chartTypeHint,
        shared_with_workspace=row.sharedWithWorkspace,
        created_at=row.createdAt,
        updated_at=row.updatedAt,
    )


@router.patch("/{report_id}", response_model=SavedReportOut)
async def patch_report(report_id: uuid.UUID, body: SavedReportPatch, user=Depends(require_sql_runner)):
    row = await prisma.savedreport.find_first(where={"id": str(report_id)})
    if not row or not _can_write_report(user, row):
        raise HTTPException(status_code=404, detail="Report not found")
    data: dict[str, Any] = {}
    if body.name is not None:
        data["name"] = body.name
    if body.sql_text is not None:
        data["sqlText"] = body.sql_text
    if body.question is not None:
        data["question"] = body.question
    if body.chart_type_hint is not None:
        data["chartTypeHint"] = body.chart_type_hint
    if body.shared_with_workspace is not None:
        data["sharedWithWorkspace"] = body.shared_with_workspace
    updated = await prisma.savedreport.update(where={"id": row.id}, data=data)
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "report.update",
        resource_type="saved_report",
        resource_id=str(row.id),
        detail={"fields": list(data.keys())},
    )
    return SavedReportOut(
        id=uuid.UUID(updated.id),
        workspace_id=uuid.UUID(updated.workspaceId),
        user_id=uuid.UUID(updated.userId),
        connection_id=uuid.UUID(updated.connectionId),
        name=updated.name,
        question=updated.question or "",
        sql_text=updated.sqlText,
        chart_type_hint=updated.chartTypeHint,
        shared_with_workspace=updated.sharedWithWorkspace,
        created_at=updated.createdAt,
        updated_at=updated.updatedAt,
    )


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: uuid.UUID, user=Depends(require_sql_runner)):
    row = await prisma.savedreport.find_first(where={"id": str(report_id)})
    if not row or not _can_write_report(user, row):
        raise HTTPException(status_code=404, detail="Report not found")
    await prisma.savedreport.delete(where={"id": row.id})
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "report.delete",
        resource_type="saved_report",
        resource_id=str(report_id),
    )


@router.post("/{report_id}/run", response_model=ExecuteResponse)
async def run_saved_report(
    report_id: uuid.UUID,
    user=Depends(require_sql_runner),
    chart_preference: str | None = None,
):
    row = await prisma.savedreport.find_first(where={"id": str(report_id)})
    if not row or not _can_read_report(user, row):
        raise HTTPException(status_code=404, detail="Report not found")
    body = ExecuteRequest(
        connection_id=uuid.UUID(row.connectionId),
        sql=row.sqlText,
        question=row.question or None,
        chart_preference=chart_preference or row.chartTypeHint,
    )
    out = await run_execute_request(user, body, persist_history=True)
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "report.run",
        resource_type="saved_report",
        resource_id=str(row.id),
    )
    return out


@router.post("/{report_id}/schedules", response_model=ReportScheduleOut)
async def create_schedule(report_id: uuid.UUID, body: ReportScheduleCreate, user=Depends(require_sql_runner)):
    row = await prisma.savedreport.find_first(where={"id": str(report_id)})
    if not row or not _can_write_report(user, row):
        raise HTTPException(status_code=404, detail="Report not found")
    now = datetime.now(timezone.utc)
    nxt = next_cron_fire(body.cron_expr, now)
    sch = await prisma.reportschedule.create(
        data={
            "reportId": str(row.id),
            "workspaceId": str(row.workspaceId),
            "cronExpr": body.cron_expr,
            "timezone": body.timezone,
            "emailTo": body.email_to,
            "enabled": body.enabled,
            "nextRunAt": nxt,
        }
    )
    await log_audit(
        str(user.workspaceId),
        str(user.id),
        "report.schedule_create",
        resource_type="report_schedule",
        resource_id=str(sch.id),
    )
    return ReportScheduleOut(
        id=uuid.UUID(sch.id),
        report_id=uuid.UUID(sch.reportId),
        cron_expr=sch.cronExpr,
        timezone=sch.timezone,
        email_to=sch.emailTo,
        enabled=sch.enabled,
        last_run_at=sch.lastRunAt,
        next_run_at=sch.nextRunAt,
        created_at=sch.createdAt,
    )


@router.get("/{report_id}/schedules", response_model=list[ReportScheduleOut])
async def list_schedules(report_id: uuid.UUID, user=Depends(get_current_user)):
    row = await prisma.savedreport.find_first(where={"id": str(report_id)})
    if not row or not _can_read_report(user, row):
        raise HTTPException(status_code=404, detail="Report not found")
    scheds = await prisma.reportschedule.find_many(where={"reportId": str(row.id)})
    return [
        ReportScheduleOut(
            id=uuid.UUID(s.id),
            report_id=uuid.UUID(s.reportId),
            cron_expr=s.cronExpr,
            timezone=s.timezone,
            email_to=s.emailTo,
            enabled=s.enabled,
            last_run_at=s.lastRunAt,
            next_run_at=s.nextRunAt,
            created_at=s.createdAt,
        )
        for s in scheds
    ]


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(schedule_id: uuid.UUID, user=Depends(require_sql_runner)):
    sch = await prisma.reportschedule.find_first(where={"id": str(schedule_id)})
    if not sch:
        raise HTTPException(status_code=404, detail="Schedule not found")
    rep = await prisma.savedreport.find_first(where={"id": sch.reportId})
    if not rep or str(rep.workspaceId) != str(user.workspaceId):
        raise HTTPException(status_code=404, detail="Schedule not found")
    if not _can_write_report(user, rep):
        raise HTTPException(status_code=403, detail="Not allowed")
    await prisma.reportschedule.delete(where={"id": sch.id})
