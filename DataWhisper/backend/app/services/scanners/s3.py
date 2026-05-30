"""
S3 scanner.

Connects to AWS S3 with the user-provided credentials and:
  - if `bucket` is set: lists up to MAX_KEYS objects in that bucket
  - else: lists all buckets visible to the credentials
emits one node per bucket and per "data-shaped" key (csv/json/parquet/avro/orc),
and surfaces any cross-bucket refs as discoveries.

We bound listing to keep crawls cheap. Buckets with millions of keys are rolled
up by the top-level prefix.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.services.scanners import empty_result

logger = logging.getLogger(__name__)

MAX_KEYS_PER_BUCKET = 500
MAX_BUCKETS = 50
DATA_EXTENSIONS = (".csv", ".tsv", ".json", ".jsonl", ".ndjson", ".parquet",
                   ".avro", ".orc", ".gz", ".bz2", ".zip", ".xml", ".txt")


def _classify_env(name: str) -> str:
    n = name.lower()
    if any(t in n for t in ("/prod/", "-prod", "prod-", "/production/")):
        return "PRODUCTION"
    if any(t in n for t in ("/stage", "/staging", "stg-", "-stg")):
        return "STAGING"
    if any(t in n for t in ("/dev", "/test", "-dev", "-test")):
        return "DEV"
    return "UNKNOWN"


async def scan(config: dict[str, Any]) -> dict[str, Any]:
    try:
        import boto3  # type: ignore
        from botocore.config import Config  # type: ignore
        from botocore.exceptions import BotoCoreError, ClientError  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "boto3 is required for S3 scans. Install boto3>=1.34 in the worker image."
        ) from e

    region = config.get("region") or "us-east-1"
    access_key = config.get("access_key_id")
    secret_key = config.get("secret_access_key")
    bucket = config.get("bucket")

    def _list() -> dict[str, Any]:
        result = empty_result()
        try:
            session = boto3.session.Session(
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region,
            )
            s3 = session.client("s3", config=Config(retries={"max_attempts": 2}))
        except (BotoCoreError, ClientError) as e:
            result["errors"].append({"file": "<s3 init>", "error": str(e)})
            return result

        buckets: list[str] = []
        if bucket:
            buckets = [bucket]
        else:
            try:
                resp = s3.list_buckets()
                buckets = [b["Name"] for b in (resp.get("Buckets") or [])][:MAX_BUCKETS]
            except (BotoCoreError, ClientError) as e:
                result["errors"].append({"file": "<list_buckets>", "error": str(e)})

        for b in buckets:
            result["nodes"].append({
                "node_type": "PIPELINE_STEP",
                "node_name": f"s3://{b}",
                "source_file": f"s3://{b}",
                "environment": _classify_env(b),
                "metadata": {"kind": "S3_BUCKET", "bucket": b},
            })
            try:
                paginator = s3.get_paginator("list_objects_v2")
                seen = 0
                prefixes: dict[str, int] = {}
                for page in paginator.paginate(Bucket=b, MaxKeys=200):
                    for obj in page.get("Contents") or []:
                        key = obj["Key"]
                        seen += 1
                        top = key.split("/", 1)[0]
                        prefixes[top] = prefixes.get(top, 0) + 1
                        if seen <= MAX_KEYS_PER_BUCKET and key.lower().endswith(DATA_EXTENSIONS):
                            result["nodes"].append({
                                "node_type": "TABLE_READ",
                                "node_name": f"s3://{b}/{key}",
                                "source_file": f"s3://{b}/{key}",
                                "environment": _classify_env(key),
                                "metadata": {"kind": "S3_OBJECT", "size": obj.get("Size")},
                            })
                            result["edges"].append({
                                "from_node": f"s3://{b}",
                                "to_node": f"s3://{b}/{key}",
                                "edge_type": "TABLE_READ",
                                "source_file": f"s3://{b}/{key}",
                                "environment": _classify_env(key),
                            })
                    if seen >= MAX_KEYS_PER_BUCKET:
                        break
                # If we capped, record the top-level prefixes as roll-ups
                if seen >= MAX_KEYS_PER_BUCKET:
                    for prefix, count in prefixes.items():
                        result["nodes"].append({
                            "node_type": "PIPELINE_STEP",
                            "node_name": f"s3://{b}/{prefix}/ ({count}+ objects)",
                            "source_file": f"s3://{b}/{prefix}",
                            "environment": _classify_env(prefix),
                            "metadata": {"kind": "S3_PREFIX", "approx_count": count},
                        })
                result["files_scanned"] += seen
            except (BotoCoreError, ClientError) as e:
                result["errors"].append({"file": f"s3://{b}", "error": str(e)})

        return result

    return await asyncio.to_thread(_list)
