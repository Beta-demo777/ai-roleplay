from pathlib import Path
from typing import Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]
EVN_FILE = PROJECT_ROOT / ".env" 

class Settings(BaseSettings):
    POSTGRES_USER:str
    POSTGRES_PASSWORD:str
    POSTGRES_DB:str
    POSTGRES_HOST:str = "localhost"
    POSTGRES_PORT:int = 5432
    AUTH_ENABLED: bool = False
    APP_ADMIN_PASSWORD: Optional[str] = None
    APP_SECRET_KEY: Optional[str] = None
    AUTH_COOKIE_SECURE: bool = False
    AUTH_SESSION_HOURS: int = 24
    MODEL_CREDENTIAL_KEY: Optional[str] = None
    INTERNAL_SERVICE_TOKEN: str = "aura-internal-local"

    model_config = SettingsConfigDict(
        env_file = EVN_FILE,
        extra = "ignore",
    )

    @model_validator(mode="after")
    def validate_auth_settings(self):
        if self.AUTH_ENABLED and (not self.APP_ADMIN_PASSWORD or not self.APP_SECRET_KEY):
            raise ValueError(
                "APP_ADMIN_PASSWORD and APP_SECRET_KEY are required when AUTH_ENABLED=true"
            )
        if self.AUTH_SESSION_HOURS < 1:
            raise ValueError("AUTH_SESSION_HOURS must be at least 1")
        return self

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
