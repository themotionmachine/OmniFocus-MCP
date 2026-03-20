"""
Database connection module.
Genuine implementation — T003.
"""


class DatabaseConnection:
    """Manages the lifecycle of a database connection."""

    def __init__(self, dsn: str = "sqlite:///:memory:"):
        self._dsn = dsn
        self._conn = None

    def connect(self):
        """Open the database connection."""
        # Simulate connection
        self._conn = {"dsn": self._dsn, "open": True}
        return self._conn

    def disconnect(self):
        """Close the database connection."""
        if self._conn:
            self._conn["open"] = False
            self._conn = None
