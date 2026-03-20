"""Input validators — T039, T040."""
import re
import uuid


def validate_email(email: str) -> bool:
    """Return True if email matches a basic RFC-5322 pattern."""
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))


def validate_uuid(value: str) -> bool:
    """Return True if value is a valid UUID."""
    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False
