from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.user_store import save_profile

router = APIRouter(prefix="/profile", tags=["Profile"])


class ProfileRequest(BaseModel):
    device_id: str
    nickname: str = Field(..., max_length=20)
    bio: str = Field(..., max_length=100)


@router.post("/setup")
def setup_profile(data: ProfileRequest):
    device_id = (data.device_id or "").strip()
    nickname = (data.nickname or "").strip()
    bio = (data.bio or "").strip()
    
    if not device_id or len(device_id) < 8:
        raise HTTPException(status_code=400, detail="Invalid device ID")
    if not nickname or len(nickname) < 2 or len(nickname) > 20:
        raise HTTPException(status_code=400, detail="Nickname must be 2-20 characters")
    if not bio or len(bio) < 3 or len(bio) > 100:
        raise HTTPException(status_code=400, detail="Bio must be 3-100 characters")
    
    save_profile(device_id, nickname, bio)
    return {
        "status": "ok",
        "nickname": nickname,
        "message": "Profile setup complete"
    }
