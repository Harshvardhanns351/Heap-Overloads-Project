from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

from app.database import get_session
from app.models import User
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter()


def _to_user_read(u: User) -> UserRead:
    return UserRead(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role,
        created_at=u.created_at,
    )


@router.get("/", response_model=List[UserRead])
def list_users(
    limit: int = 100,
    offset: int = 0,
    session=Depends(get_session),
):
    users = session.exec(select(User).offset(offset).limit(limit)).all()
    return [_to_user_read(u) for u in users]


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, session=Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_user_read(user)


@router.post("/", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate, session=Depends(get_session)):
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=payload.hashed_password or "",
        role=payload.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return _to_user_read(user)


@router.put("/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, session=Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Email uniqueness check on change
    if payload.email is not None and payload.email != user.email:
        conflict = session.exec(select(User).where(User.email == payload.email)).first()
        if conflict:
            raise HTTPException(status_code=409, detail="Email already exists")

    try:
        update_data = payload.model_dump(exclude_unset=True)
    except AttributeError:
        # Pydantic v1 fallback
        update_data = payload.dict(exclude_unset=True)
    if "name" in update_data:
        user.name = update_data["name"]
    if "email" in update_data:
        user.email = update_data["email"]
    if "role" in update_data:
        user.role = update_data["role"]
    if "hashed_password" in update_data and update_data["hashed_password"] is not None:
        user.hashed_password = update_data["hashed_password"]
    elif "hashed_password" in update_data and update_data["hashed_password"] is None:
        # Keep current value if explicitly set to null
        pass

    session.add(user)
    session.commit()
    session.refresh(user)
    return _to_user_read(user)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, session=Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session.delete(user)
    session.commit()
    return None

