from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.moderation import is_banned, get_ban_reason

router = APIRouter(prefix="/safety", tags=["Safety"])


class SafetyCheckRequest(BaseModel):
    device_id: str


@router.post("/check")
def safety_check(data: SafetyCheckRequest):
    """Check if a user is banned."""
    if is_banned(data.device_id):
        reason = get_ban_reason(data.device_id)
        raise HTTPException(
            status_code=403,
            detail=f"Account suspended. Reason: {reason}. Try again later."
        )
    return {"status": "ok"}
