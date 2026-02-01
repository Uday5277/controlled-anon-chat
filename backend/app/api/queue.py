from fastapi import APIRouter
from pydantic import BaseModel
from ..services.queue import join_queue, leave_queue, get_queue

router = APIRouter(prefix="/queue", tags=["Queue"])


class QueueRequest(BaseModel):
    device_id: str


@router.post("/join")
def join(data: QueueRequest):
    join_queue(data.device_id)
    return {"status": "joined"}


@router.post("/leave")
def leave(data: QueueRequest):
    leave_queue(data.device_id)
    return {"status": "left"}


@router.get("/status")
def status():
    return {
        "queue": get_queue()
    }
