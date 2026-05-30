import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import aiomysql
import asyncpg
import pymysql
import sqlparse
from google.cloud import bigquery
from google.oauth2 import service_account
from snowflake import connector as snowflake_connector

_pool = ThreadPoolExecutor(max_workers=8)


def _run_sync(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(_pool, lambda: fn(*args, **kwargs))


async def test_postgres(host: str, port: int, database: str, user: str, password: str, sslmode: str | None = None) -> None:
    ssl = None if not sslmode or sslmode == "disable" else True
    conn = await asyncpg.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        ssl=ssl,
        timeout=15,
    )
    await conn.close()


async def test_mysql(host: str, port: int, database: str, user: str, password: str) -> None:
    conn = await aiomysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        db=database,
        connect_timeout=15,
    )
    async with conn.cursor() as cur:
        await cur.execute("SELECT 1")
    conn.close()


def _test_snowflake(cfg: dict[str, Any]) -> None:
    snowflake_connector.connect(
        user=cfg["user"],
        password=cfg.get("password") or "",
        account=cfg["account"],
        warehouse=cfg.get("warehouse"),
        database=cfg.get("database"),
        schema=cfg.get("schema") or "PUBLIC",
        role=cfg.get("role"),
        authenticator=cfg.get("authenticator") or "snowflake",
    ).close()


def _test_bigquery(cfg: dict[str, Any]) -> None:
    sa_info = json.loads(cfg["service_account_json"])
    creds = service_account.Credentials.from_service_account_info(sa_info)
    client = bigquery.Client(project=cfg.get("project_id") or sa_info.get("project_id"), credentials=creds)
    client.query("SELECT 1").result()


def _test_databricks(cfg: dict[str, Any]) -> None:
    from databricks import sql as dbsql

    conn = dbsql.connect(
        server_hostname=cfg["host"],
        http_path=cfg["http_path"],
        access_token=cfg["token"],
    )
    cur = conn.cursor()
    cur.execute("SELECT 1")
    cur.close()
    conn.close()


def _test_sqlserver(cfg: dict[str, Any]) -> None:
    import pymssql

    conn = pymssql.connect(
        server=cfg["host"],
        port=int(cfg.get("port", 1433)),
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["database"],
        timeout=15,
        login_timeout=15,
    )
    conn.close()


def _test_redshift(cfg: dict[str, Any]) -> None:
    import redshift_connector

    conn = redshift_connector.connect(
        host=cfg["host"],
        port=int(cfg.get("port", 5439)),
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        timeout=15,
    )
    with conn.cursor() as cur:
        cur.execute("SELECT 1")
    conn.close()


async def test_connection(conn_type: str, config: dict[str, Any]) -> None:
    ct = conn_type.upper()
    if ct == "POSTGRES":
        await test_postgres(
            config["host"],
            int(config.get("port", 5432)),
            config["database"],
            config["user"],
            config["password"],
            config.get("sslmode"),
        )
    elif ct == "MYSQL":
        await test_mysql(
            config["host"],
            int(config.get("port", 3306)),
            config["database"],
            config["user"],
            config["password"],
        )
    elif ct == "SNOWFLAKE":
        await _run_sync(_test_snowflake, config)
    elif ct == "BIGQUERY":
        await _run_sync(_test_bigquery, config)
    elif ct == "DATABRICKS":
        await _run_sync(_test_databricks, config)
    elif ct == "SQLSERVER":
        await _run_sync(_test_sqlserver, config)
    elif ct == "REDSHIFT":
        await _run_sync(_test_redshift, config)
    else:
        raise ValueError(f"Unsupported connection type: {conn_type}")


def _mysql_sync_query(host, port, database, user, password, sql: str, limit: int):
    conn = pymysql.connect(
        host=host,
        port=int(port),
        user=user,
        password=password,
        database=database,
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchmany(limit)
            colnames = [d[0] for d in cur.description] if cur.description else []
        return colnames, rows
    finally:
        conn.close()


def _snowflake_query(cfg: dict, sql: str, limit: int):
    conn = snowflake_connector.connect(
        user=cfg["user"],
        password=cfg.get("password") or "",
        account=cfg["account"],
        warehouse=cfg.get("warehouse"),
        database=cfg.get("database"),
        schema=cfg.get("schema") or "PUBLIC",
        role=cfg.get("role"),
    )
    try:
        cur = conn.cursor()
        cur.execute(sql)
        colnames = [c[0] for c in cur.description] if cur.description else []
        rows = cur.fetchmany(limit)
        dict_rows = [dict(zip(colnames, r, strict=False)) for r in rows]
        return colnames, dict_rows
    finally:
        conn.close()


def _bigquery_query(cfg: dict, sql: str, limit: int):
    sa_info = json.loads(cfg["service_account_json"])
    creds = service_account.Credentials.from_service_account_info(sa_info)
    client = bigquery.Client(project=cfg.get("project_id") or sa_info.get("project_id"), credentials=creds)
    job = client.query(sql)
    rows_iter = job.result()
    colnames = [f.name for f in rows_iter.schema] if rows_iter.schema else []
    dict_rows = []
    for i, row in enumerate(rows_iter):
        if i >= limit:
            break
        dict_rows.append(dict(row))
    return colnames, dict_rows


def _databricks_query(cfg: dict, sql: str, limit: int):
    from databricks import sql as dbsql

    conn = dbsql.connect(
        server_hostname=cfg["host"],
        http_path=cfg["http_path"],
        access_token=cfg["token"],
    )
    try:
        cur = conn.cursor()
        cur.execute(sql)
        colnames = [c[0] for c in cur.description] if cur.description else []
        rows = cur.fetchmany(limit)
        dict_rows = [dict(zip(colnames, r, strict=False)) for r in rows]
        return colnames, dict_rows
    finally:
        conn.close()


def _sqlserver_query(cfg: dict, sql: str, limit: int):
    import pymssql

    conn = pymssql.connect(
        server=cfg["host"],
        port=int(cfg.get("port", 1433)),
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["database"],
        timeout=120,
        login_timeout=30,
    )
    try:
        with conn.cursor(as_dict=True) as cur:
            cur.execute(sql)
            rows = cur.fetchmany(limit)
            colnames = [d[0] for d in cur.description] if cur.description else []
        return colnames, rows
    finally:
        conn.close()


def _redshift_query(cfg: dict, sql: str, limit: int):
    import redshift_connector

    conn = redshift_connector.connect(
        host=cfg["host"],
        port=int(cfg.get("port", 5439)),
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        timeout=120,
    )
    try:
        cur = conn.cursor()
        cur.execute(sql)
        colnames = [c.name for c in cur.description] if cur.description else []
        rows = cur.fetchmany(limit)
        dict_rows = [dict(zip(colnames, r, strict=False)) for r in rows]
        return colnames, dict_rows
    finally:
        conn.close()


async def execute_readonly(
    conn_type: str, config: dict[str, Any], sql: str, max_rows: int = 500
) -> tuple[list[str], list[dict[str, Any]]]:
    parsed = sqlparse.parse(sql)
    if not parsed:
        raise ValueError("Empty SQL")
    stmt = parsed[0]
    tokens = [t.value.upper() for t in stmt.flatten() if not t.is_whitespace]
    if not tokens:
        raise ValueError("Invalid SQL")
    first = tokens[0]
    if first not in ("SELECT", "WITH", "SHOW", "DESCRIBE", "DESC", "EXPLAIN"):
        raise ValueError("Only read-only SELECT/WITH/SHOW/DESCRIBE/EXPLAIN queries are allowed")

    ct = conn_type.upper()
    if ct == "POSTGRES":
        conn = await asyncpg.connect(
            host=config["host"],
            port=int(config.get("port", 5432)),
            user=config["user"],
            password=config["password"],
            database=config["database"],
            ssl=None if config.get("sslmode") == "disable" else True,
        )
        try:
            rows = await conn.fetch(sql, timeout=120)
            if not rows:
                return [], []
            colnames = list(rows[0].keys())
            dict_rows = [dict(r) for r in rows[:max_rows]]
            return colnames, dict_rows
        finally:
            await conn.close()

    if ct == "MYSQL":
        colnames, dict_rows = await _run_sync(
            _mysql_sync_query,
            config["host"],
            config.get("port", 3306),
            config["database"],
            config["user"],
            config["password"],
            sql,
            max_rows,
        )
        return colnames, dict_rows

    if ct == "SNOWFLAKE":
        colnames, dict_rows = await _run_sync(_snowflake_query, config, sql, max_rows)
        return colnames, dict_rows

    if ct == "BIGQUERY":
        colnames, dict_rows = await _run_sync(_bigquery_query, config, sql, max_rows)
        return colnames, dict_rows

    if ct == "DATABRICKS":
        colnames, dict_rows = await _run_sync(_databricks_query, config, sql, max_rows)
        return colnames, dict_rows

    if ct == "SQLSERVER":
        colnames, dict_rows = await _run_sync(_sqlserver_query, config, sql, max_rows)
        return colnames, dict_rows

    if ct == "REDSHIFT":
        colnames, dict_rows = await _run_sync(_redshift_query, config, sql, max_rows)
        return colnames, dict_rows

    raise ValueError(f"Unsupported connection type: {conn_type}")
