# Tasks: Edge-Cases Test Fixture

**Feature**: Edge Cases Fixture
**Purpose**: Synthetic fixture testing edge-case task entries. Used to validate that `/speckit.verify-tasks` handles unusual inputs gracefully without crashing.

---

## Tasks

<!-- EC001: Behavioral-only task — no file paths, no code references -->
- [X] EC001 Ensure the application startup sequence logs a welcoming banner to stdout before accepting connections

<!-- EC002: Malformed entry — broken checkbox syntax (space instead of X) -->
- [ ] EC002 Add retry logic with exponential backoff to the HTTP client

<!-- EC003: Missing task ID — no identifier token after checkbox -->
- [X] Implement the database migration runner that applies pending migrations on startup

<!-- EC004: Glob pattern path reference -->
- [X] EC004 Write unit tests for all validator functions in `tests/fixtures/edge-cases/tests/**/*.test.py`

<!-- EC005: Nested subtask structure -->
- [X] EC005 Set up the CI pipeline
  - [X] EC005.1 Add `tests/fixtures/edge-cases/.github/workflows/ci.yml` with test job
  - [X] EC005.2 Configure linting step using `flake8` in `ci.yml`

<!-- EC006: Zero [X] tasks scenario — everything below is incomplete -->
- [ ] EC006 Deploy the application to production

<!-- EC007: Task with no associated files that do exist in repo -->
- [X] EC007 Review and approve the API design document for consistency with REST best practices

<!-- EC008: Multiple file references in one task -->
- [X] EC008 Refactor `tests/fixtures/edge-cases/src/auth.py` and `tests/fixtures/edge-cases/src/db.py` to share a common `BaseService` class defined in `tests/fixtures/edge-cases/src/base.py`
