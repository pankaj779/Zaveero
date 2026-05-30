import uuid
from datetime import datetime

from pydantic import BaseModel


class HistoryOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    connection_id: uuid.UUID
    question: str
    sql_text: str
    result_row_count: int
    chart_type: str | None
    explanation: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
