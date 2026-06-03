"""Route user questions to conversational answers vs SQL execution."""

from __future__ import annotations

import re

from app.services.catalog_queries import is_catalog_list_intent

ChatMode = str  # auto | chat | query
Intent = str  # conversational | sql | catalog


_CONVERSATIONAL = re.compile(
    r"\b("
    r"what\s+(?:data|information|tables?|do\s+we\s+have|can\s+i\s+(?:ask|query|analyze))"
    r"|tell\s+me\s+about\s+(?:the\s+)?(?:data|database|tables?|schema|connection)"
    r"|give\s+me\s+(?:information|info|an?\s+overview|a\s+summary)\s+about"
    r"|describe\s+(?:the\s+)?(?:data|database|schema|tables?|connection)\b"
    r"|overview\s+of\s+(?:the\s+)?(?:data|database|schema|tables?)"
    r"|summarize\s+(?:the\s+)?(?:data|database|schema|tables?|connection)"
    r"|what\s+(?:is|are)\s+in\s+(?:this|the|our)\s+(?:database|connection|warehouse|data)"
    r"|help\s+me\s+understand\s+(?:the\s+)?(?:data|schema|database)"
    r"|explain\s+(?:the\s+)?(?:data|database|schema|tables?)\b"
    r"|what\s+(?:tables?|schemas?|datasets?)\s+(?:do\s+we\s+have|are\s+available|exist)"
    r"|information\s+about\s+(?:the\s+)?(?:data|database|tables?)"
    r")\b",
    re.IGNORECASE,
)

_METADATA_STATS = re.compile(
    r"\b("
    r"how\s+many\s+rows?"
    r"|row\s+counts?"
    r"|number\s+of\s+rows?"
    r"|table\s+sizes?"
    r"|rows?\s+per\s+table"
    r"|count\s+rows?\s+(?:in|for|per)\s+(?:each\s+)?tables?"
    r")\b",
    re.IGNORECASE,
)

_SQL_STRONG = re.compile(
    r"\b("
    r"show\s+\d+\s+rows?"
    r"|select\b"
    r"|count\s*\("
    r"|\bcount\b.*\bfrom\b"
    r"|\bhow\s+many\b"
    r"|\bsum\b|\bavg\b|\baverage\b|\bmin\b|\bmax\b"
    r"|top\s+\d+|bottom\s+\d+"
    r"|group\s+by\b"
    r"|rows?\s+from\b"
    r"|per\s+(?:day|week|month|year|region|category)"
    r"|chart\b|graph\b|plot\b|trend\b"
    r"|compare\b|breakdown\b|distribution\b"
    r"|filter\b|where\s+\w+\s*="
    r"|last\s+(?:month|week|year|quarter|7\s+days)"
    r"|this\s+(?:month|week|year|quarter)"
    r"|download\b|export\b|csv\b"
    r"|run\s+(?:a\s+)?query\b"
    r"|total\s+\w+\s+by\b"
    r")\b",
    re.IGNORECASE,
)


def classify_intent(question: str, chat_mode: str = "auto") -> Intent:
    """
    Decide how to answer a question.

    - catalog: list tables/schemas from scanned metadata
    - conversational: prose answer from metadata (no warehouse query)
    - sql: generate and run read-only SQL
    """
    mode = (chat_mode or "auto").lower().strip()
    if mode not in ("auto", "chat", "query"):
        mode = "auto"

    if mode == "query":
        return "sql"
    if mode == "chat":
        if is_catalog_list_intent(question):
            return "catalog"
        return "conversational"

    # auto
    if is_catalog_list_intent(question):
        return "catalog"
    if _METADATA_STATS.search(question):
        return "conversational"
    if _SQL_STRONG.search(question):
        return "sql"
    if _CONVERSATIONAL.search(question):
        return "conversational"
    return "sql"
