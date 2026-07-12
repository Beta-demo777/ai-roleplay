import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _cipher() -> Fernet:
    source = settings.MODEL_CREDENTIAL_KEY or settings.APP_SECRET_KEY or settings.POSTGRES_PASSWORD
    key = base64.urlsafe_b64encode(hashlib.sha256(source.encode("utf-8")).digest())
    return Fernet(key)


def encrypt_credential(value: str) -> str:
    return _cipher().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_credential(value: str) -> str:
    try:
        return _cipher().decrypt(value.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("模型服务密钥无法解密，请检查 MODEL_CREDENTIAL_KEY") from exc
