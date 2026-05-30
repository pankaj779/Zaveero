"""
Kafka scanner.

Connects with the AdminClient and lists topics + partition counts. Each topic
becomes a node (`PIPELINE_STEP`).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.services.scanners import empty_result

logger = logging.getLogger(__name__)

MAX_TOPICS = 500


async def scan(config: dict[str, Any]) -> dict[str, Any]:
    try:
        from kafka.admin import KafkaAdminClient  # type: ignore
        from kafka.errors import KafkaError  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "kafka-python is required for Kafka scans. Install kafka-python>=2.0 in the worker image."
        ) from e

    bootstrap = config.get("bootstrap_servers")
    if not bootstrap:
        raise ValueError("Kafka config must include 'bootstrap_servers'.")
    if isinstance(bootstrap, str):
        servers = [s.strip() for s in bootstrap.split(",") if s.strip()]
    else:
        servers = list(bootstrap)

    security_protocol = (config.get("security_protocol") or "PLAINTEXT").upper()
    username = config.get("username")
    password = config.get("password")

    def _scan_sync() -> dict[str, Any]:
        result = empty_result()
        admin: Any = None
        kwargs: dict[str, Any] = {
            "bootstrap_servers": servers,
            "security_protocol": security_protocol,
            "request_timeout_ms": 8000,
            "client_id": "datawhisper-crawler",
        }
        if security_protocol in {"SASL_PLAINTEXT", "SASL_SSL"} and username:
            kwargs.update({
                "sasl_mechanism": "PLAIN",
                "sasl_plain_username": username,
                "sasl_plain_password": password or "",
            })
        try:
            admin = KafkaAdminClient(**kwargs)
            topics = admin.list_topics()
        except KafkaError as e:
            result["errors"].append({"file": "<kafka connect>", "error": str(e)})
            if admin is not None:
                admin.close()
            return result

        cluster_label = ",".join(servers[:2]) + ("…" if len(servers) > 2 else "")
        cluster_node = f"kafka://{cluster_label}"
        result["nodes"].append({
            "node_type": "PIPELINE_STEP",
            "node_name": cluster_node,
            "source_file": cluster_node,
            "environment": "UNKNOWN",
            "metadata": {"kind": "KAFKA_CLUSTER", "bootstrap_servers": servers},
        })

        seen = 0
        for topic in sorted(topics):
            if topic.startswith("__"):
                continue
            if seen >= MAX_TOPICS:
                break
            fq = f"{cluster_node}/{topic}"
            result["nodes"].append({
                "node_type": "TABLE_READ",
                "node_name": fq,
                "source_file": fq,
                "environment": "UNKNOWN",
                "metadata": {"kind": "KAFKA_TOPIC", "topic": topic},
            })
            result["edges"].append({
                "from_node": cluster_node,
                "to_node": fq,
                "edge_type": "TABLE_READ",
                "source_file": fq,
                "environment": "UNKNOWN",
            })
            seen += 1
        result["files_scanned"] = seen
        if admin is not None:
            admin.close()
        return result

    return await asyncio.to_thread(_scan_sync)
