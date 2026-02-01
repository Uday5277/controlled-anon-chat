from ..db.redis import redis_client
import time

COOLDOWN_SECONDS = 10  # short for demo

QUEUE_ANY = "queue:any"
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


def join_queue(device_id: str, preference: str):
    if preference == "male":
        redis_client.sadd(QUEUE_MALE, device_id)
    elif preference == "female":
        redis_client.sadd(QUEUE_FEMALE, device_id)
    else:
        redis_client.sadd(QUEUE_ANY, device_id)


def leave_all_queues(device_id: str):
    redis_client.srem(QUEUE_ANY, device_id)
    redis_client.srem(QUEUE_MALE, device_id)
    redis_client.srem(QUEUE_FEMALE, device_id)


def try_match(device_id: str, preference: str):
    """
    Attempts to find a match.
    Returns matched_device_id or None
    """

    def pop_from(queue):
        users = list(redis_client.smembers(queue))
        for u in users:
            if u != device_id:
                redis_client.srem(queue, u)
                return u
        return None

    if preference == "male":
        match = pop_from(QUEUE_MALE) or pop_from(QUEUE_ANY)
    elif preference == "female":
        match = pop_from(QUEUE_FEMALE) or pop_from(QUEUE_ANY)
    else:
        match = (
            pop_from(QUEUE_ANY) or
            pop_from(QUEUE_MALE) or
            pop_from(QUEUE_FEMALE)
        )

    if match:
        redis_client.set(f"active_match:{device_id}", match)
        redis_client.set(f"active_match:{match}", device_id)
        set_cooldown(device_id)
        set_cooldown(match)

    return match
