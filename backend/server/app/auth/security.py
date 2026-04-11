import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import bcrypt
from jose import jwt, JWTError


def hash_password(password: str) -> str:
    """Hash a password using bcrypt directly (bypasses passlib/bcrypt 4.x conflict)."""
    password_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash.
    Handles both new direct-bcrypt hashes and old passlib-format hashes.
    """
    try:
        password_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        # Old passlib hash or corrupted — fall back to passlib if available
        try:
            from passlib.context import CryptContext
            return CryptContext(schemes=["bcrypt"], deprecated="auto").verify(plain_password, hashed_password)
        except Exception:
            return False


def _secret_key() -> str:
    return os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")


def create_access_token(
    subject: str,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_minutes: Optional[int] = None,
) -> str:
    if expires_minutes is None:
        expires_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

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
