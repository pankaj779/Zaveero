"""Quick OpenAI key check. No extra deps except `openai` (stdlib-only .env load).

  pip install openai
  python backend/test.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path


def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


try:
    from openai import OpenAI
except ModuleNotFoundError:
    print("Missing package. Run:  pip install openai")
    sys.exit(1)

_here = Path(__file__).resolve().parent
_load_dotenv(_here / ".env")

key = (os.environ.get("OPENAI_API_KEY") or "").strip()
if not key:
    print("Set OPENAI_API_KEY in backend/.env or the environment.")
    sys.exit(1)

client = OpenAI(api_key=key)
try:
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Say OK in one word."}],
        max_tokens=10,
    )
    print("OK — key accepted:", (r.choices[0].message.content or "").strip())
except Exception as e:
    print("Failed:", e)
    sys.exit(1)
