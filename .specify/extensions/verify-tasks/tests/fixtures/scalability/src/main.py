"""Application entry point — T049."""
from config.settings import Settings
from config.logging_config import configure_logging
from app import create_app


def main():
    settings = Settings.from_env()
    configure_logging("DEBUG" if settings.debug else "INFO")
    router = create_app(settings)
    print(f"[main] Application ready — {len(router._routes)} routes registered")


if __name__ == "__main__":
    main()
