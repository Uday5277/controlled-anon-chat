from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.gender_ai import classify_gender
from ..services.user_store import save_gender

router = APIRouter(prefix="/verify", tags=["Verification"])


class VerificationRequest(BaseModel):
    device_id: str
    image_base64: str


@router.post("/gender")
def verify_gender(data: VerificationRequest):
    device_id = (data.device_id or "").strip()
    image_b64 = (data.image_base64 or "").strip()
    
    if not device_id or len(device_id) < 8:
        raise HTTPException(status_code=400, detail="Invalid device ID")
    if not image_b64 or len(image_b64) < 100:
        raise HTTPException(status_code=400, detail="Invalid image data")
    
    gender = classify_gender(image_b64)
    save_gender(device_id, gender)
    data.image_base64 = None

    return {
        "status": "verified",
        "gender": gender
    }
