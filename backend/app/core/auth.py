import base64
import binascii
import hashlib
import hmac
import json
import time
from typing import Optional

from fastapi import HTTPException, Request, status

from app.core.config import settings

AUTH_COOKIE_NAME = "aura_session"


def _encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_session_token(now: Optional[int] = None) -> str:
    issued_at = int(time.time()) if now is None else now
    payload = json.dumps(
        {"exp": issued_at + settings.AUTH_SESSION_HOURS * 3600},
        separators=(",", ":"),
    ).encode("utf-8")
    encoded_payload = _encode(payload)
    signature = hmac.new(
        (settings.APP_SECRET_KEY or "").encode("utf-8"),
        encoded_payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{encoded_payload}.{_encode(signature)}"


def verify_session_token(token: str, now: Optional[int] = None) -> bool:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
        expected = hmac.new(
            (settings.APP_SECRET_KEY or "").encode("utf-8"),
            encoded_payload.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(_decode(encoded_signature), expected):
            return False
        payload = json.loads(_decode(encoded_payload))
        current_time = int(time.time()) if now is None else now
        return isinstance(payload.get("exp"), int) and payload["exp"] > current_time
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, binascii.Error):
        return False


def require_auth(request: Request) -> None:
    if not settings.AUTH_ENABLED:
        return
    token = request.cookies.get(AUTH_COOKIE_NAME, "")
    if not verify_session_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
