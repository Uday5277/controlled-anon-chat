from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


class OnboardingInitRequest(BaseModel):
    device_id: str


@router.post("/init")
def init_onboarding(data: OnboardingInitRequest):
    device_id = (data.device_id or "").strip()
    if not device_id or len(device_id) < 8:
        return {
            "status": "error",
            "message": "Invalid device ID"
        }
    return {
        "status": "ok",
        "device_id": device_id,
        "message": "Device registered for onboarding"
    }
