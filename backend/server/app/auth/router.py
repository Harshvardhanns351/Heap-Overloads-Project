import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.database import get_session
from app.models import User
from app.auth.security import create_access_token, hash_password, verify_password
from app.auth.deps import get_current_user, role_required

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleSSORequest(BaseModel):
    email: str
    name: str


class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str


def _user_response(user: User, token: str) -> dict:
    initials = ''.join(w[0].upper() for w in (user.name or '?').split()[:2])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id":     user.id,
            "name":   user.name,
            "email":  user.email,
            "role":   user.role,
            "avatar": initials,
            "rollNo": getattr(user, 'roll_number', None),
        },
    }


@router.post("/login")
def login(payload: LoginRequest, session=Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Auto-rehash if the stored hash is old passlib format (starts with $2b$ but fails direct bcrypt)
    try:
        import bcrypt as _bcrypt
        _bcrypt.checkpw(payload.password.encode()[:72], user.hashed_password.encode())
    except Exception:
        # Old hash — upgrade it silently
        user.hashed_password = hash_password(payload.password)
        session.add(user)
        session.commit()

    token = create_access_token(str(user.id), {"role": user.role})
    return _user_response(user, token)


@router.post("/google-sso")
def google_sso(payload: GoogleSSORequest, session=Depends(get_session)):
    """Called by the frontend after Clerk Google OAuth completes.
    Finds or creates the user by email, returns a backend JWT.
    """
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user:
        # New Google user — create as student by default
        user = User(
            name=payload.name,
            email=payload.email,
            role="student",
            hashed_password=hash_password(os.urandom(32).hex()),  # unusable random password
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    token = create_access_token(str(user.id), {"role": user.role})
    return _user_response(user, token)


@router.post("/seed-demo")
def seed_demo_users(session=Depends(get_session)):
    """Create or update demo users. No auth required — idempotent."""
    demo = [
        ("Rahul Sharma",    "rahul@college.edu",  "student"),
        ("Dr. Priya Menon", "priya@college.edu",  "teacher"),
        ("Admin",           "admin@college.edu",  "admin"),
    ]
    for name, email, role in demo:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            existing.hashed_password = hash_password("password")
            session.add(existing)
        else:
            session.add(User(name=name, email=email, role=role,
                             hashed_password=hash_password("password")))
    session.commit()
    return {"ok": True}


@router.post("/users", dependencies=[Depends(role_required(["admin"]))])
def create_user(payload: CreateUserRequest, session=Depends(get_session)):
    if session.exec(select(User).where(User.email == payload.email)).first():
        raise HTTPException(status_code=409, detail="Email already exists")
    u = User(name=payload.name, email=payload.email, role=payload.role,
             hashed_password=hash_password(payload.password))
    session.add(u)
    session.commit()
    session.refresh(u)
    return {"id": u.id, "email": u.email, "role": u.role}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
