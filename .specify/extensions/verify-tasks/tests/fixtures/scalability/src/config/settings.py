"""Application settings — T026, T027."""
import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class Settings:
    database_url: str = "sqlite:///:memory:"
    secret_key: str = "dev-secret"
    debug: bool = False
    allowed_hosts: List[str] = field(default_factory=lambda: ["localhost"])

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            database_url=os.environ.get("DATABASE_URL", "sqlite:///:memory:"),
            secret_key=os.environ.get("SECRET_KEY", "dev-secret"),
            debug=os.environ.get("DEBUG", "false").lower() == "true",
            allowed_hosts=os.environ.get("ALLOWED_HOSTS", "localhost").split(","),
        )
