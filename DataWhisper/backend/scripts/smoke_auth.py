"""Smoke-test register + login against a running API (stdlib only).

Usage:
  set API_BASE=http://localhost:8000   (default)
  python scripts/smoke_auth.py

With Docker (from host, ports published):
  python scripts/smoke_auth.py
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
import uuid

API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000").rstrip("/")


def _request(method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    url = f"{API_BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"detail": raw or str(e)}
        return e.code, payload


def main() -> None:
    try:
        st, health = _request("GET", "/health")
    except OSError as e:
        raise SystemExit(
            f"Cannot connect to {API_BASE}/health — is the backend running? ({e})"
        ) from e
    if st != 200:
        raise SystemExit(f"Health check failed: {st} {health}")
    print("health:", health)

    email = f"smoke_{uuid.uuid4().hex[:10]}@example.com"
    password = "smokepass123"
    st, reg = _request(
        "POST",
        "/auth/register",
        {"email": email, "password": password, "workspace_name": "Smoke workspace"},
    )
    if st != 200:
        raise SystemExit(f"Register failed: {st} {reg}")
    print("register: ok", reg.get("user", {}).get("email"))

    st, tok = _request(
        "POST",
        "/auth/login",
        {"email": email, "password": password},
    )
    if st != 200 or not tok.get("access_token"):
        raise SystemExit(f"Login failed: {st} {tok}")
    print("login: ok, token present")

    print("All smoke checks passed.")


if __name__ == "__main__":
    main()
