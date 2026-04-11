"""
Google OAuth2 login flow.

Flow:
  1. Frontend calls GET /api/auth/google/url  → gets the Google consent URL
  2. User is redirected to Google, approves
  3. Google redirects to /api/auth/google/callback?code=...
  4. Backend exchanges code for user info, creates/finds user, returns JWT
  5. Frontend receives JWT and stores it (same as email/password login)

Required .env vars:
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REDIRECT_URI  (default: http://localhost:8000/api/auth/google/callback)
"""

import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import select

from app.database import get_session
from app.models import User
from app.auth.security import create_access_token, hash_password

router = APIRouter()

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO  = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.get("/url")
def google_login_url():
    """Return the Google OAuth consent URL for the frontend to redirect to."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env")

    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "offline",
        "prompt":        "select_account",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": f"{GOOGLE_AUTH_URL}?{query}"}


@router.get("/callback")
def google_callback(code: str, session=Depends(get_session)):
    """Exchange Google code for user info, create/find user, return JWT via redirect."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    # Exchange code for tokens
    with httpx.Client() as client:
        token_resp = client.post(GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
        if not token_resp.is_success:
            raise HTTPException(status_code=400, detail="Failed to exchange Google code")

        access_token = token_resp.json().get("access_token")

        # Get user info
        user_resp = client.get(GOOGLE_USERINFO, headers={"Authorization": f"Bearer {access_token}"})
        if not user_resp.is_success:
            raise HTTPException(status_code=400, detail="Failed to get Google user info")

        guser = user_resp.json()

    email = guser.get("email")
    name  = guser.get("name", email)

    if not email:
        raise HTTPException(status_code=400, detail="No email from Google")

    # Find or create user
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        user = User(
            name=name,
            email=email,
            role="student",  # default role for Google sign-ins
            hashed_password=hash_password(os.urandom(32).hex()),  # random unusable password
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    initials = ''.join(w[0].upper() for w in (user.name or '?').split()[:2])
    token = create_access_token(str(user.id), {"role": user.role})

    # Redirect to frontend with token in query param
    # Frontend reads it and stores in localStorage
    return RedirectResponse(
        url=f"{FRONTEND_URL}/auth/callback?token={token}&user_id={user.id}&name={user.name}&email={user.email}&role={user.role}&avatar={initials}"
    )
