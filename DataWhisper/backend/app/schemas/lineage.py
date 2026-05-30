import uuid
from typing import Any

from pydantic import BaseModel


class LineageOut(BaseModel):
    connection_id: uuid.UUID
    version: int
    adjacency: dict[str, Any]
    edges: list[dict[str, Any]]
    fact_tables: list[Any]
    dimension_tables: list[Any]
    scanned_at: Any
    stats: dict[str, Any] | None = None


class LineagePathOut(BaseModel):
    connection_id: uuid.UUID
    version: int
    from_table: str
    to_table: str
    found: bool
    table_path: list[str]
    edges: list[dict[str, Any]]
