import uuid
from typing import Any

from typing import Literal

from pydantic import BaseModel, Field


class ConversationTurn(BaseModel):
    role: str = Field(description="user | assistant")
    question: str | None = None
    sql: str | None = None
    summary: str | None = None


class AiSqlRequest(BaseModel):
    connection_id: uuid.UUID
    question: str = Field(min_length=1, max_length=4000)
    conversation_history: list[ConversationTurn] | None = Field(
        None, description="Previous turns for follow-up context"
    )
    chat_mode: Literal["auto", "chat", "query"] = Field(
        default="auto",
        description="auto: route by intent | chat: metadata Q&A | query: always SQL+data",
    )


class AiSqlResponse(BaseModel):
    response_mode: Literal["answer", "sql", "catalog"] = Field(
        default="sql",
        description="answer: conversational prose | sql: run query | catalog: table list",
    )
    answer: str | None = Field(None, description="Conversational response when response_mode=answer|catalog")
    suggested_followups: list[str] | None = None
    sql: str | None = None
    clarification_needed: bool = False
    message: str | None = None
    explanation: str | None = None
    confidence: float | None = Field(None, ge=0.0, le=1.0)
    validation_errors: list[dict[str, Any]] | None = None
    retry_attempts: int = 0


class ExecuteRequest(BaseModel):
    connection_id: uuid.UUID
    sql: str = Field(min_length=1, max_length=200_000)
    question: str | None = None
    chart_preference: str | None = Field(
        None, description="auto | bar | line | doughnut | pivot | table | kpi"
    )
    skip_validation: bool = Field(
        False, description="Skip schema/lineage validation (safety checks like read-only are still enforced)"
    )


class ExecuteResponse(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]
    chart_type: str
    row_count: int
    sql: str
    explanation: str | None = None
    insight: str | None = None
    confidence: float | None = Field(None, ge=0.0, le=1.0)
    metadata_version_id: str | None = None
