import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import asyncpg
import pymysql

from app.services.semantic_tagging import apply_semantic_to_metadata

_pool = ThreadPoolExecutor(max_workers=4)


def _json_safe_sample(rows: list) -> list[dict]:
    """Coerce sample row values to JSON-serialisable types."""
    from datetime import date, datetime
    from decimal import Decimal
    from uuid import UUID

    safe: list[dict] = []
    for row in rows:
        d = dict(row) if not isinstance(row, dict) else row
        out: dict = {}
        for k, v in d.items():
            if isinstance(v, (datetime, date)):
                out[k] = v.isoformat()
            elif isinstance(v, Decimal):
                out[k] = float(v)
            elif isinstance(v, UUID):
                out[k] = str(v)
            elif isinstance(v, bytes):
                out[k] = v.decode("utf-8", errors="replace")
            elif isinstance(v, memoryview):
                out[k] = bytes(v).decode("utf-8", errors="replace")
            else:
                out[k] = v
        safe.append(out)
    return safe


def _run_sync(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(_pool, lambda: fn(*args, **kwargs))


async def _sample_rows_postgres(conn: asyncpg.Connection, schema: str, table: str, limit: int = 5) -> list[dict]:
    ident = f'"{schema}"."{table}"'
    try:
        rows = await conn.fetch(f"SELECT * FROM {ident} LIMIT {int(limit)}")
        return [dict(r) for r in rows]
    except Exception:
        return []


async def scan_postgres(config: dict[str, Any]) -> dict[str, Any]:
    ssl = None if config.get("sslmode") == "disable" else True
    conn = await asyncpg.connect(
        host=config["host"],
        port=int(config.get("port", 5432)),
        user=config["user"],
        password=config["password"],
        database=config["database"],
        ssl=ssl,
        timeout=60,
    )
    try:
        schemas = await conn.fetch(
            """
            SELECT table_schema FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
              AND table_schema NOT IN ('pg_catalog', 'information_schema')
            GROUP BY table_schema
            ORDER BY table_schema
            """
        )
        schema_list = [r["table_schema"] for r in schemas]
        tables_out: list[dict[str, Any]] = []
        for schema in schema_list:
            trows = await conn.fetch(
                """
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = $1 AND table_type = 'BASE TABLE'
                ORDER BY table_name
                """,
                schema,
            )
            for tr in trows:
                tname = tr["table_name"]
                full = f"{schema}.{tname}"
                cols = await conn.fetch(
                    """
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = $1 AND table_name = $2
                    ORDER BY ordinal_position
                    """,
                    schema,
                    tname,
                )
                pk = await conn.fetch(
                    """
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_schema = $1 AND tc.table_name = $2
                    ORDER BY kcu.ordinal_position
                    """,
                    schema,
                    tname,
                )
                fks = await conn.fetch(
                    """
                    SELECT
                      kcu.column_name,
                      ccu.table_schema AS ref_schema,
                      ccu.table_name AS ref_table,
                      ccu.column_name AS ref_column
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage ccu
                      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_schema = $1 AND tc.table_name = $2
                    """,
                    schema,
                    tname,
                )
                sample = _json_safe_sample(await _sample_rows_postgres(conn, schema, tname, 5))
                row_count = None
                try:
                    rc = await conn.fetchval(f'SELECT COUNT(*) FROM "{schema}"."{tname}"')
                    row_count = int(rc) if rc is not None else None
                except Exception:
                    row_count = None
                tables_out.append(
                    {
                        "name": full,
                        "columns": [
                            {"name": c["column_name"], "type": c["data_type"], "nullable": c["is_nullable"] == "YES"}
                            for c in cols
                        ],
                        "primary_key": [r["column_name"] for r in pk],
                        "foreign_keys": [
                            {
                                "columns": [r["column_name"]],
                                "referenced_table": f'{r["ref_schema"]}.{r["ref_table"]}',
                                "referenced_columns": [r["ref_column"]],
                            }
                            for r in fks
                        ],
                        "sample_rows": sample,
                        "row_count": row_count,
                    }
                )
        return {"engine": "postgres", "tables": tables_out}
    finally:
        await conn.close()


def _scan_mysql_sync(config: dict[str, Any]) -> dict[str, Any]:
    conn = pymysql.connect(
        host=config["host"],
        port=int(config.get("port", 3306)),
        user=config["user"],
        password=config["password"],
        database=config["database"],
        cursorclass=pymysql.cursors.DictCursor,
    )
    tables_out: list[dict[str, Any]] = []
    try:
        with conn.cursor() as cur:
            cur.execute("SHOW TABLES")
            trows = cur.fetchall()
            key = list(trows[0].keys())[0] if trows else "Tables_in_" + config["database"]
            for row in trows:
                tname = row[key]
                full = f"{config['database']}.{tname}"
                cur.execute(f"DESCRIBE `{tname}`")
                desc = cur.fetchall()
                cols = []
                for d in desc:
                    cols.append(
                        {
                            "name": d["Field"],
                            "type": d["Type"],
                            "nullable": d["Null"] == "YES",
                        }
                    )
                cur.execute(
                    """
                    SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND CONSTRAINT_NAME = 'PRIMARY'
                    ORDER BY ORDINAL_POSITION
                    """,
                    (config["database"], tname),
                )
                pk = [r["COLUMN_NAME"] for r in cur.fetchall()]
                cur.execute(
                    """
                    SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND REFERENCED_TABLE_NAME IS NOT NULL
                    """,
                    (config["database"], tname),
                )
                fk_rows = cur.fetchall()
                foreign_keys = [
                    {
                        "columns": [r["COLUMN_NAME"]],
                        "referenced_table": f"{config['database']}.{r['REFERENCED_TABLE_NAME']}",
                        "referenced_columns": [r["REFERENCED_COLUMN_NAME"]],
                    }
                    for r in fk_rows
                ]
                sample = []
                try:
                    cur.execute(f"SELECT * FROM `{tname}` LIMIT 5")
                    sample = _json_safe_sample(cur.fetchall())
                except Exception:
                    sample = []
                row_count = None
                try:
                    cur.execute(f"SELECT COUNT(*) AS cnt FROM `{tname}`")
                    rc = cur.fetchone()
                    row_count = rc.get("cnt") or rc.get("COUNT(*)") if rc else None
                except Exception:
                    row_count = None
                tables_out.append(
                    {
                        "name": full,
                        "columns": cols,
                        "primary_key": pk,
                        "foreign_keys": foreign_keys,
                        "sample_rows": sample,
                        "row_count": row_count,
                    }
                )
        return {"engine": "mysql", "tables": tables_out}
    finally:
        conn.close()


def _scan_snowflake_sync(config: dict[str, Any]) -> dict[str, Any]:
    from snowflake import connector as sf

    conn = sf.connect(
        user=config["user"],
        password=config.get("password") or "",
        account=config["account"],
        warehouse=config.get("warehouse"),
        database=config.get("database"),
        schema=config.get("schema") or "PUBLIC",
        role=config.get("role"),
    )
    tables_out: list[dict[str, Any]] = []
    db = config.get("database") or ""
    schema = config.get("schema") or "PUBLIC"
    try:
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT TABLE_SCHEMA, TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = '{db}' AND TABLE_SCHEMA = '{schema}'
            ORDER BY TABLE_NAME
            """
        )
        for ts, tn in cur.fetchall():
            full = f"{ts}.{tn}"
            cur.execute(
                f"""
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_CATALOG = '{db}' AND TABLE_SCHEMA = '{ts}' AND TABLE_NAME = '{tn}'
                ORDER BY ORDINAL_POSITION
                """
            )
            cols = [{"name": r[0], "type": r[1], "nullable": r[2] == "YES"} for r in cur.fetchall()]
            cur.execute(
                f"""
                SELECT kcu.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                  ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                  AND tc.TABLE_CATALOG = '{db}' AND tc.TABLE_SCHEMA = '{ts}' AND tc.TABLE_NAME = '{tn}'
                ORDER BY kcu.ORDINAL_POSITION
                """
            )
            pk = [r[0] for r in cur.fetchall()]
            cur.execute(
                f"""
                SELECT kcu.COLUMN_NAME, ccu.TABLE_SCHEMA AS rs, ccu.TABLE_NAME AS rt, ccu.COLUMN_NAME AS rc
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                  ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                  ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
                WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
                  AND tc.TABLE_CATALOG = '{db}' AND tc.TABLE_SCHEMA = '{ts}' AND tc.TABLE_NAME = '{tn}'
                """
            )
            foreign_keys = [
                {
                    "columns": [r[0]],
                    "referenced_table": f"{r[1]}.{r[2]}",
                    "referenced_columns": [r[3]],
                }
                for r in cur.fetchall()
            ]
            sample = []
            try:
                cur.execute(f'SELECT * FROM "{ts}"."{tn}" LIMIT 5')
                sample = _json_safe_sample(
                    [dict(zip([d[0] for d in cur.description], row, strict=False)) for row in cur.fetchall()]
                )
            except Exception:
                sample = []
            row_count = None
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{ts}"."{tn}"')
                row_count = cur.fetchone()[0]
            except Exception:
                row_count = None
            tables_out.append(
                {
                    "name": full,
                    "columns": cols,
                    "primary_key": pk,
                    "foreign_keys": foreign_keys,
                    "sample_rows": sample,
                    "row_count": row_count,
                }
            )
        cur.close()
        return {"engine": "snowflake", "tables": tables_out}
    finally:
        conn.close()


def _scan_bigquery_sync(config: dict[str, Any]) -> dict[str, Any]:
    from google.cloud import bigquery
    from google.oauth2 import service_account

    sa_info = json.loads(config["service_account_json"])
    creds = service_account.Credentials.from_service_account_info(sa_info)
    project = config.get("project_id") or sa_info.get("project_id")
    dataset_id = config.get("dataset")
    if not dataset_id:
        return {"engine": "bigquery", "tables": []}
    client = bigquery.Client(project=project, credentials=creds)
    tables_out: list[dict[str, Any]] = []
    ds_ref = f"{project}.{dataset_id}"
    try:
        table_iter = client.list_tables(ds_ref)
    except Exception:
        return {"engine": "bigquery", "tables": []}
    for t in table_iter:
        tname = t.table_id
        full = f"{project}.{dataset_id}.{tname}"
        table = client.get_table(f"{ds_ref}.{tname}")
        cols = [{"name": f.name, "type": f.field_type, "nullable": f.is_nullable == "NULLABLE"} for f in table.schema]
        fk_meta: list[dict] = []
        try:
            tc = getattr(table, "table_constraints", None)
            fks = getattr(tc, "foreign_keys", None) if tc else None
            if fks:
                for fk in fks:
                    fk_meta.append(
                        {
                            "columns": list(getattr(fk, "column_references", {}).keys())
                            if hasattr(fk, "column_references")
                            else [],
                            "referenced_table": str(getattr(fk, "referenced_table", "")),
                            "referenced_columns": [],
                        }
                    )
        except Exception:
            fk_meta = []
        sample = []
        try:
            job = client.query(f"SELECT * FROM `{ds_ref}.{tname}` LIMIT 5")
            sample = _json_safe_sample([dict(row) for row in job.result()])
        except Exception:
            sample = []
        row_count = table.num_rows
        tables_out.append(
            {
                "name": full,
                "columns": cols,
                "primary_key": [f.name for f in table.schema if getattr(f, "mode", None) == "REQUIRED"][:1],
                "foreign_keys": fk_meta,
                "sample_rows": sample,
                "row_count": row_count,
            }
        )
    return {"engine": "bigquery", "tables": tables_out}


def _scan_databricks_sync(config: dict[str, Any]) -> dict[str, Any]:
    from databricks import sql as dbsql

    conn = dbsql.connect(
        server_hostname=config["host"],
        http_path=config["http_path"],
        access_token=config["token"],
    )
    catalog = config.get("catalog", "hive_metastore")
    schema = config.get("schema", "default")
    tables_out: list[dict[str, Any]] = []
    try:
        cur = conn.cursor()
        cur.execute(f"SHOW TABLES IN {catalog}.{schema}")
        rows = cur.fetchall()
        for row in rows:
            tname = row[1] if len(row) > 1 else row[0]
            full = f"{catalog}.{schema}.{tname}"
            cols = []
            try:
                cur.execute(f"DESCRIBE TABLE {catalog}.{schema}.{tname}")
                for r in cur.fetchall():
                    if isinstance(r, (list, tuple)) and len(r) >= 2:
                        cols.append({"name": r[0], "type": str(r[1]), "nullable": True})
            except Exception:
                cols = []
            sample = []
            try:
                cur.execute(f"SELECT * FROM {catalog}.{schema}.{tname} LIMIT 5")
                colnames = [c[0] for c in cur.description] if cur.description else []
                sample = _json_safe_sample(
                    [dict(zip(colnames, rr, strict=False)) for rr in cur.fetchall()]
                )
            except Exception:
                sample = []
            row_count = None
            try:
                cur.execute(f"SELECT COUNT(*) FROM {catalog}.{schema}.{tname}")
                row_count = cur.fetchone()[0]
            except Exception:
                row_count = None
            tables_out.append(
                {
                    "name": full,
                    "columns": cols,
                    "primary_key": [],
                    "foreign_keys": [],
                    "sample_rows": sample,
                    "row_count": row_count,
                }
            )
        cur.close()
        return {"engine": "databricks", "tables": tables_out}
    finally:
        conn.close()


def _scan_sqlserver_sync(config: dict[str, Any]) -> dict[str, Any]:
    import pymssql

    conn = pymssql.connect(
        server=config["host"],
        port=int(config.get("port", 1433)),
        user=config["user"],
        password=config["password"],
        database=config["database"],
        timeout=120,
    )
    tables_out: list[dict[str, Any]] = []
    try:
        with conn.cursor(as_dict=True) as cur:
            cur.execute(
                """
                SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
                  AND TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA', 'guest')
                ORDER BY TABLE_SCHEMA, TABLE_NAME
                """
            )
            for row in cur.fetchall() or []:
                schema = row.get("TABLE_SCHEMA") or row.get("table_schema")
                tname = row.get("TABLE_NAME") or row.get("table_name")
                full = f"{schema}.{tname}"
                cur.execute(
                    """
                    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
                    ORDER BY ORDINAL_POSITION
                    """,
                    (schema, tname),
                )
                cols = [
                    {
                        "name": r.get("COLUMN_NAME") or r.get("column_name"),
                        "type": r.get("DATA_TYPE") or r.get("data_type"),
                        "nullable": (r.get("IS_NULLABLE") or r.get("is_nullable")) == "YES",
                    }
                    for r in (cur.fetchall() or [])
                ]
                cur.execute(
                    """
                    SELECT ku.COLUMN_NAME
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                      ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = ku.TABLE_SCHEMA
                    WHERE tc.TABLE_SCHEMA = %s AND tc.TABLE_NAME = %s AND tc.CONSTRAINT_TYPE = %s
                    ORDER BY ku.ORDINAL_POSITION
                    """,
                    (schema, tname, "PRIMARY KEY"),
                )
                pk = [r.get("COLUMN_NAME") or r.get("column_name") for r in (cur.fetchall() or [])]
                foreign_keys: list[dict[str, Any]] = []
                try:
                    cur.execute(
                        """
                        SELECT
                          parent_col.name AS col_name,
                          SCHEMA_NAME(ref_tab.schema_id) + '.' + ref_tab.name AS ref_full,
                          ref_col.name AS ref_col
                        FROM sys.foreign_key_columns fkc
                        JOIN sys.tables parent_tab ON parent_tab.object_id = fkc.parent_object_id
                        JOIN sys.columns parent_col
                          ON parent_col.object_id = fkc.parent_object_id AND parent_col.column_id = fkc.parent_column_id
                        JOIN sys.tables ref_tab ON ref_tab.object_id = fkc.referenced_object_id
                        JOIN sys.columns ref_col
                          ON ref_col.object_id = fkc.referenced_object_id AND ref_col.column_id = fkc.referenced_column_id
                        WHERE parent_tab.schema_id = SCHEMA_ID(%s) AND parent_tab.name = %s
                        """,
                        (schema, tname),
                    )
                    foreign_keys = [
                        {
                            "columns": [r.get("col_name") or r.get("Col_name")],
                            "referenced_table": r.get("ref_full") or r.get("Ref_full"),
                            "referenced_columns": [r.get("ref_col") or r.get("Ref_col")],
                        }
                        for r in (cur.fetchall() or [])
                    ]
                except Exception:
                    foreign_keys = []
                sample: list[dict[str, Any]] = []
                try:
                    cur.execute(f"SELECT TOP 5 * FROM [{schema}].[{tname}]")
                    sample = _json_safe_sample(cur.fetchall() or [])
                except Exception:
                    sample = []
                row_count = None
                try:
                    cur.execute(f"SELECT COUNT(*) AS cnt FROM [{schema}].[{tname}]")
                    rc = cur.fetchone()
                    row_count = (rc.get("cnt") or rc.get("CNT")) if rc else None
                except Exception:
                    row_count = None
                tables_out.append(
                    {
                        "name": full,
                        "columns": cols,
                        "primary_key": pk,
                        "foreign_keys": foreign_keys,
                        "sample_rows": sample,
                        "row_count": row_count,
                    }
                )
        return {"engine": "sqlserver", "tables": tables_out}
    finally:
        conn.close()


def _scan_redshift_sync(config: dict[str, Any]) -> dict[str, Any]:
    import redshift_connector

    conn = redshift_connector.connect(
        host=config["host"],
        port=int(config.get("port", 5439)),
        database=config["database"],
        user=config["user"],
        password=config["password"],
        timeout=120,
    )
    tables_out: list[dict[str, Any]] = []
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT table_schema, table_name FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
              AND table_schema NOT IN ('pg_catalog', 'information_schema', 'catalog_history')
            ORDER BY table_schema, table_name
            """
        )
        for schema, tname in cur.fetchall() or []:
            full = f"{schema}.{tname}"
            cur.execute(
                """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
                """,
                (schema, tname),
            )
            cols = [
                {"name": r[0], "type": r[1], "nullable": (r[2] == "YES")} for r in (cur.fetchall() or [])
            ]
            cur.execute(
                """
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                  AND tc.table_schema = %s AND tc.table_name = %s
                ORDER BY kcu.ordinal_position
                """,
                (schema, tname),
            )
            pk = [r[0] for r in (cur.fetchall() or [])]
            cur.execute(
                """
                SELECT kcu.column_name, ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage ccu
                  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = %s AND tc.table_name = %s
                """,
                (schema, tname),
            )
            fks = cur.fetchall() or []
            foreign_keys = [
                {
                    "columns": [r[0]],
                    "referenced_table": f"{r[1]}.{r[2]}",
                    "referenced_columns": [r[3]],
                }
                for r in fks
            ]
            sample = []
            try:
                cur.execute(f'SELECT * FROM "{schema}"."{tname}" LIMIT 5')
                desc = cur.description or []
                colnames = [getattr(c, "name", None) or (c[0] if c else "") for c in desc]
                colnames = [c for c in colnames if c]
                sample = _json_safe_sample(
                    [dict(zip(colnames, row, strict=False)) for row in (cur.fetchall() or [])]
                )
            except Exception:
                try:
                    cur.execute(f"SELECT * FROM {schema}.{tname} LIMIT 5")
                    desc = cur.description or []
                    colnames = [getattr(c, "name", None) or (c[0] if c else "") for c in desc]
                    colnames = [c for c in colnames if c]
                    sample = _json_safe_sample(
                        [dict(zip(colnames, row, strict=False)) for row in (cur.fetchall() or [])]
                    )
                except Exception:
                    sample = []
            row_count = None
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{schema}"."{tname}"')
                row_count = cur.fetchone()[0]
            except Exception:
                row_count = None
            tables_out.append(
                {
                    "name": full,
                    "columns": cols,
                    "primary_key": pk,
                    "foreign_keys": foreign_keys,
                    "sample_rows": sample,
                    "row_count": row_count,
                }
            )
        cur.close()
        return {"engine": "redshift", "tables": tables_out}
    finally:
        try:
            conn.close()
        except Exception:
            pass


async def scan_metadata(conn_type: str, config: dict[str, Any]) -> dict[str, Any]:
    ct = conn_type.upper()
    if ct == "POSTGRES":
        raw = await scan_postgres(config)
    elif ct == "MYSQL":
        raw = await _run_sync(_scan_mysql_sync, config)
    elif ct == "SNOWFLAKE":
        raw = await _run_sync(_scan_snowflake_sync, config)
    elif ct == "BIGQUERY":
        raw = await _run_sync(_scan_bigquery_sync, config)
    elif ct == "DATABRICKS":
        raw = await _run_sync(_scan_databricks_sync, config)
    elif ct == "SQLSERVER":
        raw = await _run_sync(_scan_sqlserver_sync, config)
    elif ct == "REDSHIFT":
        raw = await _run_sync(_scan_redshift_sync, config)
    else:
        raise ValueError(f"Unsupported type {conn_type}")
    return apply_semantic_to_metadata(raw)
