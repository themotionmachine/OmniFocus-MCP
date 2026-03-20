"""User handler — T016, T019."""
from services.user_service import UserService


class UserHandler:
    def __init__(self, service: UserService = None):
        self._svc = service or UserService()

    def create(self, request):
        body = request.get("body", {})
        user = self._svc.register(body["name"], body["email"])
        return {"status": 201, "body": user.to_dict()}

    def update(self, request):
        body = request.get("body", {})
        return {"status": 200, "body": body}
