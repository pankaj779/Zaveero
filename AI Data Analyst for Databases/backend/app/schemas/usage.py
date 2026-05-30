from pydantic import BaseModel


class UsageOut(BaseModel):
    id: str
    user_id: str
    workspace_id: str
    total_ai_generations: int
    total_executions: int
    updated_at: str | None = None
