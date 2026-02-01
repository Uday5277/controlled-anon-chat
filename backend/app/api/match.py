from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.queue import (
    join_queue,
    leave_all_queues,
    try_match,
    is_on_cooldown
)

router = APIRouter(prefix="/match", tags=["Match"])


class MatchRequest(BaseModel):
    device_id: str
    preference: str  # male / female / any


@router.post("/find")
def find_match(data: MatchRequest):
    if is_on_cooldown(data.device_id):
        raise HTTPException(
            status_code=429,
            detail="Cooldown active. Please wait."
        )

    leave_all_queues(data.device_id)
    match = try_match(data.device_id, data.preference)

    if match:
        return {
            "status": "matched",
            "partner_id": match
        }

    join_queue(data.device_id, data.preference)
    return {
        "status": "queued"
    }
