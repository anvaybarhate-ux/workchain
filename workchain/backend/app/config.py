import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    WEB3_RPC_URL: str
    PINATA_JWT: str
    PINATA_GATEWAY: str = "https://gateway.pinata.cloud"
    CONTRACT_FACTORY: str
    CONTRACT_REPUTATION: str
    PRIVATE_KEY: str = ""
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000"]
    API_V1_PREFIX: str = "/api"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                # Try to parse it as a JSON array of strings e.g. ["http://localhost:3000"]
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(item) for item in parsed]
            except Exception:
                # Fallback to comma-separated list
                return [i.strip() for i in v.split(",") if i.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
