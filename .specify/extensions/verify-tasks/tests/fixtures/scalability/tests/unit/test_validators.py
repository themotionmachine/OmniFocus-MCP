"""Unit tests for validate_email — T045."""
from utils.validators import validate_email


def test_valid_email():
    assert validate_email("user@example.com") is True


def test_invalid_email_no_at():
    assert validate_email("notanemail") is False


def test_invalid_email_no_domain():
    assert validate_email("user@") is False
