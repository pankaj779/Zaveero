"""
Per-protocol scanners.

Each scanner is responsible for one CrawlSource.sourceType:

    GITHUB / GITLAB / BITBUCKET / CUSTOM  -> github_crawler (existing, separate module)
    S3                                    -> s3.scan
    MONGODB                               -> mongodb.scan
    KAFKA                                 -> kafka.scan
    REST_API                              -> rest_api.scan

Every scanner returns the same shape:

    {
        "nodes":       [ { node_type, node_name, source_file, environment, metadata } ],
        "edges":       [ { from_node, to_node, edge_type, source_file, environment } ],
        "discoveries": [ { kind, uri, display_name, detail, source_file } ],
        "files_scanned": int,
        "files_skipped": int,
        "errors": [...]
    }

That way `_run_crawl` can persist results uniformly regardless of source type.
"""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

logger = logging.getLogger(__name__)


ScannerFn = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


async def run_scanner(source_type: str, config: dict[str, Any]) -> dict[str, Any]:
    """Dispatch to the right scanner. Imports are lazy so optional deps don't fail at startup."""
    st = source_type.upper()
    if st == "S3":
        from app.services.scanners.s3 import scan as s3_scan
        return await s3_scan(config)
    if st == "MONGODB":
        from app.services.scanners.mongodb import scan as mongo_scan
        return await mongo_scan(config)
    if st == "KAFKA":
        from app.services.scanners.kafka import scan as kafka_scan
        return await kafka_scan(config)
    if st == "REST_API":
        from app.services.scanners.rest_api import scan as rest_scan
        return await rest_scan(config)
    raise ValueError(f"No native scanner for source type: {source_type}")


def empty_result() -> dict[str, Any]:
    return {
        "nodes": [],
        "edges": [],
        "discoveries": [],
        "files_scanned": 0,
        "files_skipped": 0,
        "errors": [],
    }
