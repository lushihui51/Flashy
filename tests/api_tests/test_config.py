from app.config import Settings


def test_settings_start_without_a_test_database_url(monkeypatch):
    """Production sets the five variables alone, so the settings must build from them
    with no .env file and no TEST_DATABASE_URL."""
    for name in ("TEST_DATABASE_URL", "DEV_AUTH_USER_ID", "ENV"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/flashy")
    monkeypatch.setenv("PERMITTED_ORIGINS", '["https://flashy.example"]')
    monkeypatch.setenv("CLERK_FAPI_URL", "https://clerk.flashy.example")
    monkeypatch.setenv("VITE_CLERK_PUBLISHABLE_KEY", "pk_live_placeholder")
    monkeypatch.setenv("CLERK_SECRET_KEY", "sk_live_placeholder")

    settings = Settings(_env_file=None)  # type: ignore[call-arg]

    assert settings.test_database_url is None
