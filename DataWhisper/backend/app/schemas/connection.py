import uuid
from typing import Any

from pydantic import BaseModel, Field


class ConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(
        pattern=r"^(POSTGRES|MYSQL|SNOWFLAKE|BIGQUERY|DATABRICKS|SQLSERVER|REDSHIFT)$"
    )
    config: dict[str, Any]


class ConnectionOut(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    type: str
    created_at: Any
    updated_at: Any


class ConnectionTest(BaseModel):
    type: str = Field(
        pattern=r"^(POSTGRES|MYSQL|SNOWFLAKE|BIGQUERY|DATABRICKS|SQLSERVER|REDSHIFT)$"
    )
    config: dict[str, Any]
