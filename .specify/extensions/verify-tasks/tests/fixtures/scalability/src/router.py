"""Router — T047, T048."""
from typing import Dict, Callable


class Router:
    """Maps URL patterns to handler callables."""

    def __init__(self):
        self._routes: Dict[str, Callable] = {}

    def register(self, path: str, handler: Callable) -> None:
        """Register a handler for the given path pattern."""
        self._routes[path] = handler

    def dispatch(self, request: dict):
        """Dispatch a request to the matching handler."""
        path = request.get("path", "/")
        handler = self._routes.get(path)
        if handler is None:
            return {"status": 404, "body": "Not Found"}
        return handler(request)
