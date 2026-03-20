"""
Utility helpers.
PHANTOM T008: parse_request_body is absent. Only unrelated utilities are present.
"""


def format_date(dt):
    """Format a datetime object to ISO string."""
    return dt.isoformat()


def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    return text.lower().replace(" ", "-")
