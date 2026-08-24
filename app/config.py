from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    test_database_url: str
    cache_host: str
    cache_port: str
    permitted_origins: list[str]
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    vite_clerk_publishable_key: str
    clerk_fapi_url: str
    dev_auth_user_id: str | None = None
    env: str | None = None


settings = Settings()  # type: ignore[call-arg]
