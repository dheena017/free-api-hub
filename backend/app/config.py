from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
import json
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Free API Hub"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ALLOWED_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    PROXY_TIMEOUT_SECONDS: int = 10
    MAX_REQUEST_BODY_BYTES: int = 1024 * 1024  # 1 MB
    MAX_RESPONSE_BODY_BYTES: int = 5 * 1024 * 1024  # 5 MB
    RATE_LIMIT_PER_MINUTE: int = 60
    MAX_CONCURRENT_OUTBOUND_REQUESTS: int = 10
    DATA_FILE_PATH: str = os.path.join(
        os.path.dirname(__file__), "data", "apis.json"
    )
    SUBMISSIONS_FILE_PATH: str = os.path.join(
        os.path.dirname(__file__), "data", "submissions.json"
    )
    HEALTH_HISTORY_FILE_PATH: str = os.path.join(
        os.path.dirname(__file__), "data", "health_history.json"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    def get_allowed_origins(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, str):
            val = self.ALLOWED_ORIGINS.strip()
            if val.startswith("[") and val.endswith("]"):
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, list):
                        return [str(o).strip() for o in parsed if str(o).strip()]
                except Exception:
                    pass
            return [origin.strip() for origin in val.split(",") if origin.strip()]
        if isinstance(self.ALLOWED_ORIGINS, (list, tuple, set)):
            return [str(origin).strip() for origin in self.ALLOWED_ORIGINS if str(origin).strip()]
        return ["http://localhost:5173", "http://localhost:3000"]

settings = Settings()

