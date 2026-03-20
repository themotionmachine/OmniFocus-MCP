"""Logging configuration — T028."""
import logging


def configure_logging(level: str = "INFO") -> None:
    """Configure the root logger with the given level string."""
    numeric = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(level=numeric, format="%(asctime)s %(levelname)s %(name)s %(message)s")
