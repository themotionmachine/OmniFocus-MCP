"""Logging middleware — T022."""
import sys


class LoggingMiddleware:
    def __call__(self, request, next_handler):
        print(f"[LOG] {request.get('method', 'GET')} {request.get('path', '/')}", file=sys.stdout)
        response = next_handler(request)
        print(f"[LOG] → {response.get('status', 200)}", file=sys.stdout)
        return response
