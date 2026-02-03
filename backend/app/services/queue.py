from ..db.redis import redis_client
from ..services.user_store import get_gender, get_preference, set_preference
import time
from datetime import datetime, timedelta, timezone

COOLDOWN_SECONDS = 1  # very short for testing matching
DAILY_SPECIFIC_LIMIT = 5

QUEUE_MALE = "queue:male"
QUEUE_FEMALE = "queue:female"


def is_on_cooldown(device_id: str) -> bool:
    return redis_client.exists(f"cooldown:{device_id}") == 1


def set_cooldown(device_id: str):
    redis_client.setex(
        f"cooldown:{device_id}",
        COOLDOWN_SECONDS,
        int(time.time())
    )


def _queue_for_gender(gender: str | None) -> str | None:
    if gender == "male":
        return QUEUE_MALE
    if gender == "female":
        return QUEUE_FEMALE
    return None


def join_queue(device_id: str, preference: str) -> bool:
    gender = get_gender(device_id)
    queue_key = _queue_for_gender(gender)
    if not queue_key:
        return False
    set_preference(device_id, preference)
    redis_client.sadd(queue_key, device_id)
    return True


def leave_all_queues(device_id: str):
    redis_client.srem(QUEUE_MALE, device_id)
    redis_client.srem(QUEUE_FEMALE, device_id)


def _desired_genders(preference: str) -> list[str]:
    if preference == "male":
        return ["male"]
    if preference == "female":
        return ["female"]
    return ["male", "female"]


def _is_preference_compatible(requester_gender: str | None, candidate_id: str) -> bool:
    if not requester_gender:
        return False
    candidate_pref = get_preference(candidate_id)
    return candidate_pref == "any" or candidate_pref == requester_gender


def try_match(device_id: str, preference: str):
    """
    Attempts to find a match.
    Returns matched_device_id or None
    """

    requester_gender = get_gender(device_id)
    if not requester_gender:
        return None

    set_preference(device_id, preference)

    def pop_compatible_from(queue):
        users = list(redis_client.smembers(queue))
        for u in users:
            if u == device_id:
                continue
            # Skip users who are already in an active chat
            if redis_client.get(f"active_match:{u}"):
                redis_client.srem(queue, u)
                continue
            if _is_preference_compatible(requester_gender, u):
                redis_client.srem(queue, u)
                return u
        return None

    match = None
    for gender in _desired_genders(preference):
        queue_key = _queue_for_gender(gender)
        if queue_key:
            match = pop_compatible_from(queue_key)
        if match:
            break

    if match:
        redis_client.set(f"active_match:{device_id}", match)
        redis_client.set(f"active_match:{match}", device_id)
        set_cooldown(device_id)
        set_cooldown(match)

    return match


def get_active_match(device_id: str) -> str | None:
    return redis_client.get(f"active_match:{device_id}")


def _limit_key(device_id: str, date_key: str) -> str:
    return f"limit:specific:{device_id}:{date_key}"


def _today_key_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _expire_at_end_of_day_utc(key: str) -> None:
    now = datetime.now(timezone.utc)
    end_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc) + timedelta(days=1)
    ttl_seconds = int((end_of_day - now).total_seconds())
    redis_client.expire(key, ttl_seconds)


def is_specific_filter_allowed(device_id: str, preference: str) -> bool:
    if preference not in {"male", "female"}:
        return True
    date_key = _today_key_utc()
    key = _limit_key(device_id, date_key)
    current = redis_client.get(key)
    if not current:
        return True
    return int(current) < DAILY_SPECIFIC_LIMIT


def increment_specific_filter_usage(device_id: str, preference: str) -> None:
    if preference not in {"male", "female"}:
        return
    date_key = _today_key_utc()
    key = _limit_key(device_id, date_key)
    new_value = redis_client.incr(key)
    if new_value == 1:
        _expire_at_end_of_day_utc(key)
