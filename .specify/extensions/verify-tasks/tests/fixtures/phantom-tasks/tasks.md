# Tasks: Phantom Completion Test Fixture

**Feature**: Phantom Detection Fixture
**Purpose**: Synthetic fixture with 10 completed tasks — 5 genuinely implemented and 5 planted phantom completions. Used to validate that `/speckit.verify-tasks` correctly flags phantoms while passing genuine completions.

---

## Tasks

- [X] T001 Create user authentication module with `UserAuth` class in `tests/fixtures/phantom-tasks/src/auth.py`
- [X] T002 Implement `validate_token(token)` function in `tests/fixtures/phantom-tasks/src/auth.py` that checks JWT expiry and signature
- [X] T003 Add `DatabaseConnection` class to `tests/fixtures/phantom-tasks/src/db.py` with `connect()` and `disconnect()` methods
- [X] T004 Create `tests/fixtures/phantom-tasks/src/config.py` with `AppConfig` dataclass holding `host`, `port`, and `debug` fields
- [X] T005 Implement `send_notification(user_id, message)` function in `tests/fixtures/phantom-tasks/src/notifier.py`
- [X] T006 Add `CacheManager` class to `tests/fixtures/phantom-tasks/src/cache.py` with `get(key)` and `set(key, value)` methods
- [X] T007 Create `tests/fixtures/phantom-tasks/src/routes.py` with `register_routes(app)` function that wires all API endpoints
- [X] T008 Implement `parse_request_body(request)` helper in `tests/fixtures/phantom-tasks/src/utils.py`
- [X] T009 Add `LoggingMiddleware` class to `tests/fixtures/phantom-tasks/src/middleware.py` with `__call__` method
- [X] T010 Create `tests/fixtures/phantom-tasks/src/events.py` with `EventEmitter` class and `emit(event_name, data)` method
