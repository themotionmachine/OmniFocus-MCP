"""Unit tests for UserService.register — T041."""
from services.user_service import UserService


def test_register_creates_user():
    svc = UserService()
    user = svc.register("Alice", "alice@example.com")
    assert user.name == "Alice"
    assert user.email == "alice@example.com"
    assert user.id


def test_register_persists_user():
    svc = UserService()
    u1 = svc.register("Bob", "bob@example.com")
    found = svc._repo.find_by_id(u1.id)
    assert found is not None
    assert found.email == "bob@example.com"
