"""
Application entry point.
Wires together genuine modules (T001-T004). Does NOT import phantom modules.
"""

from auth import UserAuth
from db import DatabaseConnection
from config import AppConfig


def main():
    """Start the application using genuine modules."""
    config = AppConfig(host="localhost", port=9090, debug=True)
    db = DatabaseConnection(dsn=f"sqlite:///{config.host}.db")
    db.connect()

    auth = UserAuth()
    token = auth.issue_token("user-1")
    is_valid = auth.validate_token(token)
    print(f"Token valid: {is_valid}")

    db.disconnect()


if __name__ == "__main__":
    main()
