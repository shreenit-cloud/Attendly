from supabase import create_client, Client
from app.config import get_settings

settings = get_settings()

_supabase_client: Client | None = None


def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase_client


#shortcut: using sync client for simplicity; switch to async with asyncpg if needed for high concurrency
supabase = get_supabase()