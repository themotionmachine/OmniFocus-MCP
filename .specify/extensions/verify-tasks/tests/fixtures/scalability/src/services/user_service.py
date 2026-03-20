"""User service — T011."""
import uuid
from models.user import User
from repos.user_repo import UserRepository


class UserService:
    def __init__(self, repo: UserRepository = None):
        self._repo = repo or UserRepository()

    def register(self, name: str, email: str) -> User:
        user = User(id=str(uuid.uuid4()), name=name, email=email)
        self._repo.save(user)
        return user
