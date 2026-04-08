from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from datetime import datetime

from app.database import get_session
from app.models import CodingProfile, User
from app.auth.deps import get_current_user
from ai_engine.leetcode_fetcher import fetch_leetcode_stats

router = APIRouter()

@router.get("/leetcode/{username}")
async def get_leetcode_stats(username: str, current_user: User = Depends(get_current_user), session=Depends(get_session)):
    """
    Fetches real-time stats from LeetCode and updates the DB.
    """
    stats = await fetch_leetcode_stats(username)
    if not stats:
        raise HTTPException(status_code=404, detail="LeetCode user not found or API error")
        
    profile = session.exec(select(CodingProfile).where(CodingProfile.student_id == current_user.id).where(CodingProfile.platform == "leetcode")).first()
    
    if not profile:
        profile = CodingProfile(student_id=current_user.id, platform="leetcode", username=username)
        
    profile.solved_total = stats["solved_total"]
    profile.easy = stats["easy"]
    profile.medium = stats["medium"]
    profile.hard = stats["hard"]
    profile.last_synced_at = datetime.utcnow()
    
    session.add(profile)
    session.commit()
    session.refresh(profile)
    
    return profile

@router.get("/me")
def get_my_coding_profiles(current_user: User = Depends(get_current_user), session=Depends(get_session)):
    profiles = session.exec(select(CodingProfile).where(CodingProfile.student_id == current_user.id)).all()
    return profiles
