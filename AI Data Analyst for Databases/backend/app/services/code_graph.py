"""
Code-structure lineage engine.

Walks a cloned repository, parses every supported source file with **tree-sitter**
(via `tree_sitter_language_pack`), and extracts symbol-level lineage:

    MODULE → CLASS → METHOD     (containment, via parent_node_id)
    FUNCTION_A --CALLS--> FUNCTION_B          (CodeSymbolEdge)
    MODULE_X  --IMPORTS--> MODULE_Y           (CodeSymbolEdge)
    CLASS_A   --EXTENDS--> CLASS_B            (CodeSymbolEdge)
    FUNCTION  --INSTANTIATES--> CLASS         (CodeSymbolEdge)

The output is two lists that `crawl_runner` persists:

    nodes: [{ symbol_id, node_type, name, source_file, source_line, parent_symbol_id, metadata }]
    edges: [{ from_symbol, to_symbol, edge_type, source_file, source_line, metadata }]

Resolution strategy
-------------------
- Definitions resolve by symbol_id within the repo.
- Calls / inheritance / instantiation are resolved in two passes:
    1. *Local* — the same module's defs are checked first.
    2. *Imported* — names imported into the module map to the imported module's
       definitions when we have them.
  If neither resolves, the edge points at a *stub* node (`EXTERNAL`) with the
  textual name preserved so the UI can still show the relationship.

Languages supported (one query template per language id):
    python, javascript, typescript, tsx, java, go, ruby, rust, c_sharp, php,
    c, cpp, kotlin, scala, swift, lua, bash

Other languages parse fine via tree-sitter but won't yield rich nodes; we still
emit a MODULE node so they appear on the file map.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Language detection
# ---------------------------------------------------------------------------

EXT_TO_LANG: dict[str, str] = {
    ".py": "python", ".pyi": "python", ".pyw": "python",
    ".js": "javascript", ".mjs": "javascript", ".cjs": "javascript", ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".java": "java",
    ".go": "go",
    ".rb": "ruby",
    ".rs": "rust",
    ".cs": "csharp",
    ".php": "php",
    ".c": "c", ".h": "c",
    ".cc": "cpp", ".cpp": "cpp", ".cxx": "cpp", ".hpp": "cpp", ".hh": "cpp",
    ".kt": "kotlin", ".kts": "kotlin",
    ".scala": "scala", ".sc": "scala",
    ".swift": "swift",
    ".lua": "lua",
    ".sh": "bash", ".bash": "bash", ".zsh": "bash",
}

# Directories that explode file counts with zero lineage value.
SKIP_DIR_NAMES = {
    "node_modules", "bower_components", "jspm_packages",
    ".venv", "venv", "env", ".env", ".pyenv",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox",
    "site-packages", "dist", "build", "out", ".next", ".nuxt", ".cache",
    "target", ".gradle", ".m2",
    "vendor", "Pods",
    "coverage", ".nyc_output",
    ".terraform", ".serverless",
    ".idea", ".vscode", ".vs",
    ".git",
}

MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB per file
MAX_FILES = 5_000                # hard cap so a 50k-file repo doesn't melt the worker


# ---------------------------------------------------------------------------
# Tree-sitter queries
# ---------------------------------------------------------------------------
#
# Each language gets a single query string with **named captures** that the
# extractor switches on. We intentionally use a tiny, robust set of captures so
# we don't fight every grammar's quirks:
#
#     @class.def     – class definition
#     @class.name    – the name node of that class
#     @class.base    – base class identifier(s)
#     @func.def      – function/method definition (free function)
#     @func.name     – function name
#     @method.def    – method definition (inside class — used when grammar
#                      distinguishes them; otherwise everything is @func.def)
#     @method.name   – method name
#     @call          – a call expression
#     @call.name     – the called identifier (or `obj.method`)
#     @import        – an import statement
#     @import.path   – the imported module / package path text
#     @import.name   – named import (`from x import y` → y)
#     @new           – `new ClassName(...)` style instantiation
#     @new.name      – the class being instantiated
#
# Only @class.def / @func.def / @method.def / @call / @import are required —
# everything else is optional and gracefully missing.

QUERIES: dict[str, str] = {
    "python": r"""
        (class_definition name: (identifier) @class.name
            superclasses: (argument_list (identifier) @class.base)?) @class.def
        (function_definition name: (identifier) @func.name) @func.def
        (call function: [(identifier) @call.name
                         (attribute attribute: (identifier) @call.name)]) @call
        (import_statement name: (dotted_name) @import.path) @import
        (import_from_statement
            module_name: (dotted_name)? @import.path
            name: (dotted_name (identifier) @import.name)) @import
    """,
    "javascript": r"""
        (class_declaration name: (identifier) @class.name
            (class_heritage (identifier) @class.base)?) @class.def
        (function_declaration name: (identifier) @func.name) @func.def
        (method_definition name: (property_identifier) @method.name) @method.def
        (call_expression function: [(identifier) @call.name
                                    (member_expression property: (property_identifier) @call.name)]) @call
        (new_expression constructor: (identifier) @new.name) @new
        (import_statement source: (string) @import.path) @import
    """,
    "typescript": r"""
        (class_declaration name: (type_identifier) @class.name
            (class_heritage (extends_clause value: (identifier) @class.base))?) @class.def
        (function_declaration name: (identifier) @func.name) @func.def
        (method_definition name: (property_identifier) @method.name) @method.def
        (interface_declaration name: (type_identifier) @class.name) @class.def
        (call_expression function: [(identifier) @call.name
                                    (member_expression property: (property_identifier) @call.name)]) @call
        (new_expression constructor: (identifier) @new.name) @new
        (import_statement source: (string) @import.path) @import
    """,
    # tsx grammar is mostly identical to typescript
    "tsx": r"""
        (class_declaration name: (type_identifier) @class.name) @class.def
        (function_declaration name: (identifier) @func.name) @func.def
        (method_definition name: (property_identifier) @method.name) @method.def
        (call_expression function: [(identifier) @call.name
                                    (member_expression property: (property_identifier) @call.name)]) @call
        (new_expression constructor: (identifier) @new.name) @new
        (import_statement source: (string) @import.path) @import
    """,
    "java": r"""
        (class_declaration name: (identifier) @class.name
            (superclass (type_identifier) @class.base)?) @class.def
        (interface_declaration name: (identifier) @class.name) @class.def
        (method_declaration name: (identifier) @method.name) @method.def
        (method_invocation name: (identifier) @call.name) @call
        (object_creation_expression type: (type_identifier) @new.name) @new
        (import_declaration (scoped_identifier) @import.path) @import
    """,
    "go": r"""
        (type_declaration (type_spec name: (type_identifier) @class.name
            type: (struct_type))) @class.def
        (type_declaration (type_spec name: (type_identifier) @class.name
            type: (interface_type))) @class.def
        (function_declaration name: (identifier) @func.name) @func.def
        (method_declaration name: (field_identifier) @method.name) @method.def
        (call_expression function: [(identifier) @call.name
                                    (selector_expression field: (field_identifier) @call.name)]) @call
        (import_spec path: (interpreted_string_literal) @import.path) @import
    """,
    "ruby": r"""
        (class name: [(constant) @class.name
                      (scope_resolution name: (constant) @class.name)]
               superclass: (superclass (constant) @class.base)?) @class.def
        (module name: (constant) @class.name) @class.def
        (method name: (identifier) @func.name) @func.def
        (singleton_method name: (identifier) @method.name) @method.def
        (call method: (identifier) @call.name) @call
    """,
    "rust": r"""
        (struct_item name: (type_identifier) @class.name) @class.def
        (enum_item name: (type_identifier) @class.name) @class.def
        (trait_item name: (type_identifier) @class.name) @class.def
        (impl_item type: (type_identifier) @class.name) @class.def
        (function_item name: (identifier) @func.name) @func.def
        (call_expression function: [(identifier) @call.name
                                    (scoped_identifier name: (identifier) @call.name)
                                    (field_expression field: (field_identifier) @call.name)]) @call
        (use_declaration (scoped_identifier) @import.path) @import
    """,
    "csharp": r"""
        (class_declaration name: (identifier) @class.name) @class.def
        (interface_declaration name: (identifier) @class.name) @class.def
        (method_declaration name: (identifier) @method.name) @method.def
        (invocation_expression function: [(identifier) @call.name
                                          (member_access_expression name: (identifier) @call.name)]) @call
        (object_creation_expression type: (identifier) @new.name) @new
        (using_directive (qualified_name) @import.path) @import
    """,
    "php": r"""
        (class_declaration name: (name) @class.name
            (base_clause (name) @class.base)?) @class.def
        (interface_declaration name: (name) @class.name) @class.def
        (function_definition name: (name) @func.name) @func.def
        (method_declaration name: (name) @method.name) @method.def
        (function_call_expression function: (name) @call.name) @call
        (member_call_expression name: (name) @call.name) @call
        (object_creation_expression (qualified_name (name) @new.name)) @new
    """,
    "c": r"""
        (function_definition declarator: (function_declarator declarator: (identifier) @func.name)) @func.def
        (call_expression function: (identifier) @call.name) @call
        (preproc_include path: [(string_literal) (system_lib_string)] @import.path) @import
    """,
    "cpp": r"""
        (class_specifier name: (type_identifier) @class.name
            (base_class_clause (type_identifier) @class.base)?) @class.def
        (struct_specifier name: (type_identifier) @class.name) @class.def
        (function_definition declarator: [(function_declarator declarator: (identifier) @func.name)
                                          (function_declarator declarator: (field_identifier) @method.name)
                                          (function_declarator declarator: (qualified_identifier name: (identifier) @method.name))]) @func.def
        (call_expression function: [(identifier) @call.name
                                    (field_expression field: (field_identifier) @call.name)]) @call
        (preproc_include path: [(string_literal) (system_lib_string)] @import.path) @import
    """,
    "kotlin": r"""
        (class_declaration (type_identifier) @class.name) @class.def
        (function_declaration (simple_identifier) @func.name) @func.def
        (call_expression (simple_identifier) @call.name) @call
        (import_header (identifier) @import.path) @import
    """,
    "scala": r"""
        (class_definition name: (identifier) @class.name) @class.def
        (object_definition name: (identifier) @class.name) @class.def
        (trait_definition name: (identifier) @class.name) @class.def
        (function_definition name: (identifier) @func.name) @func.def
        (call_expression function: [(identifier) @call.name
                                    (field_expression field: (identifier) @call.name)]) @call
        (import_declaration) @import
    """,
    "swift": r"""
        (class_declaration name: (type_identifier) @class.name) @class.def
        (protocol_declaration name: (type_identifier) @class.name) @class.def
        (function_declaration name: (simple_identifier) @func.name) @func.def
        (call_expression (simple_identifier) @call.name) @call
        (import_declaration (identifier) @import.path) @import
    """,
    "lua": r"""
        (function_declaration name: (identifier) @func.name) @func.def
        (function_call name: (identifier) @call.name) @call
    """,
    "bash": r"""
        (function_definition name: (word) @func.name) @func.def
        (command name: (command_name) @call.name) @call
    """,
}


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

@dataclass
class SymbolNode:
    symbol_id: str         # stable per repo: f"{rel_path}::{qualified_name}"
    node_type: str         # MODULE | CLASS | FUNCTION | METHOD | EXTERNAL
    name: str              # short name for display
    qualified_name: str    # "ClassA.method_b"
    source_file: str
    source_line: int | None = None
    parent_symbol_id: str | None = None
    language: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SymbolEdge:
    from_symbol: str
    to_symbol: str
    edge_type: str  # CALLS | IMPORTS | EXTENDS | INSTANTIATES
    source_file: str | None = None
    source_line: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Lazy parser cache
# ---------------------------------------------------------------------------

_PARSER_CACHE: dict[str, Any] = {}
_QUERY_CACHE: dict[str, Any] = {}
_LANGUAGE_AVAILABLE: dict[str, bool] = {}


def _get_parser_and_query(lang: str):
    """Return (parser, query) for the language, or (None, None) if unsupported."""
    if lang in _PARSER_CACHE:
        return _PARSER_CACHE[lang], _QUERY_CACHE.get(lang)
    if _LANGUAGE_AVAILABLE.get(lang) is False:
        return None, None
    try:
        from tree_sitter_language_pack import get_language, get_parser
        parser = get_parser(lang)
        language = get_language(lang)
        q_src = QUERIES.get(lang)
        query = language.query(q_src) if q_src else None
        _PARSER_CACHE[lang] = parser
        _QUERY_CACHE[lang] = query
        _LANGUAGE_AVAILABLE[lang] = True
        return parser, query
    except Exception as exc:
        logger.debug("tree-sitter language %s unavailable: %s", lang, exc)
        _LANGUAGE_AVAILABLE[lang] = False
        return None, None


# ---------------------------------------------------------------------------
# Per-file extraction
# ---------------------------------------------------------------------------

def _node_text(node, src: bytes) -> str:
    try:
        return src[node.start_byte:node.end_byte].decode("utf-8", errors="replace")
    except Exception:
        return ""


def _node_line(node) -> int:
    return (node.start_point[0] or 0) + 1


def _ancestor_capture(node, group_map: dict[int, str], wanted_prefix: str):
    """Walk up the tree, returning the first ancestor whose id is in `group_map`
    starting with `wanted_prefix` (e.g. "class.def" or "func.def")."""
    cur = node.parent
    while cur is not None:
        tag = group_map.get(cur.id)
        if tag and tag == wanted_prefix:
            return cur
        cur = cur.parent
    return None


def _extract_from_file(
    rel_path: str,
    content: bytes,
    lang: str,
) -> tuple[list[SymbolNode], list[SymbolEdge], dict[str, list[str]]]:
    """Parse one file and emit nodes + edges. Returns (nodes, edges, imports_index)
    where imports_index maps `local_name -> [import_target_module_path, ...]`
    so a later pass can resolve calls/extends to the right module."""
    parser, query = _get_parser_and_query(lang)
    module_id = f"{rel_path}"
    module_node = SymbolNode(
        symbol_id=module_id,
        node_type="MODULE",
        name=Path(rel_path).name,
        qualified_name=rel_path,
        source_file=rel_path,
        source_line=1,
        language=lang,
        metadata={"path": rel_path},
    )
    nodes: list[SymbolNode] = [module_node]
    edges: list[SymbolEdge] = []
    imports_index: dict[str, list[str]] = {}

    if parser is None or query is None:
        return nodes, edges, imports_index

    try:
        tree = parser.parse(content)
    except Exception as exc:
        logger.debug("parse failed for %s: %s", rel_path, exc)
        return nodes, edges, imports_index

    # ts query results: match-based API across versions
    try:
        matches = query.matches(tree.root_node)
    except AttributeError:
        # fall back to captures-based API
        captures = query.captures(tree.root_node)
        return _extract_via_captures(rel_path, content, lang, nodes, edges, imports_index, captures)

    # Build a map: ts_node id -> primary tag, so we can find the enclosing func/class
    def_tag_for_id: dict[int, str] = {}
    for _pat_idx, cap_dict in matches:
        for tag, ts_nodes in cap_dict.items():
            if tag in {"class.def", "func.def", "method.def"}:
                for n in ts_nodes:
                    def_tag_for_id[n.id] = tag

    # Walk each match producing nodes/edges
    for _pat_idx, cap_dict in matches:
        tags = set(cap_dict.keys())

        # ---- CLASS / INTERFACE / TRAIT / STRUCT --------------------------
        if "class.def" in tags:
            cls_node = cap_dict["class.def"][0]
            name_nodes = cap_dict.get("class.name") or []
            if not name_nodes:
                continue
            cname = _node_text(name_nodes[0], content)
            symbol = f"{rel_path}::{cname}"
            nodes.append(SymbolNode(
                symbol_id=symbol,
                node_type="CLASS",
                name=cname,
                qualified_name=cname,
                source_file=rel_path,
                source_line=_node_line(cls_node),
                parent_symbol_id=module_id,
                language=lang,
                metadata={"kind": "class"},
            ))
            for b in cap_dict.get("class.base") or []:
                bname = _node_text(b, content)
                edges.append(SymbolEdge(
                    from_symbol=symbol,
                    to_symbol=f"@unresolved::{bname}",
                    edge_type="EXTENDS",
                    source_file=rel_path,
                    source_line=_node_line(b),
                    metadata={"raw": bname},
                ))

        # ---- METHOD ------------------------------------------------------
        if "method.def" in tags:
            m_node = cap_dict["method.def"][0]
            name_nodes = cap_dict.get("method.name") or []
            if not name_nodes:
                continue
            mname = _node_text(name_nodes[0], content)
            parent_class = _ancestor_capture(m_node, def_tag_for_id, "class.def")
            if parent_class is not None:
                # Find class name from def_tag map by re-running locally
                cname = _find_def_name(parent_class, content, "class.name")
                if cname:
                    symbol = f"{rel_path}::{cname}::{mname}"
                    nodes.append(SymbolNode(
                        symbol_id=symbol,
                        node_type="METHOD",
                        name=mname,
                        qualified_name=f"{cname}.{mname}",
                        source_file=rel_path,
                        source_line=_node_line(m_node),
                        parent_symbol_id=f"{rel_path}::{cname}",
                        language=lang,
                        metadata={"kind": "method"},
                    ))
                    continue
            # Method-without-class (free method): treat like FUNCTION
            symbol = f"{rel_path}::{mname}"
            nodes.append(SymbolNode(
                symbol_id=symbol,
                node_type="FUNCTION",
                name=mname,
                qualified_name=mname,
                source_file=rel_path,
                source_line=_node_line(m_node),
                parent_symbol_id=module_id,
                language=lang,
                metadata={"kind": "function"},
            ))

        # ---- FUNCTION ----------------------------------------------------
        if "func.def" in tags:
            f_node = cap_dict["func.def"][0]
            name_nodes = cap_dict.get("func.name") or []
            if not name_nodes:
                continue
            fname = _node_text(name_nodes[0], content)
            # Skip if this is actually a method (its grammar uses func.def for methods too)
            parent_class = _ancestor_capture(f_node, def_tag_for_id, "class.def")
            if parent_class is not None:
                cname = _find_def_name(parent_class, content, "class.name")
                if cname:
                    symbol = f"{rel_path}::{cname}::{fname}"
                    nodes.append(SymbolNode(
                        symbol_id=symbol,
                        node_type="METHOD",
                        name=fname,
                        qualified_name=f"{cname}.{fname}",
                        source_file=rel_path,
                        source_line=_node_line(f_node),
                        parent_symbol_id=f"{rel_path}::{cname}",
                        language=lang,
                        metadata={"kind": "method"},
                    ))
                    continue
            symbol = f"{rel_path}::{fname}"
            nodes.append(SymbolNode(
                symbol_id=symbol,
                node_type="FUNCTION",
                name=fname,
                qualified_name=fname,
                source_file=rel_path,
                source_line=_node_line(f_node),
                parent_symbol_id=module_id,
                language=lang,
                metadata={"kind": "function"},
            ))

        # ---- CALL --------------------------------------------------------
        if "call" in tags:
            call_node = cap_dict["call"][0]
            name_nodes = cap_dict.get("call.name") or []
            if not name_nodes:
                continue
            callee = _node_text(name_nodes[0], content)
            # Find enclosing function/method via def_tag map
            enclosing = (
                _ancestor_capture(call_node, def_tag_for_id, "method.def")
                or _ancestor_capture(call_node, def_tag_for_id, "func.def")
            )
            if enclosing is None:
                from_sym = module_id
            else:
                cname = (
                    _find_def_name(enclosing, content, "func.name")
                    or _find_def_name(enclosing, content, "method.name")
                )
                if not cname:
                    from_sym = module_id
                else:
                    parent_class = _ancestor_capture(enclosing, def_tag_for_id, "class.def")
                    if parent_class is not None:
                        cls_name = _find_def_name(parent_class, content, "class.name")
                        from_sym = f"{rel_path}::{cls_name}::{cname}" if cls_name else f"{rel_path}::{cname}"
                    else:
                        from_sym = f"{rel_path}::{cname}"
            edges.append(SymbolEdge(
                from_symbol=from_sym,
                to_symbol=f"@unresolved::{callee}",
                edge_type="CALLS",
                source_file=rel_path,
                source_line=_node_line(call_node),
                metadata={"raw": callee},
            ))

        # ---- NEW expression ---------------------------------------------
        if "new" in tags:
            new_node = cap_dict["new"][0]
            name_nodes = cap_dict.get("new.name") or []
            if not name_nodes:
                continue
            cname = _node_text(name_nodes[0], content)
            enclosing = (
                _ancestor_capture(new_node, def_tag_for_id, "method.def")
                or _ancestor_capture(new_node, def_tag_for_id, "func.def")
            )
            if enclosing is None:
                from_sym = module_id
            else:
                fn = (
                    _find_def_name(enclosing, content, "func.name")
                    or _find_def_name(enclosing, content, "method.name")
                )
                parent_class = _ancestor_capture(enclosing, def_tag_for_id, "class.def")
                if parent_class is not None and fn:
                    cls_name = _find_def_name(parent_class, content, "class.name")
                    from_sym = f"{rel_path}::{cls_name}::{fn}" if cls_name else f"{rel_path}::{fn}"
                else:
                    from_sym = f"{rel_path}::{fn}" if fn else module_id
            edges.append(SymbolEdge(
                from_symbol=from_sym,
                to_symbol=f"@unresolved::{cname}",
                edge_type="INSTANTIATES",
                source_file=rel_path,
                source_line=_node_line(new_node),
                metadata={"raw": cname},
            ))

        # ---- IMPORT ------------------------------------------------------
        if "import" in tags:
            imp_node = cap_dict["import"][0]
            path_nodes = cap_dict.get("import.path") or []
            name_nodes = cap_dict.get("import.name") or []
            raw_path = _node_text(path_nodes[0], content).strip("\"'") if path_nodes else ""
            if raw_path:
                edges.append(SymbolEdge(
                    from_symbol=module_id,
                    to_symbol=f"@module::{raw_path}",
                    edge_type="IMPORTS",
                    source_file=rel_path,
                    source_line=_node_line(imp_node),
                    metadata={"path": raw_path},
                ))
                for n in name_nodes:
                    nm = _node_text(n, content)
                    imports_index.setdefault(nm, []).append(raw_path)

    return nodes, edges, imports_index


def _find_def_name(def_node, src: bytes, name_capture: str) -> str | None:
    """Find the named child of a def node — naive depth-first search for the first
    identifier-like node, since we don't have the capture re-bound here."""
    # Generic: first child node whose type is identifier-ish
    candidate_types = (
        "identifier", "type_identifier", "property_identifier", "field_identifier",
        "name", "constant", "simple_identifier",
    )
    stack = [def_node]
    while stack:
        cur = stack.pop()
        for child in cur.children:
            if child.type in candidate_types:
                return _node_text(child, src)
            # Don't descend past nested defs
            if child.type in ("class_definition", "function_definition", "method_definition",
                              "class_declaration", "function_declaration"):
                continue
            stack.append(child)
    return None


def _extract_via_captures(
    rel_path: str, content: bytes, lang: str,
    nodes: list[SymbolNode], edges: list[SymbolEdge],
    imports_index: dict[str, list[str]],
    captures,
):
    """Older tree-sitter API path. Less precise (no enclosing-context) but
    still produces nodes + a coarse call/import graph."""
    module_id = rel_path
    for n, tag in captures:
        if tag == "class.name":
            nm = _node_text(n, content)
            nodes.append(SymbolNode(
                symbol_id=f"{rel_path}::{nm}",
                node_type="CLASS",
                name=nm,
                qualified_name=nm,
                source_file=rel_path,
                source_line=_node_line(n),
                parent_symbol_id=module_id,
                language=lang,
            ))
        elif tag == "func.name":
            nm = _node_text(n, content)
            nodes.append(SymbolNode(
                symbol_id=f"{rel_path}::{nm}",
                node_type="FUNCTION",
                name=nm,
                qualified_name=nm,
                source_file=rel_path,
                source_line=_node_line(n),
                parent_symbol_id=module_id,
                language=lang,
            ))
        elif tag == "call.name":
            nm = _node_text(n, content)
            edges.append(SymbolEdge(
                from_symbol=module_id,
                to_symbol=f"@unresolved::{nm}",
                edge_type="CALLS",
                source_file=rel_path,
                source_line=_node_line(n),
                metadata={"raw": nm},
            ))
        elif tag == "import.path":
            nm = _node_text(n, content).strip("\"'")
            edges.append(SymbolEdge(
                from_symbol=module_id,
                to_symbol=f"@module::{nm}",
                edge_type="IMPORTS",
                source_file=rel_path,
                source_line=_node_line(n),
                metadata={"path": nm},
            ))
    return nodes, edges, imports_index


# ---------------------------------------------------------------------------
# Cross-file resolution
# ---------------------------------------------------------------------------

def _resolve_edges(
    nodes: list[SymbolNode],
    edges: list[SymbolEdge],
    imports_by_module: dict[str, dict[str, list[str]]],
) -> list[SymbolEdge]:
    """Replace `@unresolved::name` and `@module::path` placeholders with real
    symbol_ids when we have a matching definition in the repo. Unresolved
    references become EXTERNAL nodes so the graph stays complete."""
    # Index defs by simple name and by full symbol_id
    by_simple_name: dict[str, list[SymbolNode]] = {}
    by_id: dict[str, SymbolNode] = {}
    by_module_path: dict[str, SymbolNode] = {}
    for n in nodes:
        by_id[n.symbol_id] = n
        if n.node_type == "MODULE":
            by_module_path[n.qualified_name] = n
            # Also index by module name without extension (Python style)
            stem = Path(n.qualified_name).with_suffix("")
            by_module_path[str(stem).replace(os.sep, ".")] = n
            by_module_path[stem.name] = n
        else:
            by_simple_name.setdefault(n.name, []).append(n)

    resolved: list[SymbolEdge] = []
    external_nodes: dict[str, SymbolNode] = {}

    for e in edges:
        from_id = e.from_symbol
        to = e.to_symbol

        # Resolve module imports
        if to.startswith("@module::"):
            raw = to[len("@module::"):]
            target = (
                by_module_path.get(raw)
                or by_module_path.get(raw.replace("/", "."))
                or by_module_path.get(Path(raw).stem)
            )
            if target:
                resolved.append(SymbolEdge(
                    from_symbol=from_id, to_symbol=target.symbol_id,
                    edge_type=e.edge_type,
                    source_file=e.source_file, source_line=e.source_line,
                    metadata=e.metadata,
                ))
            else:
                ext_id = f"external::module::{raw}"
                if ext_id not in external_nodes:
                    external_nodes[ext_id] = SymbolNode(
                        symbol_id=ext_id, node_type="EXTERNAL",
                        name=raw, qualified_name=raw,
                        source_file="(external)",
                        metadata={"kind": "external_module"},
                    )
                resolved.append(SymbolEdge(
                    from_symbol=from_id, to_symbol=ext_id,
                    edge_type=e.edge_type,
                    source_file=e.source_file, source_line=e.source_line,
                    metadata=e.metadata,
                ))
            continue

        # Resolve calls / extends / instantiates
        if to.startswith("@unresolved::"):
            raw = to[len("@unresolved::"):]
            from_node = by_id.get(from_id)
            target = None
            if from_node:
                # Same-file definition wins
                same_file_id = f"{from_node.source_file}::{raw}"
                if same_file_id in by_id:
                    target = by_id[same_file_id]
                else:
                    # Imported names: look up via imports_index for the source file
                    file_imports = imports_by_module.get(from_node.source_file, {})
                    if raw in file_imports:
                        for mod_path in file_imports[raw]:
                            mod_node = (
                                by_module_path.get(mod_path)
                                or by_module_path.get(mod_path.replace("/", "."))
                            )
                            if mod_node:
                                # Best-effort: look for def named `raw` in that module
                                candidate = by_id.get(f"{mod_node.qualified_name}::{raw}")
                                if candidate:
                                    target = candidate
                                    break
                    # Last resort — first global match by simple name
                    if not target:
                        candidates = by_simple_name.get(raw, [])
                        if len(candidates) == 1:
                            target = candidates[0]

            if target:
                resolved.append(SymbolEdge(
                    from_symbol=from_id, to_symbol=target.symbol_id,
                    edge_type=e.edge_type,
                    source_file=e.source_file, source_line=e.source_line,
                    metadata=e.metadata,
                ))
            else:
                ext_id = f"external::name::{raw}"
                if ext_id not in external_nodes:
                    external_nodes[ext_id] = SymbolNode(
                        symbol_id=ext_id, node_type="EXTERNAL",
                        name=raw, qualified_name=raw,
                        source_file="(external)",
                        metadata={"kind": "external_symbol"},
                    )
                resolved.append(SymbolEdge(
                    from_symbol=from_id, to_symbol=ext_id,
                    edge_type=e.edge_type,
                    source_file=e.source_file, source_line=e.source_line,
                    metadata=e.metadata,
                ))
            continue

        # Already resolved
        resolved.append(e)

    nodes.extend(external_nodes.values())
    return resolved


# ---------------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------------

def extract_code_graph(repo_path: str) -> dict[str, Any]:
    """
    Walk `repo_path`, parse every supported source file, and return:

        {
          "nodes": [SymbolNode dicts],
          "edges": [SymbolEdge dicts],
          "files_scanned": int,
          "languages": {lang: file_count, ...},
          "errors": [str, ...],
        }
    """
    root = Path(repo_path)
    all_nodes: list[SymbolNode] = []
    all_edges: list[SymbolEdge] = []
    imports_by_module: dict[str, dict[str, list[str]]] = {}
    file_count = 0
    errors: list[str] = []
    lang_counts: dict[str, int] = {}

    for fp in root.rglob("*"):
        if file_count >= MAX_FILES:
            errors.append(f"Hit MAX_FILES cap ({MAX_FILES}) — symbol graph is partial.")
            break
        try:
            if not fp.is_file():
                continue
            if any(part in SKIP_DIR_NAMES for part in fp.parts):
                continue
            lang = EXT_TO_LANG.get(fp.suffix.lower())
            if not lang:
                continue
            if fp.stat().st_size > MAX_FILE_SIZE:
                continue
        except OSError:
            continue

        try:
            content = fp.read_bytes()
        except Exception as exc:
            errors.append(f"{fp}: {exc}")
            continue

        rel = str(fp.relative_to(root)).replace(os.sep, "/")
        try:
            nodes, edges, imports_index = _extract_from_file(rel, content, lang)
        except Exception as exc:
            errors.append(f"{rel}: {exc}")
            continue
        all_nodes.extend(nodes)
        all_edges.extend(edges)
        if imports_index:
            imports_by_module[rel] = imports_index
        file_count += 1
        lang_counts[lang] = lang_counts.get(lang, 0) + 1

    resolved_edges = _resolve_edges(all_nodes, all_edges, imports_by_module)

    # Dedupe edges (multiple call sites between the same pair collapse to one,
    # we record the count instead).
    edge_index: dict[tuple[str, str, str], SymbolEdge] = {}
    for e in resolved_edges:
        key = (e.from_symbol, e.to_symbol, e.edge_type)
        if key in edge_index:
            existing = edge_index[key]
            count = (existing.metadata or {}).get("count", 1) + 1
            existing.metadata = {**(existing.metadata or {}), "count": count}
        else:
            e.metadata = {**(e.metadata or {}), "count": 1}
            edge_index[key] = e

    return {
        "nodes": [n.__dict__ for n in all_nodes],
        "edges": [e.__dict__ for e in edge_index.values()],
        "files_scanned": file_count,
        "languages": lang_counts,
        "errors": errors[:50],
    }
