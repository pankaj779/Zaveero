"""SQLite store for workspaces, users, Databricks connections, and monitored agents."""

from __future__ import annotations

import re
import sqlite3
import time
import uuid
from typing import Any

from app.config import BACKEND_ROOT
from app.runtime_context import ConnectionRecord
from app.utils.encrypt import decrypt_text, encrypt_text

_DB_PATH = BACKEND_ROOT / "agentops_app_config.db"


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(str(_DB_PATH), timeout=10.0)
    c.row_factory = sqlite3.Row
    c.executescript(
        """
        CREATE TABLE IF NOT EXISTS kv (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            created_at REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            workspace_id TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'ADMIN',
            active_connection_id TEXT,
            created_at REAL NOT NULL,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
        );
        CREATE TABLE IF NOT EXISTS databricks_connections (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT NOT NULL,
            host TEXT NOT NULL,
            http_path TEXT NOT NULL,
            workspace_id_dbx TEXT NOT NULL,
            encrypted_token TEXT NOT NULL,
            encrypted_gateway_token TEXT,
            inference_schema TEXT,
            inference_time_column TEXT DEFAULT 'event_time',
            inference_table_suffix TEXT DEFAULT '_payload',
            benchmark_enabled INTEGER DEFAULT 1,
            exclude_test_requests INTEGER DEFAULT 1,
            is_default INTEGER DEFAULT 0,
            created_at REAL NOT NULL,
            updated_at REAL NOT NULL,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
        );
        CREATE TABLE IF NOT EXISTS monitored_agents (
            id TEXT PRIMARY KEY,
            connection_id TEXT NOT NULL,
            label TEXT NOT NULL,
            route_model TEXT NOT NULL,
            gateway_url TEXT NOT NULL,
            inference_table_fqn TEXT,
            enabled INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at REAL NOT NULL,
            FOREIGN KEY(connection_id) REFERENCES databricks_connections(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS connection_gateway_aliases (
            id TEXT PRIMARY KEY,
            connection_id TEXT NOT NULL,
            display_name TEXT NOT NULL,
            route_name TEXT NOT NULL,
            FOREIGN KEY(connection_id) REFERENCES databricks_connections(id) ON DELETE CASCADE
        );
        """
    )
    return c


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:48] or "workspace"


def _row_connection(row: sqlite3.Row) -> ConnectionRecord:
    gw = row["encrypted_gateway_token"]
    return ConnectionRecord(
        id=row["id"],
        workspace_id=row["workspace_id"],
        name=row["name"],
        host=row["host"],
        http_path=row["http_path"],
        workspace_id_dbx=row["workspace_id_dbx"],
        sql_token=decrypt_text(row["encrypted_token"]),
        gateway_token=decrypt_text(gw) if gw else decrypt_text(row["encrypted_token"]),
        inference_schema=row["inference_schema"] or "",
        inference_time_column=row["inference_time_column"] or "event_time",
        inference_table_suffix=row["inference_table_suffix"] or "_payload",
        benchmark_enabled=bool(row["benchmark_enabled"]),
        exclude_test_requests=bool(row["exclude_test_requests"]),
    )


def create_workspace(name: str) -> dict[str, Any]:
    ws_id = str(uuid.uuid4())
    base_slug = _slugify(name)
    slug = base_slug
    n = 1
    with _conn() as c:
        while c.execute("SELECT 1 FROM workspaces WHERE slug = ?", (slug,)).fetchone():
            slug = f"{base_slug}-{n}"
            n += 1
        now = time.time()
        c.execute(
            "INSERT INTO workspaces (id, name, slug, created_at) VALUES (?, ?, ?, ?)",
            (ws_id, name, slug, now),
        )
    return {"id": ws_id, "name": name, "slug": slug}


def create_user(*, email: str, password_hash: str, name: str, workspace_id: str, role: str = "ADMIN") -> dict:
    uid = str(uuid.uuid4())
    with _conn() as c:
        c.execute(
            "INSERT INTO users (id, email, password_hash, name, workspace_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (uid, email.lower(), password_hash, name, workspace_id, role, time.time()),
        )
    return get_user_by_id(uid)  # type: ignore[return-value]


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with _conn() as c:
        row = c.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    with _conn() as c:
        row = c.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def get_workspace(workspace_id: str) -> dict[str, Any] | None:
    with _conn() as c:
        row = c.execute("SELECT * FROM workspaces WHERE id = ?", (workspace_id,)).fetchone()
    return dict(row) if row else None


def set_active_connection(user_id: str, connection_id: str | None) -> None:
    with _conn() as c:
        c.execute("UPDATE users SET active_connection_id = ? WHERE id = ?", (connection_id, user_id))


def create_connection(
    *,
    workspace_id: str,
    name: str,
    host: str,
    http_path: str,
    workspace_id_dbx: str,
    sql_token: str,
    gateway_token: str = "",
    inference_schema: str = "",
    inference_time_column: str = "event_time",
    inference_table_suffix: str = "_payload",
    benchmark_enabled: bool = True,
    exclude_test_requests: bool = True,
    is_default: bool = False,
) -> dict[str, Any]:
    cid = str(uuid.uuid4())
    now = time.time()
    host = host.replace("https://", "").replace("http://", "").strip().rstrip("/")
    with _conn() as c:
        if is_default or c.execute(
            "SELECT COUNT(*) FROM databricks_connections WHERE workspace_id = ?",
            (workspace_id,),
        ).fetchone()[0] == 0:
            is_default = True
        if is_default:
            c.execute(
                "UPDATE databricks_connections SET is_default = 0 WHERE workspace_id = ?",
                (workspace_id,),
            )
        c.execute(
            """
            INSERT INTO databricks_connections (
                id, workspace_id, name, host, http_path, workspace_id_dbx,
                encrypted_token, encrypted_gateway_token, inference_schema,
                inference_time_column, inference_table_suffix,
                benchmark_enabled, exclude_test_requests, is_default, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                cid,
                workspace_id,
                name,
                host,
                http_path.strip(),
                workspace_id_dbx.strip(),
                encrypt_text(sql_token.strip()),
                encrypt_text(gateway_token.strip()) if gateway_token.strip() else None,
                inference_schema.strip(),
                inference_time_column.strip() or "event_time",
                inference_table_suffix.strip() or "_payload",
                int(benchmark_enabled),
                int(exclude_test_requests),
                int(is_default),
                now,
                now,
            ),
        )
    return connection_public(cid)


def update_connection(connection_id: str, workspace_id: str, **fields: Any) -> dict[str, Any] | None:
    allowed = {
        "name",
        "host",
        "http_path",
        "workspace_id_dbx",
        "inference_schema",
        "inference_time_column",
        "inference_table_suffix",
        "benchmark_enabled",
        "exclude_test_requests",
    }
    sets: list[str] = []
    vals: list[Any] = []
    for key, val in fields.items():
        if key == "sql_token" and val:
            sets.append("encrypted_token = ?")
            vals.append(encrypt_text(str(val).strip()))
        elif key == "gateway_token":
            sets.append("encrypted_gateway_token = ?")
            vals.append(encrypt_text(str(val).strip()) if val else None)
        elif key in allowed:
            col = key
            if key == "host":
                val = str(val).replace("https://", "").replace("http://", "").strip().rstrip("/")
            sets.append(f"{col} = ?")
            vals.append(val)
    if not sets:
        return connection_public(connection_id)
    sets.append("updated_at = ?")
    vals.append(time.time())
    vals.extend([connection_id, workspace_id])
    with _conn() as c:
        c.execute(
            f"UPDATE databricks_connections SET {', '.join(sets)} WHERE id = ? AND workspace_id = ?",
            vals,
        )
    return connection_public(connection_id)


def delete_connection(connection_id: str, workspace_id: str) -> bool:
    with _conn() as c:
        cur = c.execute(
            "DELETE FROM databricks_connections WHERE id = ? AND workspace_id = ?",
            (connection_id, workspace_id),
        )
        return cur.rowcount > 0


def list_connections(workspace_id: str) -> list[dict[str, Any]]:
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM databricks_connections WHERE workspace_id = ? ORDER BY is_default DESC, name ASC",
            (workspace_id,),
        ).fetchall()
    return [connection_public_row(r) for r in rows]


def get_connection(connection_id: str, workspace_id: str | None = None) -> ConnectionRecord | None:
    with _conn() as c:
        if workspace_id:
            row = c.execute(
                "SELECT * FROM databricks_connections WHERE id = ? AND workspace_id = ?",
                (connection_id, workspace_id),
            ).fetchone()
        else:
            row = c.execute("SELECT * FROM databricks_connections WHERE id = ?", (connection_id,)).fetchone()
    return _row_connection(row) if row else None


def get_default_connection(workspace_id: str) -> ConnectionRecord | None:
    with _conn() as c:
        row = c.execute(
            "SELECT * FROM databricks_connections WHERE workspace_id = ? ORDER BY is_default DESC, created_at ASC LIMIT 1",
            (workspace_id,),
        ).fetchone()
    return _row_connection(row) if row else None


def resolve_user_connection(user: dict[str, Any]) -> ConnectionRecord | None:
    ws_id = user["workspace_id"]
    active_id = user.get("active_connection_id")
    if active_id:
        conn = get_connection(active_id, ws_id)
        if conn:
            return conn
    return get_default_connection(ws_id)


def connection_public_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "host": row["host"],
        "http_path": row["http_path"],
        "workspace_id_dbx": row["workspace_id_dbx"],
        "inference_schema": row["inference_schema"],
        "inference_time_column": row["inference_time_column"],
        "inference_table_suffix": row["inference_table_suffix"],
        "benchmark_enabled": bool(row["benchmark_enabled"]),
        "exclude_test_requests": bool(row["exclude_test_requests"]),
        "is_default": bool(row["is_default"]),
        "has_gateway_token": bool(row["encrypted_gateway_token"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def connection_public(connection_id: str) -> dict[str, Any]:
    with _conn() as c:
        row = c.execute("SELECT * FROM databricks_connections WHERE id = ?", (connection_id,)).fetchone()
    if not row:
        raise ValueError("Connection not found")
    return connection_public_row(row)


# ─── Monitored agents ────────────────────────────────────────────────────────

def list_monitored_agents(connection_id: str) -> list[dict[str, Any]]:
    with _conn() as c:
        rows = c.execute(
            "SELECT * FROM monitored_agents WHERE connection_id = ? ORDER BY sort_order ASC, label ASC",
            (connection_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def create_monitored_agent(
    *,
    connection_id: str,
    label: str,
    route_model: str,
    gateway_url: str,
    inference_table_fqn: str = "",
    enabled: bool = True,
    sort_order: int = 0,
) -> dict[str, Any]:
    aid = str(uuid.uuid4())
    with _conn() as c:
        c.execute(
            """
            INSERT INTO monitored_agents (
                id, connection_id, label, route_model, gateway_url,
                inference_table_fqn, enabled, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                aid,
                connection_id,
                label.strip(),
                route_model.strip().lower(),
                gateway_url.strip(),
                inference_table_fqn.strip() or None,
                int(enabled),
                sort_order,
                time.time(),
            ),
        )
    return get_monitored_agent(aid)  # type: ignore[return-value]


def get_monitored_agent(agent_id: str) -> dict[str, Any] | None:
    with _conn() as c:
        row = c.execute("SELECT * FROM monitored_agents WHERE id = ?", (agent_id,)).fetchone()
    return dict(row) if row else None


def update_monitored_agent(agent_id: str, connection_id: str, **fields: Any) -> dict[str, Any] | None:
    allowed = {"label", "route_model", "gateway_url", "inference_table_fqn", "enabled", "sort_order"}
    sets = []
    vals = []
    for k, v in fields.items():
        if k in allowed:
            if k == "route_model":
                v = str(v).strip().lower()
            sets.append(f"{k} = ?")
            vals.append(v)
    if not sets:
        return get_monitored_agent(agent_id)
    vals.extend([agent_id, connection_id])
    with _conn() as c:
        c.execute(
            f"UPDATE monitored_agents SET {', '.join(sets)} WHERE id = ? AND connection_id = ?",
            vals,
        )
    return get_monitored_agent(agent_id)


def delete_monitored_agent(agent_id: str, connection_id: str) -> bool:
    with _conn() as c:
        cur = c.execute(
            "DELETE FROM monitored_agents WHERE id = ? AND connection_id = ?",
            (agent_id, connection_id),
        )
        return cur.rowcount > 0


def list_gateway_aliases(connection_id: str) -> list[dict[str, str]]:
    with _conn() as c:
        rows = c.execute(
            "SELECT display_name, route_name FROM connection_gateway_aliases WHERE connection_id = ?",
            (connection_id,),
        ).fetchall()
    return [{"display": r["display_name"], "route": r["route_name"]} for r in rows]


def replace_gateway_aliases(connection_id: str, aliases: list[dict[str, str]]) -> None:
    with _conn() as c:
        c.execute("DELETE FROM connection_gateway_aliases WHERE connection_id = ?", (connection_id,))
        for a in aliases:
            display = str(a.get("display") or a.get("display_name") or "").strip()
            route = str(a.get("route") or a.get("route_name") or "").strip()
            if display and route:
                c.execute(
                    "INSERT INTO connection_gateway_aliases (id, connection_id, display_name, route_name) VALUES (?, ?, ?, ?)",
                    (str(uuid.uuid4()), connection_id, display, route),
                )
