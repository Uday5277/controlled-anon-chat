from ..db.redis import redis_client

USER_KEY_PREFIX = "user:"
PREF_KEY_PREFIX = "pref:"


def _user_key(device_id: str) -> str:
    return f"{USER_KEY_PREFIX}{device_id}"


def _pref_key(device_id: str) -> str:
    return f"{PREF_KEY_PREFIX}{device_id}"


def save_gender(device_id: str, gender: str) -> None:
    if not device_id:
        return
    normalized = (gender or "").strip().lower()
    if normalized not in {"male", "female"}:
        normalized = "unknown"
    redis_client.hset(_user_key(device_id), mapping={"gender": normalized})


def get_gender(device_id: str) -> str | None:
    if not device_id:
        return None
    value = redis_client.hget(_user_key(device_id), "gender")
    return value if value else None


def save_profile(device_id: str, nickname: str, bio: str) -> None:
    if not device_id:
        return
    redis_client.hset(
        _user_key(device_id),
        mapping={
            "nickname": nickname.strip(),
            "bio": bio.strip(),
        },
    )


def set_preference(device_id: str, preference: str) -> None:
    if not device_id:
        return
    normalized = (preference or "any").strip().lower()
    if normalized not in {"male", "female", "any"}:
        normalized = "any"
    redis_client.set(_pref_key(device_id), normalized)


def get_preference(device_id: str) -> str:
    value = redis_client.get(_pref_key(device_id))
    return value if value else "any"