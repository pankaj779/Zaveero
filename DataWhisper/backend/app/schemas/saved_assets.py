import uuid
from typing import Any

from pydantic import BaseModel, Field


class SavedReportCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    connection_id: uuid.UUID
    sql_text: str = Field(min_length=1, max_length=200_000)
    question: str = ""
    chart_type_hint: str | None = None
    shared_with_workspace: bool = False


class SavedReportPatch(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    sql_text: str | None = Field(None, min_length=1, max_length=200_000)
    question: str | None = None
    chart_type_hint: str | None = None
    shared_with_workspace: bool | None = None


class SavedReportOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    connection_id: uuid.UUID
    name: str
    question: str
    sql_text: str
    chart_type_hint: str | None
    shared_with_workspace: bool
    created_at: Any
    updated_at: Any


class ReportScheduleCreate(BaseModel):
    cron_expr: str = Field(min_length=1, max_length=120)
    email_to: str = Field(min_length=3, max_length=500)
    timezone: str = "UTC"
    enabled: bool = True


class ReportScheduleOut(BaseModel):
    id: uuid.UUID
    report_id: uuid.UUID
    cron_expr: str
    timezone: str
    email_to: str
    enabled: bool
    last_run_at: Any | None
    next_run_at: Any | None
    created_at: Any


class SavedDashboardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    report_order: list[uuid.UUID] = Field(default_factory=list)
    shared_with_workspace: bool = False


class SavedDashboardPatch(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    report_order: list[uuid.UUID] | None = None
    shared_with_workspace: bool | None = None


class SavedDashboardOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str
    report_order: list[str]
    shared_with_workspace: bool
    created_at: Any
    updated_at: Any
