"""Conversational answers about scanned connection metadata (no SQL execution)."""

from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from app.config import get_settings
from app.services.llm_provider import resolve_provider

CHAT_SYSTEM = """You are DataWhisper, a friendly data analyst assistant.

The user is asking about their database connection. You receive **scanned metadata only** (table names, columns, row counts, small samples). You do NOT have live query results unless row_count or sample_rows are in the payload.

## Rules
1. Answer in clear, helpful prose for a business user (2–8 short paragraphs or bullets). No SQL unless the user explicitly asked for SQL.
2. Use ONLY facts from the provided metadata. Do not invent table names, columns, or row counts.
3. If row_count is null for a table, say it was not captured at scan time.
4. Mention how many tables exist, highlight notable tables (largest row_count, fact/dimension tags if present), and what kinds of questions they can ask next.
5. Do NOT tell them to run UNION ALL queries or generate SQL yourself — suggest natural follow-ups like "Show 10 rows from X" or "Count rows per table".
6. If lineage/FK info is sparse, say joins may be limited and single-table questions work best.
7. No markdown code fences. Plain text or simple bullets only.

Output JSON: {"answer": "<your response>", "suggested_followups": ["question 1", "question 2", ...]} with 2–4 short follow-up questions."""


def _compact_metadata(meta: dict[str, Any], lineage: dict[str, Any]) -> dict[str, Any]:
    tables_in = meta.get("tables") or []
    tables_out: list[dict[str, Any]] = []
    for t in tables_in[:40]:
        if not isinstance(t, dict) or not t.get("name"):
            continue
        cols = t.get("columns") or []
        tables_out.append(
            {
                "name": t["name"],
                "row_count": t.get("row_count"),
                "column_count": len(cols),
                "columns": [
                    {
                        "name": c.get("name"),
                        "type": c.get("type"),
                        "semantic": c.get("semantic"),
                    }
                    for c in cols[:25]
                    if isinstance(c, dict) and c.get("name")
                ],
                "sample_rows": (t.get("sample_rows") or [])[:2],
            }
        )
    return {
        "engine": meta.get("engine"),
        "tables_visible": len(tables_in),
        "tables": tables_out,
        "truncated": len(tables_in) > 40,
        "fact_tables": lineage.get("fact_tables") or [],
        "dimension_tables": lineage.get("dimension_tables") or [],
        "lineage_edges": len(lineage.get("edges") or []),
    }


def _format_catalog_answer(meta: dict[str, Any]) -> tuple[str, list[str]]:
    tables = [t for t in meta.get("tables", []) if isinstance(t, dict) and t.get("name")]
    if not tables:
        return "No tables were found in the last metadata scan for this connection.", []
    lines = [f"This connection has {len(tables)} scanned table(s):\n"]
    for t in tables[:30]:
        name = str(t["name"])
        rc = t.get("row_count")
        rc_s = f" (~{rc:,} rows)" if isinstance(rc, int) else ""
        ncol = len(t.get("columns") or [])
        lines.append(f"• {name}{rc_s} — {ncol} columns")
    if len(tables) > 30:
        lines.append(f"\n…and {len(tables) - 30} more.")
    lines.append(
        "\nAsk me to explore data, e.g. \"Show 10 rows from <table>\" or "
        "\"Give me an overview of the data\" for a narrative summary."
    )
    followups = []
    if tables:
        short = tables[0]["name"].split(".")[-1]
        followups = [
            f"Show 10 rows from {short}",
            "Give me an overview of the data we have",
        ]
    return "\n".join(lines), followups


def answer_row_counts(meta: dict[str, Any]) -> dict[str, Any]:
    """Row counts from scan metadata — no warehouse query."""
    tables = [t for t in meta.get("tables", []) if isinstance(t, dict) and t.get("name")]
    if not tables:
        return {"answer": "No tables in the last metadata scan.", "suggested_followups": []}
    lines = ["Row counts from your last metadata scan:\n"]
    known = 0
    for t in sorted(tables, key=lambda x: str(x.get("name", ""))):
        name = str(t["name"])
        rc = t.get("row_count")
        if isinstance(rc, (int, float)):
            lines.append(f"• {name}: {int(rc):,} rows")
            known += 1
        else:
            lines.append(f"• {name}: (not captured at scan)")
    if known == 0:
        lines.append(
            "\nRe-run Scan metadata on Connections to refresh row counts, "
            "or ask: Show 10 rows from <table>."
        )
    else:
        lines.append(
            f"\n{known} of {len(tables)} table(s) have row counts. "
            "Counts reflect scan time, not live warehouse totals."
        )
    followups = ["Give me an overview of the data we have"]
    if tables:
        short = str(tables[0]["name"]).split(".")[-1]
        followups.append(f"Show 10 rows from {short}")
    return {"answer": "\n".join(lines), "suggested_followups": followups}


def answer_catalog(meta: dict[str, Any]) -> dict[str, Any]:
    text, followups = _format_catalog_answer(meta)
    return {"answer": text, "suggested_followups": followups}


def _chat_openai(settings: Any, user_content: str) -> dict[str, Any]:
    client = OpenAI(api_key=settings.openai_api_key)
    resp = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": CHAT_SYSTEM},
            {"role": "user", "content": user_content},
        ],
        temperature=0.35,
        response_format={"type": "json_object"},
    )
    return json.loads((resp.choices[0].message.content or "{}").strip())


def _chat_gemini(settings: Any, user_content: str) -> dict[str, Any]:
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        settings.gemini_model,
        system_instruction=CHAT_SYSTEM,
    )
    response = model.generate_content(
        user_content,
        generation_config=genai.GenerationConfig(
            temperature=0.35,
            response_mime_type="application/json",
        ),
    )
    return json.loads((response.text or "{}").strip())


def answer_from_metadata(
    question: str,
    meta: dict[str, Any],
    lineage: dict[str, Any],
    conversation_history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """LLM narrative answer using scanned metadata only."""
    settings = get_settings()
    payload: dict[str, Any] = {
        "user_question": question,
        "metadata_summary": _compact_metadata(meta, lineage),
    }
    if conversation_history:
        payload["conversation_history"] = conversation_history[-6:]

    try:
        provider = resolve_provider(settings)
    except RuntimeError:
        text, followups = _format_catalog_answer(meta)
        return {
            "answer": text + "\n\n(Configure OPENAI_API_KEY or GEMINI_API_KEY for richer answers.)",
            "suggested_followups": followups,
        }

    try:
        content = json.dumps(payload, default=str)
        if provider == "gemini":
            data = _chat_gemini(settings, content)
        else:
            data = _chat_openai(settings, content)
    except Exception:
        text, followups = _format_catalog_answer(meta)
        return {
            "answer": "I could not reach the AI service. Here is a quick summary from your last scan:\n\n" + text,
            "suggested_followups": followups,
        }

    answer = (data.get("answer") or "").strip()
    if not answer:
        text, followups = _format_catalog_answer(meta)
        return {"answer": text, "suggested_followups": followups}

    followups = data.get("suggested_followups") or []
    if not isinstance(followups, list):
        followups = []
    followups = [str(x).strip() for x in followups[:4] if str(x).strip()]

    return {"answer": answer, "suggested_followups": followups}
