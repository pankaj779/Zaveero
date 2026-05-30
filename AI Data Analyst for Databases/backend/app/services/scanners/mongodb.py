"""
MongoDB scanner.

Lists databases + collections, optionally sampling a document per collection
to extract top-level field names (this becomes the "schema").
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.services.scanners import empty_result

logger = logging.getLogger(__name__)

MAX_DATABASES = 30
MAX_COLLECTIONS_PER_DB = 100
SAMPLE_FIELDS_LIMIT = 50

SYSTEM_DBS = {"admin", "config", "local"}


async def scan(config: dict[str, Any]) -> dict[str, Any]:
    try:
        from pymongo import MongoClient  # type: ignore
        from pymongo.errors import PyMongoError  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "pymongo is required for MongoDB scans. Install pymongo>=4.7 in the worker image."
        ) from e

    uri = config.get("uri")
    if not uri:
        raise ValueError("MongoDB config must include a 'uri' field.")

    def _scan_sync() -> dict[str, Any]:
        result = empty_result()
        client: Any = None
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)
            db_names = client.list_database_names()
        except PyMongoError as e:
            result["errors"].append({"file": "<mongo connect>", "error": str(e)})
            if client is not None:
                client.close()
            return result

        for db_name in db_names[:MAX_DATABASES]:
            if db_name in SYSTEM_DBS:
                continue
            result["nodes"].append({
                "node_type": "PIPELINE_STEP",
                "node_name": f"mongo://{db_name}",
                "source_file": f"mongo://{db_name}",
                "environment": "UNKNOWN",
                "metadata": {"kind": "MONGO_DATABASE", "database": db_name},
            })
            try:
                db = client[db_name]
                collections = db.list_collection_names()[:MAX_COLLECTIONS_PER_DB]
            except PyMongoError as e:
                result["errors"].append({"file": f"mongo://{db_name}", "error": str(e)})
                continue

            for c_name in collections:
                fq = f"mongo://{db_name}/{c_name}"
                fields: list[str] = []
                try:
                    sample = db[c_name].find_one()
                    if isinstance(sample, dict):
                        fields = list(sample.keys())[:SAMPLE_FIELDS_LIMIT]
                except PyMongoError as e:
                    result["errors"].append({"file": fq, "error": str(e)})

                result["nodes"].append({
                    "node_type": "TABLE_READ",
                    "node_name": fq,
                    "source_file": fq,
                    "environment": "UNKNOWN",
                    "metadata": {
                        "kind": "MONGO_COLLECTION",
                        "database": db_name,
                        "collection": c_name,
                        "fields": fields,
                    },
                })
                result["edges"].append({
                    "from_node": f"mongo://{db_name}",
                    "to_node": fq,
                    "edge_type": "TABLE_READ",
                    "source_file": fq,
                    "environment": "UNKNOWN",
                })
                result["files_scanned"] += 1
        if client is not None:
            client.close()
        return result

    return await asyncio.to_thread(_scan_sync)
