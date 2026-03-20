"""
Application configuration.
Genuine implementation — T004.
"""
from dataclasses import dataclass


@dataclass
class AppConfig:
    """Holds application configuration values."""
    host: str = "0.0.0.0"
    port: int = 8080
    debug: bool = False
