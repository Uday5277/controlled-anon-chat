from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.queue import (
    join_queue,
    leave_all_queues,
    try_match,
    is_on_cooldown,
    is_specific_filter_allowed,
    increment_specific_filter_usage,
    get_active_match
)
from ..services.moderation import is_banned, get_ban_reason
from ..services.user_store import get_gender, get_preference

router = APIRouter(prefix="/match", tags=["Match"])


class MatchRequest(BaseModel):
    device_id: str
    preference: str  # male / female / any
    is_next: bool = False  # True if this is auto-find after "Next" button


class MatchStatusRequest(BaseModel):
    device_id: str


@router.post("/find")
def find_match(data: MatchRequest):
    if is_banned(data.device_id):
        raise HTTPException(
            status_code=403,
            detail=f"Account suspended: {get_ban_reason(data.device_id)}"
        )

    preference = data.preference.strip().lower()
    if preference not in {"male", "female", "any"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid preference. Use male, female, or any."
        )

    # Update preference immediately (before cooldown check)
    from ..services.user_store import set_preference
    set_preference(data.device_id, preference)

    # Skip cooldown check for "Next" auto-find (continuing to chat, not spam)
    if not data.is_next and is_on_cooldown(data.device_id):
        raise HTTPException(
            status_code=429,
            detail="Cooldown active. Please wait."
        )

    if not is_specific_filter_allowed(data.device_id, preference):
        raise HTTPException(
            status_code=429,
            detail="Daily limit reached for specific gender filters."
        )

    leave_all_queues(data.device_id)
    match = try_match(data.device_id, preference)

    if match:
        increment_specific_filter_usage(data.device_id, preference)
        return {
            "status": "matched",
            "partner_id": match
        }

    joined = join_queue(data.device_id, preference)
    if not joined:
        raise HTTPException(
            status_code=400,
            detail="Gender not verified. Complete verification first."
        )
    return {
        "status": "queued"
    }


@router.post("/status")
def match_status(data: MatchStatusRequest):
    partner_id = get_active_match(data.device_id)
    if partner_id:
        return {
            "status": "matched",
            "partner_id": partner_id
        }
    return {"status": "waiting"}


@router.post("/debug")
def debug_status(data: MatchStatusRequest):
    """Debug endpoint to check user state."""
    return {
        "device_id": data.device_id,
        "gender": get_gender(data.device_id),
        "preference": get_preference(data.device_id),
        "banned": is_banned(data.device_id),
        "cooldown": is_on_cooldown(data.device_id),
        "active_match": get_active_match(data.device_id),
    }


@router.post("/test-match")
def test_match(data: MatchStatusRequest):
    """
    TEST ONLY: Simulate a second user joining the queue to trigger a match.
    Use this to test matching without needing 2 browser windows.
    """
    # Create a fake second user
    test_user_id = "test-user-" + data.device_id[:8]
    
    # Save fake user's gender (opposite of first user) and preference
    user_gender = get_gender(data.device_id)
    test_gender = "female" if user_gender == "male" else "male"
    
    from ..services.user_store import save_gender, set_preference
    save_gender(test_user_id, test_gender)
    set_preference(test_user_id, "any")
    
    # Join test user to queue
    join_queue(test_user_id, "any")
    
    # Try to match the real user with the test user
    match = try_match(data.device_id, "any")
    
    if match:
        return {
            "status": "matched",
            "partner_id": match,
            "note": "TEST MODE: Matched with simulated user"
        }
    
    return {
        "status": "error",
        "message": "Could not create test match"
    }
