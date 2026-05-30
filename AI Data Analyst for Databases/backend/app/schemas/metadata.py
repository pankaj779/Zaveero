import uuid
from typing import Any

from pydantic import BaseModel


class MetadataOut(BaseModel):
    connection_id: uuid.UUID
    version: int
    metadata: dict[str, Any]
    lineage_adjacency: dict[str, Any]
    fact_tables: list[Any]
    dimension_tables: list[Any]
    scanned_at: Any


class ScanResponse(BaseModel):
    version: int
    tables_scanned: int
    edges: int
