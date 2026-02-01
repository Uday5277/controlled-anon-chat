from ..db.redis import redis_client

QUEUE_KEY = "match_queue"


def join_queue(device_id: str):
    redis_client.sadd(QUEUE_KEY, device_id)


def leave_queue(device_id: str):
    redis_client.srem(QUEUE_KEY, device_id)


def get_queue():
    return list(redis_client.smembers(QUEUE_KEY))
