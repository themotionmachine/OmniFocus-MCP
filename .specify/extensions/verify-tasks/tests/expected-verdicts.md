# Expected Verdicts: Test Fixture Validation Reference

**Date**: 2026-03-12
**Purpose**: Document the expected evidence level for every task in every test fixture. Use this to validate that `/speckit.verify-tasks` produces correct results when run against each fixture.

**Pass criteria**:

- Phantom fixture: ALL phantom verdicts must be `NOT_FOUND`, `PARTIAL`, or `WEAK`; all genuine tasks must be `VERIFIED`
- Genuine fixture: ALL tasks must produce `VERIFIED` (zero `NOT_FOUND`)
- Edge-case fixture: Warnings emitted for malformed/missing IDs; behavioral-only tasks produce `SKIPPED`
- Scalability fixture: 42 `VERIFIED`, 8 `PARTIAL` (dead code or stubs); zero `NOT_FOUND` or `SKIPPED`

---

## Fixture 1: Phantom Tasks (`tests/fixtures/phantom-tasks/`)

This fixture contains 10 `[X]` tasks. 5 are genuinely implemented; 5 are planted phantoms.

### Phantom Type Key

- **PH-MISSING**: File does not exist
- **PH-EMPTY**: File exists but class/function body is incomplete
- **PH-DEAD**: Symbol declared but never referenced by any other file
- **PH-WRONGFN**: File exists but the required function is absent (different functions present)
- **PH-BEHAVIORAL**: Class exists but a required method is absent

### Phantom Expected Verdicts

| Task | Expected Verdict | Phantom Type | Rationale |
|------|-----------------|--------------|-----------|
| T001 | ✅ VERIFIED | — | `tests/fixtures/phantom-tasks/src/auth.py` exists; `UserAuth` class defined with all methods; imported and used by `tests/fixtures/phantom-tasks/src/main.py` (Layer 4 ✅ wired) |
| T002 | ✅ VERIFIED | — | `validate_token` function fully implemented in `tests/fixtures/phantom-tasks/src/auth.py`; called by `tests/fixtures/phantom-tasks/src/main.py` (Layer 4 ✅ wired) |
| T003 | ✅ VERIFIED | — | `tests/fixtures/phantom-tasks/src/db.py` exists; `DatabaseConnection` class with `connect()` and `disconnect()` present; imported and used by `tests/fixtures/phantom-tasks/src/main.py` (Layer 4 ✅ wired) |
| T004 | ✅ VERIFIED | — | `tests/fixtures/phantom-tasks/src/config.py` exists; `AppConfig` dataclass with `host`, `port`, `debug` fields present; imported and used by `tests/fixtures/phantom-tasks/src/main.py` (Layer 4 ✅ wired) |
| T005 | ❌ NOT_FOUND | **PH-MISSING** | `tests/fixtures/phantom-tasks/src/notifier.py` does not exist — Layer 1 (file existence) fails; no evidence in any layer |
| T006 | 🔍 PARTIAL | **PH-EMPTY** | `tests/fixtures/phantom-tasks/src/cache.py` exists (Layer 1 ✅); `CacheManager` is declared (Layer 3 ✅); but `get()` and `set()` methods are absent (Layer 3 ❌ for method patterns); `CacheManager` never imported or referenced by other source files (Layer 4 ❌ dead code); class body is `pass` — stub with zero methods (Layer 5 ❌ semantic) |
| T007 | 🔍 PARTIAL | **PH-DEAD** | `tests/fixtures/phantom-tasks/src/routes.py` exists (Layer 1 ✅); `register_routes` function declared (Layer 3 ✅); but no other file imports or calls it (Layer 4 ❌ dead code); function body is `pass` — no endpoints wired (Layer 5 ❌ semantic) |
| T008 | 🔍 PARTIAL | **PH-WRONGFN** | `tests/fixtures/phantom-tasks/src/utils.py` exists (Layer 1 ✅); but `parse_request_body` is not present — only unrelated functions `format_date` and `slugify` exist (Layer 3 ❌); at least one layer positive + at least one negative → PARTIAL |
| T009 | 🔍 PARTIAL | **PH-BEHAVIORAL** | `tests/fixtures/phantom-tasks/src/middleware.py` exists (Layer 1 ✅); `LoggingMiddleware` class declared (Layer 3 ✅); but `__call__` method is absent (Layer 3 ❌ for `__call__` pattern); `LoggingMiddleware` never imported or referenced by other source files (Layer 4 ❌ dead code); only `__init__` present — cannot function as middleware (Layer 5 ❌ semantic) |
| T010 | ❌ NOT_FOUND | **PH-MISSING** | `tests/fixtures/phantom-tasks/src/events.py` does not exist — Layer 1 fails; no evidence in any layer |

### Phantom Summary Scorecard

| Verdict | Count |
|---------|-------|
| ✅ VERIFIED | 4 |
| 🔍 PARTIAL | 4 |
| ⚠️ WEAK | 0 |
| ❌ NOT_FOUND | 2 |
| ⏭️ SKIPPED | 0 |

---

## Fixture 2: Genuine Tasks (`tests/fixtures/genuine-tasks/`)

All 10 tasks are genuinely implemented. Zero `NOT_FOUND` verdicts expected.

### Genuine Expected Verdicts

| Task | Expected Verdict | Rationale |
|------|-----------------|-----------|
| T001 | ✅ VERIFIED | `tests/fixtures/genuine-tasks/src/calculator.py` exists; `Calculator` class with `add()` and `subtract()` present; referenced by `runner.py` and `app.py` |
| T002 | ✅ VERIFIED | `multiply()` and `divide()` present in `Calculator`; both called via `runner.py` and `app.py` |
| T003 | ✅ VERIFIED | `tests/fixtures/genuine-tasks/src/validator.py` exists; `validate_email` function present and imported by `pipeline.py` |
| T004 | ✅ VERIFIED | `validate_phone` function present in `tests/fixtures/genuine-tasks/src/validator.py` |
| T005 | ✅ VERIFIED | `tests/fixtures/genuine-tasks/src/formatter.py` exists; `format_currency` present and imported by `pipeline.py` and `app.py` |
| T006 | ✅ VERIFIED | `format_date` present in `tests/fixtures/genuine-tasks/src/formatter.py` |
| T007 | ✅ VERIFIED | `tests/fixtures/genuine-tasks/src/storage.py` exists; `FileStore` class with `save()` and `load()` present; imported by `app.py` |
| T008 | ✅ VERIFIED | `tests/fixtures/genuine-tasks/src/runner.py` exists; imports `Calculator` and calls `add`, `subtract`, `multiply`, `divide` |
| T009 | ✅ VERIFIED | `tests/fixtures/genuine-tasks/src/pipeline.py` exists; `Pipeline` class with `process()` method that calls `validate_email` and `format_currency`; imported by `app.py` |
| T010 | ✅ VERIFIED | `tests/fixtures/genuine-tasks/src/app.py` exists; imports and uses `FileStore`, `Pipeline`, and `Calculator` |

### Genuine Summary Scorecard

| Verdict | Count |
|---------|-------|
| ✅ VERIFIED | 10 |
| 🔍 PARTIAL | 0 |
| ⚠️ WEAK | 0 |
| ❌ NOT_FOUND | 0 |
| ⏭️ SKIPPED | 0 |

---

## Fixture 3: Edge Cases (`tests/fixtures/edge-cases/`)

This fixture tests unusual and boundary inputs. Not all entries are valid `[X]` tasks.

### Expected Behaviors

| Entry | Expected Verdict | Expected Warning/Behavior | Rationale |
|-------|-----------------|--------------------------|-----------|
| EC001 | ⏭️ SKIPPED | None | Behavioral-only task (no file paths, no code references) — all mechanical layers N/A; semantic assessment cannot confirm or deny without referenced files |
| EC002 | *(not verified)* | None — task is `[ ]` (incomplete) | Task checkbox is `[ ]` not `[X]` — should not appear in the verified task list |
| EC003 (no ID) | ⚠️ WEAK or ⏭️ SKIPPED | `WARNING: No task ID found on line {n}` | Missing task ID — ID synthesized as `LINE-{n}`; no file paths in the description so likely SKIPPED |
| EC004 | ❌ NOT_FOUND or ⏭️ SKIPPED | None | Glob path `tests/fixtures/edge-cases/tests/**/*.test.py` — no matching files exist; Layer 1 returns `not_applicable` or `negative` depending on glob behavior |
| EC005 | ⏭️ SKIPPED | None | Parent task has no direct file references — SKIPPED |
| EC005.1 | ❌ NOT_FOUND | None | `tests/fixtures/edge-cases/.github/workflows/ci.yml` referenced but does not exist |
| EC005.2 | ❌ NOT_FOUND | None | `ci.yml` referenced but does not exist; `flake8` pattern not found |
| EC006 | *(not verified)* | None — task is `[ ]` | Incomplete task, not in the verification set |
| EC007 | ⏭️ SKIPPED | None | No file paths or code references — pure review/approval task; all mechanical layers N/A |
| EC008 | ❌ NOT_FOUND | None | `tests/fixtures/edge-cases/src/auth.py`, `tests/fixtures/edge-cases/src/db.py`, `tests/fixtures/edge-cases/src/base.py` do not exist; file existence fails |

### Expected Warnings Emitted

1. `WARNING: No task ID found on line {n}: "- [X] Implement the database migration runner..."` — for EC003
2. No other warnings expected (EC002, EC006 are `[ ]` tasks and correctly excluded)

### Summary Scorecard (Expected, for [X] tasks only)

| Verdict | Count |
|---------|-------|
| ✅ VERIFIED | 0 |
| 🔍 PARTIAL | 0 |
| ⚠️ WEAK | 0 |
| ❌ NOT_FOUND | 4 |
| ⏭️ SKIPPED | 4 |

Note: EC003 may be WEAK or SKIPPED depending on synthetic ID handling; EC004 may be NOT_FOUND or SKIPPED depending on glob expansion behavior.

---

## Fixture 4: Scalability (`tests/fixtures/scalability/`)

This fixture validates that `/speckit.verify-tasks` can handle 50 completed tasks in a single session. All tasks are `[X]`; all source files exist with real implementations. However, several tasks have dead-code or stub-quality issues that should produce `PARTIAL` verdicts.

### PARTIAL Type Key

- **SC-DEAD**: Symbol exists with real implementation but is never called/imported by any other file
- **SC-STUB**: Symbol exists but body is a stub (hardcoded return, passthrough, or hollow logic)
- **SC-DEAD+STUB**: Both dead code and stub body

### Scalability Expected Verdicts

| Task | Expected Verdict | Flag Type | Rationale |
|------|-----------------|-----------|-----------|
| T001 | ✅ VERIFIED | — | `User` dataclass with all fields; wired across services, repos, handlers |
| T002 | ✅ VERIFIED | — | `Product` dataclass with all fields; wired across layers |
| T003 | ✅ VERIFIED | — | `Order` + `OrderItem` dataclasses; wired in services and repos |
| T004 | ✅ VERIFIED | — | `to_dict()` on all models; called in handlers and serializers |
| T005 | ✅ VERIFIED | — | `models/__init__.py` exports all model classes |
| T006 | ✅ VERIFIED | — | `UserRepository` with `find_by_id` and `save`; wired via services and tests |
| T007 | 🔍 PARTIAL | **SC-DEAD** | `find_all()` declared in `product_repo.py` but never imported/called by any other source file (L4 ❌) |
| T008 | ✅ VERIFIED | — | `OrderRepository` with `find_by_user` and `save`; wired via services and tests |
| T009 | ✅ VERIFIED | — | `repos/__init__.py` exports all repository classes |
| T010 | 🔍 PARTIAL | **SC-DEAD** | `delete()` method present in all three repos with real implementation (`self._store.pop(id, None)`) but never called anywhere — no references in services, handlers, or tests (L4 ❌) |
| T011 | ✅ VERIFIED | — | `UserService.register` wired in handler and tests |
| T012 | ✅ VERIFIED | — | `ProductService.create_product` wired in tests |
| T013 | ✅ VERIFIED | — | `OrderService.place_order` wired in handler and tests |
| T014 | ✅ VERIFIED | — | `get_user_orders` wired in handler and tests |
| T015 | ✅ VERIFIED | — | `services/__init__.py` exports all service classes |
| T016 | ✅ VERIFIED | — | `UserHandler.create` wired via router in `app.py` |
| T017 | 🔍 PARTIAL | **SC-DEAD+STUB** | `get()` never called/referenced outside definition (L4 ❌); `list_all` returns hardcoded `[]` and `get` returns hardcoded `{}` — neither calls service layer (L5 ❌) |
| T018 | 🔍 PARTIAL | **SC-DEAD** | `list()` method never called/referenced outside definition — not wired into router (L4 ❌); `create` is wired via `app.py` |
| T019 | 🔍 PARTIAL | **SC-DEAD+STUB** | `update()` never registered in router or referenced by any other file (L4 ❌); body returns request body as-is without calling any service — passthrough stub (L5 ❌) |
| T020 | ✅ VERIFIED | — | `handlers/__init__.py` exports all handler classes |
| T021 | ✅ VERIFIED | — | `AuthMiddleware.__call__` with auth check logic; imported in `app.py` |
| T022 | ✅ VERIFIED | — | `LoggingMiddleware.__call__` with logging logic; imported in `app.py` |
| T023 | ✅ VERIFIED | — | `CorsMiddleware.__call__` with CORS headers; imported in `app.py` |
| T024 | ✅ VERIFIED | — | `middleware/__init__.py` exports all middleware classes |
| T025 | 🔍 PARTIAL | **SC-DEAD+STUB** | `rate_limit` never imported or called by any file; not exported in `middleware/__init__.py` (L4 ❌); hollow decorator — `_counts` dict created but never read/written, wrapper just calls `func(*args, **kwargs)` (L5 ❌) |
| T026 | ✅ VERIFIED | — | `Settings` dataclass with all fields; wired in `app.py` and `main.py` |
| T027 | ✅ VERIFIED | — | `from_env()` classmethod called in `app.py` and `main.py` |
| T028 | ✅ VERIFIED | — | `configure_logging` wired in `app.py` and `main.py` |
| T029 | ✅ VERIFIED | — | `config/__init__.py` exports `Settings` and `configure_logging` |
| T030 | ✅ VERIFIED | — | `config.yml` with `database_url`, `port`, `debug`, `log_level` keys |
| T031 | ✅ VERIFIED | — | `DBConnection` with `connect`, `disconnect`, `execute`; all wired |
| T032 | ✅ VERIFIED | — | `run_migrations` function wired via `db/__init__.py` |
| T033 | 🔍 PARTIAL | **SC-DEAD** | `transaction()` context manager with proper implementation (connect → yield → disconnect with try/except), but never called/referenced outside its definition — not used in `migrations.py`, `app.py`, or any other file (L4 ❌) |
| T034 | ✅ VERIFIED | — | `db/__init__.py` exports `DBConnection` and `run_migrations` |
| T035 | ✅ VERIFIED | — | SQL migration with `CREATE TABLE` for users, products, orders |
| T036 | ✅ VERIFIED | — | `paginate` wired in `utils/__init__.py` and test |
| T037 | ✅ VERIFIED | — | `to_json` and `from_json` wired in `utils/__init__.py` |
| T038 | ✅ VERIFIED | — | `slugify` wired in `utils/__init__.py` |
| T039 | ✅ VERIFIED | — | `validate_email` and `validate_uuid` wired in `utils/__init__.py` and tests |
| T040 | ✅ VERIFIED | — | `utils/__init__.py` exports all utility functions |
| T041 | ✅ VERIFIED | — | Unit tests for `UserService.register` with assertions |
| T042 | ✅ VERIFIED | — | Unit tests for `ProductService.create_product` with assertions |
| T043 | ✅ VERIFIED | — | Integration tests for `OrderService.place_order` with retrieval verification |
| T044 | ✅ VERIFIED | — | Unit tests for `paginate` covering first page, last page, empty |
| T045 | ✅ VERIFIED | — | Unit tests for `validate_email` covering valid and invalid cases |
| T046 | ✅ VERIFIED | — | `app.py` bootstraps all services, handlers, and router; wired via `main.py` |
| T047 | ✅ VERIFIED | — | `Router` class created and wired in `app.py` |
| T048 | 🔍 PARTIAL | **SC-DEAD** | `register()` wired (called 3× in `app.py`), but `dispatch()` never called anywhere — no file invokes `router.dispatch()` (L4 ❌) |
| T049 | ✅ VERIFIED | — | `main.py` entry point calls `create_app` and `configure_logging` |
| T050 | ✅ VERIFIED | — | `README.md` with structure, setup, and usage documentation |

### Scalability Summary Scorecard

| Verdict | Count |
|---------|-------|
| ✅ VERIFIED | 42 |
| 🔍 PARTIAL | 8 |
| ⚠️ WEAK | 0 |
| ❌ NOT_FOUND | 0 |
| ⏭️ SKIPPED | 0 |

Note: All 8 PARTIALs are genuine implementation quality issues (dead code or stubs), not phantom tasks. Every flagged file exists and has the declared symbol, but wiring or substance is missing.

---

## Validation Instructions

These instructions assume a **separate test repo** with Spec Kit installed and the `verify-tasks` extension enabled (installed at `.specify/extensions/verify-tasks/`).

### Running a Fixture

Scripts automate setup and teardown. Run from the test repo root:

1. **Set up** the fixture (creates branch, feature dir, copies files, commits):

   ```bash
   .specify/extensions/verify-tasks/tests/setup-fixture.sh phantom-tasks
   ```

2. **Run** `/speckit.verify-tasks` in an agent chat session

3. **Compare** the generated report against the expected verdicts and pass/fail criteria above

4. **Tear down** (switches to main, deletes test branch):

   ```bash
   .specify/extensions/verify-tasks/tests/teardown-fixture.sh
   ```

Valid fixture names: `phantom-tasks`, `genuine-tasks`, `edge-cases`, `scalability`.

### Pass/Fail Criteria

| Fixture | Pass Condition |
|---------|---------------|
| **phantom-tasks** | T005, T010 are `NOT_FOUND`; T006, T007, T008, T009 are `PARTIAL`; T001–T004 are `VERIFIED` |
| **genuine-tasks** | All 10 tasks are `VERIFIED`; zero `NOT_FOUND` verdicts |
| **edge-cases** | EC001, EC005, EC007 are `SKIPPED`; EC005.1, EC005.2, EC008 are `NOT_FOUND`; `WARNING` emitted for EC003 missing ID |
| **scalability** | 42 `VERIFIED`, 8 `PARTIAL` (T007, T010, T017, T018, T019, T025, T033, T048); zero `NOT_FOUND`; zero `SKIPPED` |
