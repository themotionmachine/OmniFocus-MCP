"""User repository — T006, T010."""
from typing import Optional, Dict
from models.user import User


class UserRepository:
    def __init__(self):
        self._store: Dict[str, User] = {}

    def find_by_id(self, id: str) -> Optional[User]:
        return self._store.get(id)

    def save(self, user: User) -> None:
        self._store[user.id] = user

    def delete(self, id: str) -> None:
        self._store.pop(id, None)
