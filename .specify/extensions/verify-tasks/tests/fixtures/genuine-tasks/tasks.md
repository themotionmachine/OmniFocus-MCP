# Tasks: Genuine Completion Test Fixture

**Feature**: Genuine Implementation Fixture
**Purpose**: Synthetic fixture with 10 completed tasks that are ALL genuinely and correctly implemented. Every task passes all five verification layers. Used to validate that `/speckit.verify-tasks` produces zero NOT_FOUND verdicts.

---

## Tasks

- [X] T001 Create `Calculator` class in `tests/fixtures/genuine-tasks/src/calculator.py` with `add(a, b)` and `subtract(a, b)` methods
- [X] T002 Add `multiply(a, b)` and `divide(a, b)` methods to `Calculator` class in `tests/fixtures/genuine-tasks/src/calculator.py`
- [X] T003 Create `tests/fixtures/genuine-tasks/src/validator.py` with `validate_email(email)` function returning bool
- [X] T004 Add `validate_phone(phone)` function to `tests/fixtures/genuine-tasks/src/validator.py`
- [X] T005 Create `tests/fixtures/genuine-tasks/src/formatter.py` with `format_currency(amount, currency)` function
- [X] T006 Add `format_date(dt, fmt)` function to `tests/fixtures/genuine-tasks/src/formatter.py`
- [X] T007 Create `tests/fixtures/genuine-tasks/src/storage.py` with `FileStore` class implementing `save(key, data)` and `load(key)` methods
- [X] T008 Create `tests/fixtures/genuine-tasks/src/runner.py` that imports `Calculator` from `tests/fixtures/genuine-tasks/src/calculator.py` and runs a demo
- [X] T009 Create `tests/fixtures/genuine-tasks/src/pipeline.py` with `Pipeline` class that chains `validate_email` and `format_currency`
- [X] T010 Create `tests/fixtures/genuine-tasks/src/app.py` that imports and uses `FileStore`, `Pipeline`, and `Calculator`
