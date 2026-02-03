from ..db.redis import redis_client

REPORT_THRESHOLD = 3  # Auto-ban after N reports
BAN_DURATION_HOURS = 24

REPORTS_KEY_PREFIX = "reports:"
BAN_KEY_PREFIX = "ban:"


def report_user(reported_id: str, reporter_id: str) -> None:
    """Record a report against a user."""
    if not reported_id:
        return
    redis_client.incr(f"{REPORTS_KEY_PREFIX}{reported_id}")


def get_report_count(device_id: str) -> int:
    """Get number of reports against a user."""
    count = redis_client.get(f"{REPORTS_KEY_PREFIX}{device_id}")
    return int(count) if count else 0


def is_banned(device_id: str) -> bool:
    """Check if user is banned."""
    return redis_client.exists(f"{BAN_KEY_PREFIX}{device_id}") == 1


def ban_user(device_id: str, reason: str = "abuse") -> None:
    """Ban a user for the configured duration."""
    if not device_id:
        return
    seconds = BAN_DURATION_HOURS * 3600
    redis_client.setex(
        f"{BAN_KEY_PREFIX}{device_id}",
        seconds,
        reason
    )


def auto_ban_if_needed(device_id: str) -> bool:
    """Check report count and auto-ban if threshold exceeded. Returns True if banned."""
    if get_report_count(device_id) >= REPORT_THRESHOLD:
        ban_user(device_id, "report_threshold")
        return True
    return False


def get_ban_reason(device_id: str) -> str | None:
    """Get the reason a user is banned (if banned)."""
    if is_banned(device_id):
        return redis_client.get(f"{BAN_KEY_PREFIX}{device_id}")
    return None
