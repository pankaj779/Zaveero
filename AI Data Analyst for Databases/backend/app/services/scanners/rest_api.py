"""
REST API scanner.

Probes the base URL for a machine-readable description (OpenAPI / Swagger / GraphQL
introspection) and turns each endpoint into a lineage node. If nothing is found we
fall back to a single root node so the discovery still appears on the graph.
"""

from __future__ import annotations

import json
import logging
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
import yaml

from app.services.scanners import empty_result

logger = logging.getLogger(__name__)

OPENAPI_PATHS = (
    "openapi.json",
    "openapi.yaml",
    "swagger.json",
    "swagger/v1/swagger.json",
    "v3/api-docs",
    "v3/api-docs.yaml",
    "api-docs",
    "api-docs.json",
    "docs/openapi.json",
    "docs/openapi.yaml",
    "api/openapi.json",
    "api/v1/openapi.json",
    ".well-known/openapi.json",
)
TIMEOUT = httpx.Timeout(15.0, connect=8.0)
DEFAULT_HEADERS = {
    "Accept": "application/json, application/yaml, text/yaml, */*",
    "User-Agent": "DataWhisper-REST-scanner/1.0",
}


def _auth_headers(config: dict[str, Any]) -> dict[str, str]:
    kind = (config.get("auth_kind") or "none").lower()
    headers: dict[str, str] = {}
    if kind == "bearer" and config.get("token"):
        headers["Authorization"] = f"Bearer {config['token']}"
    elif kind == "api_key" and config.get("token"):
        headers["X-API-Key"] = config["token"]
    return headers


def _auth_tuple(config: dict[str, Any]) -> tuple[str, str] | None:
    if (config.get("auth_kind") or "").lower() == "basic":
        u = config.get("username") or ""
        p = config.get("token") or ""
        if u or p:
            return (u, p)
    return None


async def scan(config: dict[str, Any]) -> dict[str, Any]:
    base_url = config.get("base_url") or config.get("url")
    if not base_url:
        raise ValueError("REST API config must include 'base_url'.")

    result = empty_result()
    parsed = urlparse(base_url)
    host = parsed.hostname or base_url
    root = f"api://{host}"
    result["nodes"].append({
        "node_type": "PIPELINE_STEP",
        "node_name": root,
        "source_file": base_url,
        "environment": "UNKNOWN",
        "metadata": {"kind": "REST_API_ROOT", "base_url": base_url},
    })

    headers = {**DEFAULT_HEADERS, **_auth_headers(config)}
    auth = _auth_tuple(config)

    def _looks_like_openapi(doc: Any) -> bool:
        if not isinstance(doc, dict):
            return False
        if "paths" in doc and isinstance(doc.get("paths"), dict):
            return True
        if "openapi" in doc or "swagger" in doc:
            return True
        return False

    openapi_doc: dict[str, Any] | None = None
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True, headers=headers, auth=auth) as client:
        last_probe: dict[str, Any] = {}
        for p in OPENAPI_PATHS:
            try:
                r = await client.get(urljoin(base_url.rstrip("/") + "/", p))
                last_probe = {"path": p, "status": r.status_code, "url": str(r.url)}
                if r.status_code != 200:
                    continue
                ct = (r.headers.get("content-type") or "").lower()
                text = r.text or ""
                doc: Any = None
                try:
                    doc = r.json()
                except Exception:
                    if text.strip().startswith("{"):
                        try:
                            doc = json.loads(text)
                        except Exception:
                            doc = None
                    if doc is None and (
                        "yaml" in ct or "text/plain" in ct or p.endswith(".yaml")
                    ):
                        try:
                            doc = yaml.safe_load(text)
                        except Exception:
                            doc = None
                if doc is None:
                    continue
                if _looks_like_openapi(doc):
                    openapi_doc = doc
                    result["nodes"][0]["metadata"]["openapi_url"] = str(r.url)
                    break
            except httpx.HTTPError as e:
                result["errors"].append({"file": p, "error": str(e)})

        if openapi_doc is None:
            try:
                r = await client.get(base_url.rstrip("/") + "/", headers=headers)
                result["nodes"][0]["metadata"]["http_status"] = r.status_code
                result["nodes"][0]["metadata"]["openapi_probe"] = last_probe
                if r.status_code == 200:
                    text = r.text or ""
                    doc2: Any = None
                    try:
                        doc2 = r.json()
                    except Exception:
                        if text.strip().startswith("{"):
                            try:
                                doc2 = json.loads(text)
                            except Exception:
                                doc2 = None
                        if doc2 is None:
                            try:
                                doc2 = yaml.safe_load(text)
                            except Exception:
                                doc2 = None
                    if doc2 is not None and _looks_like_openapi(doc2):
                        openapi_doc = doc2
                        result["nodes"][0]["metadata"]["openapi_url"] = str(r.url)
            except httpx.HTTPError as e:
                result["errors"].append({"file": base_url, "error": str(e)})
            if openapi_doc is None:
                msg = (
                    "Could not fetch OpenAPI/Swagger JSON. Try: base URL + /openapi.json, "
                    "use Bearer token if the app requires auth, and ensure the app exposes a spec "
                    "(Databricks Apps often require a PAT as Bearer)."
                )
                result["errors"].append({"file": "<openapi>", "error": msg, "probe": last_probe})
                return result

    if not isinstance(openapi_doc, dict):
        result["errors"].append({"file": "<openapi>", "error": "OpenAPI document is not a JSON object"})
        return result

    paths = openapi_doc.get("paths") or {}
    title = (openapi_doc.get("info") or {}).get("title") or host
    result["nodes"][0]["metadata"]["api_title"] = title

    for raw_path, path_obj in paths.items():
        if not isinstance(path_obj, dict):
            continue
        methods = [m.upper() for m in path_obj.keys() if m.lower() in {
            "get", "post", "put", "patch", "delete", "options", "head",
        }]
        if not methods:
            continue
        endpoint_node = f"{root}{raw_path}"
        result["nodes"].append({
            "node_type": "TABLE_READ",
            "node_name": endpoint_node,
            "source_file": raw_path,
            "environment": "UNKNOWN",
            "metadata": {"kind": "REST_API_ENDPOINT", "methods": methods, "path": raw_path},
        })
        result["edges"].append({
            "from_node": root,
            "to_node": endpoint_node,
            "edge_type": "TABLE_READ",
            "source_file": raw_path,
            "environment": "UNKNOWN",
        })
        result["files_scanned"] += 1

    return result
