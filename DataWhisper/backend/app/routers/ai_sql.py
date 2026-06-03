from typing import Any

from fastapi import APIRouter, Depends, HTTPException

import logging

from app.db import prisma
from app.deps import require_sql_runner
from app.services.audit import log_audit
from app.services.rate_limiter import check_ai_rate
from app.schemas.execute import AiSqlRequest, AiSqlResponse
from app.services.ai_generator import explain_sql, generate_sql
from app.services.confidence import compute_confidence
from app.services.metadata_chat import answer_catalog, answer_from_metadata, answer_row_counts
from app.services.query_intent import _METADATA_STATS
from app.services.query_intent import classify_intent
from app.services.data_scope import apply_ai_data_scope
from app.services.lineage_read import get_merged_edges_from_mv
from app.services.sql_validator import validate_sql
from app.services.usage_tracking import record_ai_generation
from app.utils.encrypt import decrypt_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

MAX_RETRIES = 5


def _json_dict(val: Any) -> dict:
    return val if isinstance(val, dict) else {}


@router.post("/generate", response_model=AiSqlResponse)
async def generate_ai_sql(body: AiSqlRequest, user=Depends(require_sql_runner)):
    check_ai_rate(str(user.workspaceId))
    conn = await prisma.dbconnection.find_first(
        where={"id": str(body.connection_id), "workspaceId": str(user.workspaceId)}
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    mv = await prisma.metadataversion.find_first(
        where={"connectionId": str(conn.id)},
        order={"version": "desc"},
        include={"lineageEdges": True},
    )
    if not mv:
        raise HTTPException(status_code=400, detail="Run a metadata scan for this connection first.")

    await record_ai_generation(str(user.id), str(user.workspaceId))

    meta = _json_dict(mv.metadataJson)
    db_edges = get_merged_edges_from_mv(mv)
    conn_cfg = decrypt_json(conn.encryptedConfig)

    code_node_dicts: list[dict] = []
    try:
        code_nodes_raw = await prisma.codelineagenode.find_many(
            where={"crawlSource": {"is": {"workspaceId": str(user.workspaceId)}}},
            take=500,
        )
        code_node_dicts = [
            {
                "id": n.id,
                "node_type": n.nodeType,
                "node_name": n.nodeName,
                "source_file": n.sourceFile,
                "environment": n.environment,
                "parent_node_id": n.parentNodeId,
            }
            for n in code_nodes_raw
        ]
    except Exception as e:
        logger.debug("Code lineage load skipped: %s", e)

    try:
        meta, edges, scope_block = apply_ai_data_scope(meta, db_edges, conn_cfg, code_node_dicts)
    except Exception as e:
        logger.exception("apply_ai_data_scope failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to apply connection AI scope.") from e

    if not (meta.get("tables") or []):
        raise HTTPException(
            status_code=400,
            detail="No tables remain after applying ai_data_scope on this connection. "
            "Relax allowed_table_prefixes or blocked_name_substrings, then scan again.",
        )

    allowed_names = {t["name"] for t in meta.get("tables", []) if isinstance(t, dict) and t.get("name")}
    facts = list(mv.factTables) if isinstance(mv.factTables, list) else []
    dims = list(mv.dimensionTables) if isinstance(mv.dimensionTables, list) else []
    facts_f = [f for f in facts if isinstance(f, str) and f in allowed_names]
    dims_f = [d for d in dims if isinstance(d, str) and d in allowed_names]

    code_lineage_edges = [
        {
            "from": e.get("from_table"),
            "to": e.get("to_table"),
            "source": "code",
            "environment": e.get("environment", "UNKNOWN"),
            "source_file": e.get("source_file"),
            "node_type": e.get("node_type"),
        }
        for e in edges
        if e.get("source") == "code"
    ]

    edges_core = [
        {k: e[k] for k in ("from_table", "to_table", "fk_column", "referenced_column") if k in e}
        for e in edges
    ]
    lineage: dict = {
        "edges": edges,
        "adjacency": _json_dict(mv.lineageAdjacency),
        "fact_tables": facts_f,
        "dimension_tables": dims_f,
        "data_scope": scope_block,
    }
    if code_lineage_edges:
        lineage["code_lineage"] = code_lineage_edges

    conv_history = None
    if body.conversation_history:
        conv_history = [t.model_dump() for t in body.conversation_history]

    intent = classify_intent(body.question, body.chat_mode)

    if intent == "catalog":
        catalog_ans = answer_catalog(meta)
        await log_audit(
            str(user.workspaceId),
            str(user.id),
            "ai.chat_answer",
            resource_type="connection",
            resource_id=str(body.connection_id),
            detail={"intent": "catalog", "chat_mode": body.chat_mode},
        )
        return AiSqlResponse(
            response_mode="catalog",
            answer=catalog_ans["answer"],
            suggested_followups=catalog_ans.get("suggested_followups"),
            confidence=0.95,
            clarification_needed=False,
            retry_attempts=0,
        )

    if intent == "conversational":
        if is_metadata_stats_intent(body.question):
            conv = answer_row_counts(meta)
        else:
            conv = answer_from_metadata(body.question, meta, lineage, conv_history)
        await log_audit(
            str(user.workspaceId),
            str(user.id),
            "ai.chat_answer",
            resource_type="connection",
            resource_id=str(body.connection_id),
            detail={"intent": "conversational", "chat_mode": body.chat_mode},
        )
        return AiSqlResponse(
            response_mode="answer",
            answer=conv["answer"],
            suggested_followups=conv.get("suggested_followups"),
            confidence=0.88,
            clarification_needed=False,
            retry_attempts=0,
        )

    validation_errors: list[dict[str, Any]] | None = None
    last_sql = ""
    attempts = 0
    for attempt in range(MAX_RETRIES):
        attempts = attempt + 1
        try:
            out = generate_sql(body.question, meta, lineage, validation_errors, conv_history)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI generation failed: {e}") from e
        if out.get("clarification_needed"):
            return AiSqlResponse(
                response_mode="sql",
                clarification_needed=True,
                message=out.get("message"),
                retry_attempts=attempts,
            )
        sql = out["sql"]
        last_sql = sql
        ok, errs = validate_sql(sql, meta, edges_core)
        conf = compute_confidence(sql, meta, edges_core, ok, errs)
        if ok:
            expl = ""
            try:
                expl = explain_sql(sql, meta)
            except Exception:
                expl = ""
            await log_audit(
                str(user.workspaceId),
                str(user.id),
                "ai.generate_sql",
                resource_type="connection",
                resource_id=str(body.connection_id),
                detail={"attempts": attempts, "confidence": conf},
            )
            return AiSqlResponse(
                response_mode="sql",
                sql=sql,
                explanation=expl or None,
                confidence=conf,
                clarification_needed=False,
                retry_attempts=attempts,
            )
        validation_errors = errs

    fail_conf = compute_confidence(last_sql or "", meta, edges_core, False, validation_errors or [])
    return AiSqlResponse(
        response_mode="sql",
        clarification_needed=True,
        message="Could not produce valid SQL after automatic retries. "
        + "; ".join(f"{e.get('code', 'ERR')}: {e.get('message', '')}" for e in (validation_errors or [])),
        sql=last_sql or None,
        confidence=fail_conf,
        validation_errors=validation_errors,
        retry_attempts=attempts,
    )
