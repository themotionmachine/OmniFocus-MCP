"""Database connection — T031, T033."""
from contextlib import contextmanager


class DBConnection:
    def __init__(self, url: str = "sqlite:///:memory:"):
        self._url = url
        self._conn = None

    def connect(self):
        self._conn = {"url": self._url, "open": True}
        return self._conn

    def disconnect(self):
        if self._conn:
            self._conn["open"] = False
            self._conn = None

    def execute(self, query: str):
        if not self._conn or not self._conn.get("open"):
            raise RuntimeError("Not connected")
        return []

    @contextmanager
    def transaction(self):
        self.connect()
        try:
            yield self
            # commit (simulated)
        except Exception:
            # rollback (simulated)
            raise
        finally:
            self.disconnect()
