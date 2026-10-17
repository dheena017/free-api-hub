from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Free API Hub"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    PROXY_TIMEOUT_SECONDS: int = 10
    DATA_FILE_PATH: str = os.path.join(
        os.path.dirname(__file__), "data", "apis.json"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
