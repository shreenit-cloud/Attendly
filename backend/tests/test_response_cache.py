from app.core.response_cache import cache_response, clear_response_cache


def test_cache_reuses_response_until_invalidated():
    calls = 0

    @cache_response
    def read_dashboard(user_id):
        nonlocal calls
        calls += 1
        return {"calls": calls}

    clear_response_cache()
    assert read_dashboard("teacher-1") == {"calls": 1}
    assert read_dashboard("teacher-1") == {"calls": 1}
    assert calls == 1
    clear_response_cache()
    assert read_dashboard("teacher-1") == {"calls": 2}
