from functools import wraps
from inspect import signature
from threading import Lock
from time import monotonic

_cache: dict[tuple, tuple[float, object]] = {}
_lock = Lock()
_TTL_SECONDS = 30
_MAX_ENTRIES = 512


def clear_response_cache():
    with _lock:
        _cache.clear()


def cache_response(func):
    sig = signature(func)

    @wraps(func)
    def wrapped(*args, **kwargs):
        bound = sig.bind_partial(*args, **kwargs)
        key = (func.__module__, func.__name__, *sorted((name, repr(value)) for name, value in bound.arguments.items()))
        now = monotonic()
        with _lock:
            cached = _cache.get(key)
            if cached and cached[0] > now:
                return cached[1]
            _cache.pop(key, None)

        result = func(*args, **kwargs)
        with _lock:
            if len(_cache) >= _MAX_ENTRIES:
                _cache.pop(next(iter(_cache)))
            _cache[key] = (now + _TTL_SECONDS, result)
        return result

    return wrapped
