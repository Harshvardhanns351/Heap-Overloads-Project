from datetime import datetime, timedelta, timezone


WINDOW_MINUTES = 10
MAX_ATTEMPTS = 5
_failed_attempts: dict[str, list[datetime]] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _key(email: str, client_ip: str) -> str:
    return f"{email.lower()}::{client_ip}"


def _prune(timestamps: list[datetime]) -> list[datetime]:
    cutoff = _now() - timedelta(minutes=WINDOW_MINUTES)
    return [ts for ts in timestamps if ts >= cutoff]


def check_rate_limit(email: str, client_ip: str) -> int:
    timestamps = _prune(_failed_attempts.get(_key(email, client_ip), []))
    _failed_attempts[_key(email, client_ip)] = timestamps
    if len(timestamps) < MAX_ATTEMPTS:
        return 0
    retry_after = int((timestamps[0] + timedelta(minutes=WINDOW_MINUTES) - _now()).total_seconds())
    return max(retry_after, 1)


def record_failed_attempt(email: str, client_ip: str) -> None:
    key = _key(email, client_ip)
    timestamps = _prune(_failed_attempts.get(key, []))
    timestamps.append(_now())
    _failed_attempts[key] = timestamps


def clear_failed_attempts(email: str, client_ip: str) -> None:
    _failed_attempts.pop(_key(email, client_ip), None)


def purge_old_failed_attempts() -> None:
    for key, timestamps in list(_failed_attempts.items()):
        pruned = _prune(timestamps)
        if pruned:
            _failed_attempts[key] = pruned
        else:
            _failed_attempts.pop(key, None)
