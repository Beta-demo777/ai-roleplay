from pydantic_settings import BaseSettings,SettingsConfigDict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
EVN_FILE = PROJECT_ROOT / ".env" 

class Settings(BaseSettings):
    POSTGRES_USER:str
    POSTGRES_PASSWORD:str
    POSTGRES_DB:str
    POSTGRES_HOST:str = "localhost"
    POSTGRES_PORT:int = 5432

    model_config = SettingsConfigDict(
        env_file = EVN_FILE,
        extra = "ignore",
    )

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()