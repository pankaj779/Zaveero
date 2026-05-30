import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException

from app.config import get_settings
from app.db import prisma, workspace_transaction
from app.schemas.execute import ExecuteRequest
from app.services.audit import log_audit
from app.services.email_notify import send_schedule_results
from app.services.query_runner import run_execute_request
from app.services.schedule_util import next_cron_fire

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/cron/run-schedules")
async def run_due_schedules(x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret")):
    settings = get_settings()
    if not settings.cron_secret or x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")
    now = datetime.now(timezone.utc)
    due = await prisma.reportschedule.find_many(
        where={
            "enabled": True,
            "nextRunAt": {"lte": now},
        }
    )
    processed = 0
    errors: list[str] = []
    for sch in due:
        try:
            async with workspace_transaction(str(sch.workspaceId)):
                rep = await prisma.savedreport.find_first(where={"id": sch.reportId})
                if not rep:
                    continue
                owner = await prisma.user.find_unique(where={"id": str(rep.userId)})
                if not owner:
                    continue
                body = ExecuteRequest(
                    connection_id=uuid.UUID(rep.connectionId),
                    sql=rep.sqlText,
                    question=rep.question or f"Scheduled report: {rep.name}",
                    chart_preference=rep.chartTypeHint,
                )
                out = await run_execute_request(owner, body, persist_history=False)
                subj = f"[DataWhisper] {rep.name} — {now.date().isoformat()}"
                msg = (out.insight or "") + "\n\n" + (out.explanation or "")
                if settings.smtp_configured:
                    await send_schedule_results(sch.emailTo, subj, msg, out.columns, out.rows)
                else:
                    await log_audit(
                        str(rep.workspaceId),
                        str(rep.userId),
                        "schedule.ran_no_smtp",
                        resource_type="report_schedule",
                        resource_id=str(sch.id),
                        detail={"rows": out.row_count, "email_to": sch.emailTo},
                    )
                nxt = next_cron_fire(sch.cronExpr, now)
                await prisma.reportschedule.update(
                    where={"id": sch.id},
                    data={"lastRunAt": now, "nextRunAt": nxt},
                )
                processed += 1
        except Exception as e:
            errors.append(f"{sch.id}: {e}")
    return {"processed": processed, "errors": errors}
