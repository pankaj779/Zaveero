import json
from typing import Any

from openai import OpenAI

from app.config import get_settings
from app.services.llm_provider import resolve_provider


def heuristic_insight(columns: list[str], rows: list[dict[str, Any]]) -> str:
    if not rows or not columns:
        return ""
    n = len(rows)
    if n == 1 and len(columns) <= 3:
        parts = [f"{c}: {rows[0].get(c)}" for c in columns[:3]]
        return "Single-row result: " + "; ".join(parts)
    num_cols = [c for c in columns if rows and isinstance(rows[0].get(c), (int, float))]
    if len(num_cols) >= 1 and n >= 2:
        col = num_cols[0]
        vals = [float(r[col]) for r in rows if r.get(col) is not None]
        if len(vals) >= 2:
            lo, hi = min(vals), max(vals)
            return f"Across {n} rows, `{col}` ranges from {lo:g} to {hi:g}."
    return f"Returned {n} row(s) with {len(columns)} column(s)."


def _insight_openai(settings: Any, question: str | None, columns: list[str], rows: list[dict[str, Any]]) -> str:
    client = OpenAI(api_key=settings.openai_api_key)
    sample = rows[: min(15, len(rows))]
    payload = {
        "question": question or "",
        "columns": columns,
        "sample_rows": sample,
        "row_count": len(rows),
    }
    r = client.chat.completions.create(
        model=settings.openai_model,
        temperature=0.3,
        messages=[
            {
                "role": "system",
                "content": (
                    "You summarize tabular query results for business users in 1–3 short sentences. "
                    "Do not invent numbers not present in sample_rows. If sample is partial, say so. "
                    "No markdown code fences."
                ),
            },
            {"role": "user", "content": json.dumps(payload, default=str)},
        ],
    )
    return (r.choices[0].message.content or "").strip()


def _insight_gemini(settings: Any, question: str | None, columns: list[str], rows: list[dict[str, Any]]) -> str:
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    sample = rows[: min(15, len(rows))]
    payload = {
        "question": question or "",
        "columns": columns,
        "sample_rows": sample,
        "row_count": len(rows),
    }
    model = genai.GenerativeModel(
        settings.gemini_model,
        system_instruction=(
            "You summarize tabular query results for business users in 1–3 short sentences. "
            "Do not invent numbers not present in sample_rows. If sample is partial, say so. "
            "No markdown code fences."
        ),
    )
    response = model.generate_content(
        json.dumps(payload, default=str),
        generation_config=genai.GenerationConfig(temperature=0.3),
    )
    return (response.text or "").strip()


def generate_insight(question: str | None, columns: list[str], rows: list[dict[str, Any]]) -> str:
    settings = get_settings()
    if not rows:
        return heuristic_insight(columns, rows)
    try:
        provider = resolve_provider(settings)
    except RuntimeError:
        return heuristic_insight(columns, rows)
    try:
        if provider == "gemini":
            text = _insight_gemini(settings, question, columns, rows)
        else:
            text = _insight_openai(settings, question, columns, rows)
        return text or heuristic_insight(columns, rows)
    except Exception:
        return heuristic_insight(columns, rows)
