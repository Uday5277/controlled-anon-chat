from fastapi import APIRouter
from pydantic import BaseModel
from ..services.queue import join_queue, leave_all_queues

router = APIRouter(prefix="/queue", tags=["Queue"])


class QueueRequest(BaseModel):
    device_id: str
    preference: str = "any"


@router.post("/join")
def join(data: QueueRequest):
    preference = data.preference.strip().lower()
    joined = join_queue(data.device_id, preference)
    if not joined:
        return {"status": "blocked", "reason": "gender_not_verified"}
    return {"status": "joined"}


@router.post("/leave")
def leave(data: QueueRequest):
    leave_all_queues(data.device_id)
    return {"status": "left"}


# @router.get("/status")
# def status():
#     return {
#         "queue": get_queue()
#     }
