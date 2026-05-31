import json
from typing import Any

from openai import OpenAI

from app.config import get_settings
from app.services.llm_provider import resolve_provider

SYSTEM_PROMPT = """You are DataWhisper's NL→SQL engine. Output ONE JSON object only. No markdown, no prose outside JSON.

## Absolute rules
1. READ-ONLY: Only SELECT, WITH, SHOW, DESCRIBE/DESC, EXPLAIN. Never DDL/DML.
2. SCHEMA-BOUND: Use EXACT table names from `metadata.tables[].name`. Copy them literally — including all schema/catalog prefixes. NEVER abbreviate or strip parts of the name.
   - Postgres/Redshift: `schema.table`
   - MySQL: `database.table`
   - Databricks/BigQuery: `catalog.schema.table`
   - Snowflake: `SCHEMA.TABLE`
3. DIALECT (check `metadata.engine`):
   - **databricks**: Spark SQL. Use backticks for identifiers. `LIMIT n` works on **SELECT/WITH only** — never on SHOW/DESCRIBE/EXPLAIN (Spark SHOW TABLES supports LIKE, not LIMIT).
   - **bigquery**: Backticks for tables. LIMIT on SELECT/WITH only.
   - **sqlserver**: [brackets]. Use SELECT TOP N (not LIMIT) on SELECT queries.
   - **mysql**: Backticks. LIMIT on SELECT/WITH only.
   - **postgres/redshift**: Double-quotes when needed. LIMIT on SELECT/WITH only.
   - **snowflake**: Double-quotes for case-sensitive ids. LIMIT on SELECT/WITH only.
   - When the user asks to **list tables**, **show tables**, or **what tables exist** in a schema/database:
     - Prefer a SELECT over `metadata.tables[]` names (filter by schema prefix from the question).
     - Do NOT use SHOW TABLES — the platform answers catalog questions from scanned metadata or information_schema SELECT.
   - For other exploratory SELECTs, append LIMIT 500 when missing.
4. LINEAGE-BOUND: Only JOIN tables connected by `lineage.edges`. If tables are NOT in lineage.edges, do NOT join them.
5. COLUMN SEMANTICS: The `semantic` tag (date, metric, id, text) is a hint from automatic type detection — it can be WRONG. A STRING column named "Value" or "Amount" likely holds numeric data. Use sample_rows to verify actual content. If a column name suggests a number (value, amount, price, count, total, revenue, cost, quantity, score, rate), treat it as numeric regardless of semantic tag.
6. BE DECISIVE: If the user's question can reasonably be answered from the available metadata, generate SQL. Do NOT ask for clarification unless the question is genuinely ambiguous.
7. UNCERTAINTY: Only set `clarification_needed` when truly ambiguous. Prefer generating SQL with your best guess over asking.
8. SUCCESS SHAPE:
   {"sql": "<single statement>", "clarification_needed": false}
   Append LIMIT 500 to exploratory data SELECTs only — never to SHOW, DESCRIBE, or EXPLAIN.

## CRITICAL: Data accuracy rules
- When user asks about a SPECIFIC table, ONLY query that table. Do NOT join with other tables unless the user explicitly asks.
- When user mentions a filter (e.g., "where month is Oct"), inspect sample_rows to understand the actual column values — they may be full month names ("October") not abbreviations ("Oct"). Match the filter to actual data values.
- STRING columns that hold numeric data: ALWAYS CAST them to numeric before SUM/AVG/MAX/MIN. Example: `CAST(column AS DOUBLE)` or `CAST(column AS DECIMAL(18,2))`.
- DISTINCT: When user says "distinct values", use SELECT DISTINCT on that column. For "sum of distinct values", use SUM(DISTINCT CAST(...)).
- Prefer row_count to estimate table size. Use sample_rows ONLY to understand column formats and actual values, NOT to extrapolate counts or sums.
- When tables have similar names (e.g., staging vs production), prefer tables WITHOUT "staging", "stg", "dev", "test", "tmp" in their name.

## Conversation context
If `conversation_history` is provided, use it to understand follow-up questions. E.g., "now filter by region" refers to the previous query's table. Carry forward the table/column context from prior turns.

## Metadata shape
- `metadata.tables[]`: { name, columns[{name,type,semantic}], primary_key, foreign_keys, sample_rows, row_count }
- `row_count`: total rows at scan time. A table may have millions even though sample_rows shows 3.
- `sample_rows`: small sample (3 rows) — use to understand actual data values and types, NOT full distribution.
- `lineage.edges[]`: { from_table, to_table, fk_column, referenced_column, source?, confidence?, environment? }
- `lineage.code_lineage[]`: (if present) code-derived edges. Each item may include `environment` (PRODUCTION, STAGING, DEV, UNKNOWN). Prefer PRODUCTION when the user asks for live or production data unless they specify otherwise.
- `lineage.data_scope`: (if present) When `active` is true, `metadata.tables` is already restricted to approved tables for this connection. ONLY use tables listed in `tables_visible_to_ai`. Do not assume any other tables exist.

Generate SQL. Be decisive."""


def build_user_prompt(
    question: str,
    metadata: dict[str, Any],
    lineage: dict[str, Any],
    validation_errors: list[dict[str, Any]] | None = None,
    conversation_history: list[dict[str, Any]] | None = None,
) -> str:
    payload: dict[str, Any] = {
        "user_question": question,
        "metadata": metadata,
        "lineage": lineage,
    }
    if conversation_history:
        payload["conversation_history"] = conversation_history
    if validation_errors:
        payload["previous_validation_failures"] = [
            {"code": e.get("code"), "message": e.get("message"), "detail": e.get("detail")}
            for e in validation_errors
        ]
        payload["instruction"] = (
            "Regenerate SQL that fixes ALL listed validation errors. "
            "Use only tables/columns from metadata and only joins allowed by lineage.edges."
        )
    return json.dumps(payload, default=str)


def _parse_sql_json_response(text: str) -> dict[str, Any]:
    data = json.loads(text)
    if data.get("clarification_needed"):
        return {
            "clarification_needed": True,
            "message": data.get("message", "Please clarify your question."),
        }
    sql = (data.get("sql") or "").strip()
    if not sql:
        return {
            "clarification_needed": True,
            "message": "Could not derive SQL from the question. Please rephrase or specify tables.",
        }
    return {"sql": sql, "clarification_needed": False}


def _generate_sql_openai(
    settings: Any,
    user_content: str,
) -> dict[str, Any]:
    client = OpenAI(api_key=settings.openai_api_key)
    resp = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.05,
        response_format={"type": "json_object"},
    )
    text = (resp.choices[0].message.content or "").strip()
    return _parse_sql_json_response(text)


def _generate_sql_gemini(
    settings: Any,
    user_content: str,
) -> dict[str, Any]:
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        settings.gemini_model,
        system_instruction=SYSTEM_PROMPT,
    )
    response = model.generate_content(
        user_content,
        generation_config=genai.GenerationConfig(
            temperature=0.05,
            response_mime_type="application/json",
        ),
    )
    text = (response.text or "").strip()
    return _parse_sql_json_response(text)


def generate_sql(
    question: str,
    metadata: dict[str, Any],
    lineage: dict[str, Any],
    validation_errors: list[dict[str, Any]] | None = None,
    conversation_history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    user_content = build_user_prompt(question, metadata, lineage, validation_errors, conversation_history)
    provider = resolve_provider(settings)
    if provider == "gemini":
        return _generate_sql_gemini(settings, user_content)
    return _generate_sql_openai(settings, user_content)


def _explain_openai(settings: Any, sql: str, metadata: dict[str, Any]) -> str:
    client = OpenAI(api_key=settings.openai_api_key)
    table_names = [t.get("name", "") for t in metadata.get("tables", [])]
    resp = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Explain the SQL in plain language for a business reader in 2–5 short sentences. "
                    "No markdown, no code blocks."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {"sql": sql, "known_tables": table_names},
                    default=str,
                ),
            },
        ],
        temperature=0.15,
    )
    return (resp.choices[0].message.content or "").strip()


def _explain_gemini(settings: Any, sql: str, metadata: dict[str, Any]) -> str:
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    table_names = [t.get("name", "") for t in metadata.get("tables", [])]
    model = genai.GenerativeModel(
        settings.gemini_model,
        system_instruction=(
            "Explain the SQL in plain language for a business reader in 2–5 short sentences. "
            "No markdown, no code blocks."
        ),
    )
    response = model.generate_content(
        json.dumps({"sql": sql, "known_tables": table_names}, default=str),
        generation_config=genai.GenerationConfig(temperature=0.15),
    )
    return (response.text or "").strip()


def explain_sql(sql: str, metadata: dict[str, Any]) -> str:
    settings = get_settings()
    try:
        provider = resolve_provider(settings)
    except RuntimeError:
        return "No LLM configured; unable to generate explanation."
    try:
        if provider == "gemini":
            return _explain_gemini(settings, sql, metadata)
        return _explain_openai(settings, sql, metadata)
    except Exception:
        return "Could not generate explanation."

