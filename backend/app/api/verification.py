from fastapi import APIRouter
from pydantic import BaseModel
from ..services.gender_ai import classify_gender

router = APIRouter(prefix="/verify", tags=["Verification"])


class VerificationRequest(BaseModel):
    device_id: str
    image_base64: str


@router.post("/gender")
def verify_gender(data: VerificationRequest):
    gender = classify_gender(data.image_base64)

    return {
        "status": "verified",
        "gender": gender
    }
