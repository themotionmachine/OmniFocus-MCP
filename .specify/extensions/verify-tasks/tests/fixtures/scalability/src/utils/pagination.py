"""Pagination utility — T036, T040."""
from typing import List


def paginate(items: List, page: int, page_size: int) -> List:
    """Return the slice of items for the given page (1-indexed)."""
    start = (page - 1) * page_size
    return items[start: start + page_size]
