import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from jose import jwt, JWTError
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _secret_key() -> str:
    return os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")


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

