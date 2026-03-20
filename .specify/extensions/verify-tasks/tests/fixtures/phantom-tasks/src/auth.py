"""
User authentication module.
Genuine implementation — T001, T002.
"""

import time
import hmac
import hashlib


class UserAuth:
    """Handles user authentication and token management."""

    SECRET_KEY = "change-me-in-production"

    def __init__(self):
        self._revoked = set()

    def issue_token(self, user_id: str, ttl: int = 3600) -> str:
        """Issue a signed token for the given user."""
        payload = f"{user_id}:{int(time.time()) + ttl}"
        sig = hmac.new(self.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return f"{payload}.{sig}"

    def validate_token(self, token: str) -> bool:
        """Check JWT expiry and signature. Returns True if valid."""
        try:
            payload, sig = token.rsplit(".", 1)
            expected = hmac.new(self.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(sig, expected):
                return False
            _, expiry = payload.split(":")
            return int(expiry) > int(time.time()) and token not in self._revoked
        except (ValueError, AttributeError):
            return False
