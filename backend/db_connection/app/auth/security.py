import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from urllib.parse import urlencode

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from jose import jwt, JWTError
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")
fallback_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    try:
        return pwd_context.hash(password)
    except Exception:
        return fallback_pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        try:
            return fallback_pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False


def _secret_key() -> str:
    return os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")


def frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def public_backend_url() -> str:
    return os.getenv("PUBLIC_BACKEND_URL", "http://localhost:8000").rstrip("/")


def serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(_secret_key())


def create_access_token(
    subject: str,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_minutes: Optional[int] = None,
) -> str:
    if expires_minutes is None:
        expires_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    now = datetime.now(timezone.utc)
    to_encode: Dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    if extra_claims:
        to_encode.update(extra_claims)

    return jwt.encode(to_encode, _secret_key(), algorithm="HS256")


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, _secret_key(), algorithms=["HS256"])
    except JWTError as e:
        raise ValueError("Invalid token") from e


def create_signed_token(payload: Dict[str, Any], salt: str) -> str:
    return serializer().dumps(payload, salt=salt)


def decode_signed_token(token: str, salt: str, max_age: int) -> Dict[str, Any]:
    try:
        return serializer().loads(token, salt=salt, max_age=max_age)
    except SignatureExpired as e:
        raise ValueError("Token expired") from e
    except BadSignature as e:
        raise ValueError("Invalid token") from e


def build_frontend_redirect(path: str, **params: Any) -> str:
    cleaned = {key: value for key, value in params.items() if value not in (None, "")}
    query = urlencode(cleaned)
    base = f"{frontend_url()}{path}"
    return f"{base}?{query}" if query else base

