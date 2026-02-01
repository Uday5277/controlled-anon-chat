from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


class OnboardingInitRequest(BaseModel):
    device_id: str


@router.post("/init")
def init_onboarding(data: OnboardingInitRequest):
    return {
        "status": "ok",
        "device_id": data.device_id,
        "message": "Device registered for onboarding"
    }
