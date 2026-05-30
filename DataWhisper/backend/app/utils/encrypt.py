import base64
import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.config import get_settings


def _fernet_key_from_secret(secret: str) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"datawhisper-cred-v2",
        iterations=480_000,
    )
    return base64.urlsafe_b64encode(kdf.derive(secret.encode("utf-8")))


def get_fernet() -> Fernet:
    settings = get_settings()
    raw = (settings.encryption_key or "").strip()
    if raw:
        try:
            return Fernet(raw.encode("utf-8"))
        except Exception:
            return Fernet(_fernet_key_from_secret(raw))
    return Fernet(_fernet_key_from_secret(settings.jwt_secret))


def encrypt_json(obj: dict[str, Any]) -> str:
    payload = json.dumps(obj, separators=(",", ":"), default=str).encode("utf-8")
    return get_fernet().encrypt(payload).decode("utf-8")


def decrypt_json(token: str) -> dict[str, Any]:
    try:
        raw = get_fernet().decrypt(token.encode("utf-8"))
    except InvalidToken as e:
        raise ValueError("Invalid encrypted payload") from e
    return json.loads(raw.decode("utf-8"))
