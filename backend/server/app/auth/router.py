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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, session=Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(subject=str(user.id), extra_claims={"role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


@router.post("/seed-demo", dependencies=[Depends(role_required(["admin"]))])
def seed_demo_users(session=Depends(get_session)):
    # Creates demo users if they don't exist. Password: password
    demo = [
        ("Rahul Sharma", "rahul@college.edu", "student"),
        ("Dr. Priya Menon", "priya@college.edu", "teacher"),
        ("Admin", "admin@college.edu", "admin"),
    ]
    created = 0
    for name, email, role in demo:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            continue
        u = User(name=name, email=email, role=role, hashed_password=hash_password("password"))
        session.add(u)
        created += 1
    session.commit()
    return {"created": created}


@router.post("/users", dependencies=[Depends(role_required(["admin"]))])
def create_user(payload: CreateUserRequest, session=Depends(get_session)):
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")
    u = User(
        name=payload.name,
        email=payload.email,
        role=payload.role,
        hashed_password=hash_password(payload.password),
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return {"id": u.id, "email": u.email, "role": u.role}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}

