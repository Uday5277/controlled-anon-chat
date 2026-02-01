from fastapi import APIRouter
from pydantic import BaseModel
import base64
import uuid

router = APIRouter(prefix="/verify", tags=["Verification"])


class VerificationRequest(BaseModel):
    device_id: str
    image_base64: str


@router.post("/gender")
def verify_gender(data: VerificationRequest):
    """
    1. Decode image (in memory)
    2. Run classification (mock for now)
    3. Immediately discard image
    """

    # Decode image (simulate usage)
    image_bytes = base64.b64decode(
        data.image_base64.split(",")[1]
    )

    #  MOCK gender classification
    gender = "Female" if uuid.uuid4().int % 2 == 0 else "Male"

    # IMPORTANT: image_bytes goes out of scope after function
    del image_bytes

    return {
        "status": "verified",
        "gender": gender
    }
