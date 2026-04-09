import os
from typing import Optional

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlmodel import select

from app.database import get_session
from app.models import User
from app.auth.emailer import send_auth_email
from app.auth.rate_limit import check_rate_limit, clear_failed_attempts, record_failed_attempt
from app.auth.security import (
    build_frontend_redirect,
    create_access_token,
    create_signed_token,
    hash_password,
    public_backend_url,
    decode_signed_token,
    verify_password,
)
from app.auth.deps import get_current_user, role_required

router = APIRouter()

DEMO_USERS = [
    ("Rahul Sharma", "rahul@college.edu", "student"),
    ("Dr. Priya Menon", "priya@college.edu", "teacher"),
    ("Admin", "admin@college.edu", "admin"),
]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class MagicLinkRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class RoleSelectionRequest(BaseModel):
    role: str


class MessageResponse(BaseModel):
    message: str


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "avatar_url": user.avatar_url,
        "oauth_provider": user.oauth_provider,
    }


def issue_auth_payload(user: User) -> dict:
    token = create_access_token(subject=str(user.id), extra_claims={"role": user.role or ""})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


def google_oauth_client():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")

    oauth = OAuth()
    return oauth.register(
        name="google",
        client_id=client_id,
        client_secret=client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


def _role_select_path(user: User) -> str:
    return "/select-role" if not user.role else ("/teacher/classes" if user.role == "teacher" else "/dashboard")


def _auth_callback_redirect(user: User) -> str:
    payload = issue_auth_payload(user)
    return build_frontend_redirect("/auth/callback", token=payload["access_token"], next=_role_select_path(user))


def _send_verification_email(email: str, token: str) -> str:
    verify_url = f"{public_backend_url()}/api/auth/verify-email?token={token}"
    return (
        "<h2>Verify your EduPulse account</h2>"
        f"<p><a href=\"{verify_url}\">Verify email</a></p>"
        f"<p>If the button does not work, open: {verify_url}</p>"
    )


def _send_magic_link_email(email: str, token: str) -> str:
    magic_url = f"{public_backend_url()}/api/auth/verify?token={token}"
    return (
        "<h2>Your EduPulse sign-in link</h2>"
        f"<p><a href=\"{magic_url}\">Sign in instantly</a></p>"
        f"<p>This link expires in 15 minutes.</p>"
    )


def _send_reset_email(email: str, token: str) -> str:
    reset_url = build_frontend_redirect("/reset-password", token=token)
    return (
        "<h2>Reset your EduPulse password</h2>"
        f"<p><a href=\"{reset_url}\">Choose a new password</a></p>"
        f"<p>This link expires in 30 minutes.</p>"
    )


def ensure_demo_users(session) -> int:
    created = 0
    for name, email, role in DEMO_USERS:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            continue
        user = User(
            name=name,
            email=email,
            role=role,
            hashed_password=hash_password("password"),
            is_verified=True,
        )
        session.add(user)
        created += 1

    if created:
        session.commit()

    return created


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, session=Depends(get_session)):
    client_ip = request.client.host if request.client else "unknown"
    retry_after = check_rate_limit(payload.email, client_ip)
    if retry_after:
        minutes = max(1, (retry_after + 59) // 60)
        raise HTTPException(status_code=429, detail=f"Too many failed attempts. Try again in {minutes} minute(s).")

    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        record_failed_attempt(payload.email, client_ip)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_verified and user.oauth_provider != "google":
        raise HTTPException(status_code=403, detail="Please verify your email before signing in")

    clear_failed_attempts(payload.email, client_ip)
    return issue_auth_payload(user)


@router.post("/signup", response_model=MessageResponse)
async def signup(payload: SignupRequest, session=Depends(get_session)):
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=None,
        is_verified=False,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_signed_token({"email": user.email}, salt="email-verify")
    await send_auth_email(
        "Verify your EduPulse account",
        user.email,
        _send_verification_email(user.email, token),
    )
    return {"message": "Verification email sent"}


@router.get("/verify-email")
def verify_email(token: str = Query(...), session=Depends(get_session)):
    payload = decode_signed_token(token, salt="email-verify", max_age=60 * 60 * 24)
    user = session.exec(select(User).where(User.email == payload["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    session.add(user)
    session.commit()
    session.refresh(user)
    return RedirectResponse(_auth_callback_redirect(user), status_code=status.HTTP_302_FOUND)


@router.post("/magic-link", response_model=MessageResponse)
async def send_magic_link(payload: MagicLinkRequest, session=Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user:
        user = User(
            name=payload.email.split("@")[0],
            email=payload.email,
            hashed_password="",
            role=None,
            is_verified=False,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    elif user.role == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts cannot use social or magic-link sign-in")

    token = create_signed_token({"email": user.email}, salt="magic-link")
    await send_auth_email(
        "Your EduPulse sign-in link",
        user.email,
        _send_magic_link_email(user.email, token),
    )
    return {"message": "Magic link sent"}


@router.get("/verify")
def verify_magic_link(token: str = Query(...), session=Depends(get_session)):
    payload = decode_signed_token(token, salt="magic-link", max_age=60 * 15)
    user = session.exec(select(User).where(User.email == payload["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    session.add(user)
    session.commit()
    session.refresh(user)
    return RedirectResponse(_auth_callback_redirect(user), status_code=status.HTTP_302_FOUND)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest, session=Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if user and user.role != "admin":
        token = create_signed_token(
            {"email": user.email, "version": user.password_reset_version},
            salt="password-reset",
        )
        await send_auth_email(
            "Reset your EduPulse password",
            user.email,
            _send_reset_email(user.email, token),
        )
    return {"message": "If that email exists, a reset link has been sent"}


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, session=Depends(get_session)):
    token_data = decode_signed_token(payload.token, salt="password-reset", max_age=60 * 30)
    user = session.exec(select(User).where(User.email == token_data["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.password_reset_version != token_data.get("version", 0):
        raise HTTPException(status_code=400, detail="This reset link is no longer valid")

    user.hashed_password = hash_password(payload.password)
    user.password_reset_version += 1
    user.is_verified = True
    session.add(user)
    session.commit()
    return {"message": "Password updated successfully"}


@router.get("/google")
async def google_login(request: Request):
    client = google_oauth_client()
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or str(request.url_for("google_callback"))
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request, session=Depends(get_session)):
    client = google_oauth_client()
    token = await client.authorize_access_token(request)
    user_info = token.get("userinfo")
    if not user_info:
        user_info = await client.userinfo(token=token)

    email = user_info.get("email")
    google_id = user_info.get("sub")
    if not email or not google_id:
        raise HTTPException(status_code=400, detail="Google profile is missing email or subject")

    user = session.exec(
        select(User).where((User.google_id == google_id) | (User.email == email))
    ).first()
    if user and user.role == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts cannot be created via OAuth")

    if not user:
        user = User(
            name=user_info.get("name") or email.split("@")[0],
            email=email,
            hashed_password="",
            role=None,
            is_verified=True,
            google_id=google_id,
            avatar_url=user_info.get("picture"),
            oauth_provider="google",
        )
        session.add(user)
    else:
        user.name = user_info.get("name") or user.name
        user.google_id = google_id
        user.avatar_url = user_info.get("picture")
        user.oauth_provider = "google"
        user.is_verified = True
        session.add(user)

    session.commit()
    session.refresh(user)
    return RedirectResponse(_auth_callback_redirect(user), status_code=status.HTTP_302_FOUND)


@router.post("/seed-demo", dependencies=[Depends(role_required(["admin"]))])
def seed_demo_users(session=Depends(get_session)):
    # Creates demo users if they don't exist. Password: password
    return {"created": ensure_demo_users(session)}


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
        is_verified=True,
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return {"id": u.id, "email": u.email, "role": u.role}


@router.post("/select-role", response_model=TokenResponse)
def select_role(payload: RoleSelectionRequest, user: User = Depends(get_current_user), session=Depends(get_session)):
    if payload.role not in {"student", "teacher"}:
        raise HTTPException(status_code=400, detail="Role must be student or teacher")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Admin role cannot be changed here")
    if user.role and user.role != payload.role:
        raise HTTPException(status_code=409, detail="Role has already been set for this account")

    user.role = payload.role
    user.is_verified = True
    session.add(user)
    session.commit()
    session.refresh(user)
    return issue_auth_payload(user)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return serialize_user(user)

