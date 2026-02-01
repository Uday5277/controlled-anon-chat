from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/profile", tags=["Profile"])


class ProfileRequest(BaseModel):
    device_id: str
    nickname: str = Field(..., max_length=20)
    bio: str = Field(..., max_length=100)


@router.post("/setup")
def setup_profile(data: ProfileRequest):
    return {
        "status": "ok",
        "nickname": data.nickname,
        "message": "Profile setup complete"
    }
