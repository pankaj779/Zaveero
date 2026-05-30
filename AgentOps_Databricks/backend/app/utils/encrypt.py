"""Fernet encryption for stored Databricks tokens."""

from __future__ import annotations

import base64
import hashlib
import json

from cryptography.fernet import Fernet

from app.config import get_settings


def _fernet() -> Fernet:
    secret = get_settings().jwt_secret.encode("utf-8")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    return Fernet(key)


def encrypt_text(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_text(token: str) -> str:
    return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")


def encrypt_json(data: dict) -> str:
    return encrypt_text(json.dumps(data))


def decrypt_json(token: str) -> dict:
    return json.loads(decrypt_text(token))
