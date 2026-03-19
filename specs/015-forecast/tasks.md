# Tasks: Forecast Tools

**Input**: Design documents from `/specs/015-forecast/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Contracts**: `src/contracts/forecast-tools/`
- **Definitions**: `src/tools/definitions/`
- **Primitives**: `src/tools/primitives/`
- **Contract tests**: `tests/contract/forecast-tools/`
- **Unit tests**: `tests/unit/forecast-tools/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the contracts directory structure and shared schemas that all 3 forecast tools depend on

- [ ] T001 Create shared enum schema with ForecastDayKind (Day, Today, Past, FutureMonth, DistantFuture) and ForecastDayStatus (Available, DueSoon, NoneAvailable, Overdue) in `src/contracts/forecast-tools/shared/forecast-enums.ts`
- [ ] T002 Create shared ForecastDayOutput schema (date, name, kind, badgeCount, badgeStatus, deferredCount) in `src/contracts/forecast-tools/shared/forecast-day.ts`
- [ ] T003 Create barrel export for shared schemas in `src/contracts/forecast-tools/shared/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contract tests that validate the enum and ForecastDayOutput schemas used by all 3 tools. MUST be complete before any user story implementation.

**CRITICAL**: No user story work can begin until this phase is complete.

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T004 Write contract tests for ForecastDayKind enum, ForecastDayStatus enum, and ForecastDayOutput schema in `tests/contract/forecast-tools/shared.contract.test.ts` -- verify FAILS (schemas do not exist yet)

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T005 Implement shared schemas from T001-T003 to make shared contract tests GREEN
- [ ] T006 Create barrel export for forecast-tools contracts in `src/contracts/forecast-tools/index.ts` (initially exports only shared schemas; tool-specific schemas added in later phases)

**Checkpoint**: Shared schemas validated and exported. `pnpm test -- --testPathPattern=contract/forecast-tools/shared` passes.

---

## Phase 3: User Story 1 - Forecast Overview for a Date Range (Priority: P1) -- MVP

**Goal**: Users can retrieve forecast data for a configurable date range, defaulting to today + 7 days, with per-day summaries including date, name, kind, badge count, badge status, and deferred count.

**Independent Test**: Request a forecast range and verify each day returns all 6 ForecastDayOutput fields in chronological order. Covers FR-001, FR-002, FR-003, FR-004, FR-008, FR-009, FR-011, FR-012.

**FR Coverage**: FR-001, FR-002, FR-003, FR-004, FR-008, FR-009, FR-011, FR-012

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T007 [P] [US1] Write contract tests for GetForecastRangeInput, GetForecastRangeSuccess, GetForecastRangeError, and GetForecastRangeResponse schemas in `tests/contract/forecast-tools/get-forecast-range.contract.test.ts` -- verify FAILS
- [ ] T008 [P] [US1] Write unit tests for getForecastRange primitive (default dates, custom range, date validation, range validation, 90-day limit, OmniJS script generation including kindToString/statusToString mapping for all ForecastDay.Kind and ForecastDay.Status enum values per FR-003/FR-004, perspective switch, error handling) in `tests/unit/forecast-tools/getForecastRange.test.ts` -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T009 [US1] Create get-forecast-range contract schemas (input, success, error, discriminated union response) in `src/contracts/forecast-tools/get-forecast-range.ts` -- contract tests GREEN
- [ ] T010 [US1] Update barrel export in `src/contracts/forecast-tools/index.ts` to include get-forecast-range exports
- [ ] T011 [US1] Implement getForecastRange primitive with date validation (INVALID_DATE, INVALID_RANGE, RANGE_TOO_LARGE), default date logic (today + 7 days), OmniJS script generation (synchronous IIFE, perspective switch, Calendar/DateComponents iteration, kindToString/statusToString helpers, NO_WINDOW check), and executeOmniFocusScript call in `src/tools/primitives/getForecastRange.ts` -- unit tests GREEN
- [ ] T012 [US1] Implement getForecastRange MCP definition with tool name, description referencing FR-001 defaults, Zod input schema, and primitive delegation in `src/tools/definitions/getForecastRange.ts`
- [ ] T013 [US1] Register get_forecast_range tool in `src/server.ts`

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T014 [US1] Run `pnpm build && pnpm test -- --testPathPattern=forecast` -- verify all forecast tests GREEN
- [ ] T015 [US1] Verify OmniJS script for get_forecast_range in OmniFocus Script Editor (test with default range and custom range)

**Checkpoint**: User Story 1 fully functional. `get_forecast_range` returns per-day forecast summaries for any valid date range.

---

## Phase 4: User Story 2 - Detailed Forecast for a Specific Day (Priority: P2) [P]

**Goal**: Users can get detailed forecast data for a single specific date, defaulting to today, with all 6 ForecastDayOutput fields.

**Independent Test**: Request forecast data for a single date and verify the response includes date, name, kind, badge count, badge status, and deferred count. Covers FR-002, FR-003, FR-004, FR-005, FR-008, FR-009.

**FR Coverage**: FR-002, FR-003, FR-004, FR-005, FR-008, FR-009

**Note**: This phase can run in parallel with Phase 3 after Foundation (Phase 2) is complete. Both tools share the same ForecastDayOutput schema but operate on different files.

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T016 [P] [US2] Write contract tests for GetForecastDayInput, GetForecastDaySuccess, GetForecastDayError, and GetForecastDayResponse schemas in `tests/contract/forecast-tools/get-forecast-day.contract.test.ts` -- verify FAILS
- [ ] T017 [P] [US2] Write unit tests for getForecastDay primitive (default date today, custom date, date validation, OmniJS script generation including kindToString/statusToString mapping for all ForecastDay.Kind and ForecastDay.Status enum values per FR-003/FR-004, perspective switch, error handling) in `tests/unit/forecast-tools/getForecastDay.test.ts` -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T018 [US2] Create get-forecast-day contract schemas (input, success, error, discriminated union response) in `src/contracts/forecast-tools/get-forecast-day.ts` -- contract tests GREEN
- [ ] T019 [US2] Update barrel export in `src/contracts/forecast-tools/index.ts` to include get-forecast-day exports
- [ ] T020 [US2] Implement getForecastDay primitive with date validation (INVALID_DATE), default date logic (today), OmniJS script generation (synchronous IIFE, perspective switch, single forecastDayForDate call, kindToString/statusToString helpers, NO_WINDOW check), and executeOmniFocusScript call in `src/tools/primitives/getForecastDay.ts` -- unit tests GREEN
- [ ] T021 [US2] Implement getForecastDay MCP definition with tool name, description referencing FR-005 defaults, Zod input schema, and primitive delegation in `src/tools/definitions/getForecastDay.ts`
- [ ] T022 [US2] Register get_forecast_day tool in `src/server.ts`

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T023 [US2] Run `pnpm build && pnpm test -- --testPathPattern=forecast` -- verify all forecast tests GREEN
- [ ] T024 [US2] Verify OmniJS script for get_forecast_day in OmniFocus Script Editor (test with today and a specific date)

**Checkpoint**: User Stories 1 AND 2 both work independently. Both read-only forecast query tools are functional.

---

## Phase 5: User Story 3 - Navigate Forecast Perspective to Specific Days (Priority: P3) [P]

**Goal**: Users can navigate the Forecast perspective to one or more specified dates, with the response always including a UI state change warning.

**Independent Test**: Request navigation to specific dates and verify the Forecast perspective shows those dates selected. Verify the response includes the warning field. Covers FR-006, FR-007, FR-008, FR-009, FR-010.

**FR Coverage**: FR-006, FR-007, FR-008, FR-009, FR-010

**Note**: This phase can run in parallel with Phases 3 and 4 after Foundation (Phase 2) is complete. Uses selectForecastDays() API (UI-affecting pattern, mirrors switch_perspective).

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T025 [P] [US3] Write contract tests for SelectForecastDaysInput (min 1, max 90 dates), SelectForecastDaysSuccess (with warning field), SelectForecastDaysError, and SelectForecastDaysResponse schemas in `tests/contract/forecast-tools/select-forecast-days.contract.test.ts` -- verify FAILS
- [ ] T026 [P] [US3] Write unit tests for selectForecastDays primitive (single date, multiple dates, date validation, empty dates rejection, OmniJS script generation with selectForecastDays() call, perspective switch, warning field presence, error handling) in `tests/unit/forecast-tools/selectForecastDays.test.ts` -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T027 [US3] Create select-forecast-days contract schemas (input with min/max array constraints, success with warning field, error, discriminated union response) in `src/contracts/forecast-tools/select-forecast-days.ts` -- contract tests GREEN
- [ ] T028 [US3] Update barrel export in `src/contracts/forecast-tools/index.ts` to include select-forecast-days exports
- [ ] T029 [US3] Implement selectForecastDays primitive with date validation (INVALID_DATE, EMPTY_DATES), OmniJS script generation (synchronous IIFE, perspective switch, forecastDayForDate() for each date then selectForecastDays(fdays), NO_WINDOW check, fixed warning string per FR-007), and executeOmniFocusScript call in `src/tools/primitives/selectForecastDays.ts` -- unit tests GREEN
- [ ] T030 [US3] Implement selectForecastDays MCP definition with tool name, description including FR-007 UI warning, Zod input schema, and primitive delegation in `src/tools/definitions/selectForecastDays.ts`
- [ ] T031 [US3] Register select_forecast_days tool in `src/server.ts`

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T032 [US3] Run `pnpm build && pnpm test -- --testPathPattern=forecast` -- verify all forecast tests GREEN
- [ ] T033 [US3] Verify OmniJS script for select_forecast_days in OmniFocus Script Editor (test with single date and multiple dates; confirm Forecast perspective navigates)

**Checkpoint**: All 3 user stories independently functional. All forecast tools operational.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, integration checks, and cleanup across all 3 forecast tools

- [ ] T034 [P] Run `pnpm lint` and fix any Biome issues across all new forecast files
- [ ] T035 [P] Run `pnpm typecheck` and resolve any TypeScript errors across all new forecast files
- [ ] T036 Run full test suite: `pnpm test` -- verify no regressions in existing tools (2291+ tests stay GREEN)
- [ ] T037 Run coverage check: `pnpm test:coverage` -- verify new forecast code has adequate coverage
- [ ] T038 Run quickstart.md validation: test all 3 tools with the example inputs/outputs from `specs/015-forecast/quickstart.md`
- [ ] T039 Run `pnpm build` and verify all 3 forecast tools appear in MCP tool listing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion -- BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) -- can run in parallel with US2 and US3
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) -- can run in parallel with US1 and US3
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) -- can run in parallel with US1 and US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: get_forecast_range -- No dependencies on other stories. Uses shared ForecastDayOutput schema.
- **User Story 2 (P2)**: get_forecast_day -- No dependencies on other stories. Uses same shared ForecastDayOutput schema.
- **User Story 3 (P3)**: select_forecast_days -- No dependencies on other stories. Does NOT use ForecastDayOutput in response (uses selectForecastDays() API).

### TDD Order Within Each User Story (MANDATORY)

```text
1. RED: Write failing tests
   - Contract tests for Zod schemas
   - Unit tests for primitives
   - Run `pnpm test -- --testPathPattern=forecast` -> verify tests FAIL

2. GREEN: Implement minimum code
   - Contract schemas first (contract tests GREEN)
   - Primitive second (unit tests GREEN)
   - Definition third (MCP handler)
   - Register in server.ts
   - Run `pnpm test -- --testPathPattern=forecast` -> all tests GREEN

3. REFACTOR: Clean up
   - Improve code quality
   - Run `pnpm test -- --testPathPattern=forecast` -> tests stay GREEN
   - OmniFocus Script Editor verification (last)
```

### Parallel Opportunities

- **T001-T003** (Phase 1): All create different files, but T002 depends on T001 (imports enums) and T003 depends on both -- execute sequentially
- **T007 + T008** (Phase 3 RED): Contract test and unit test for US1 target different files [P]
- **T016 + T017** (Phase 4 RED): Contract test and unit test for US2 target different files [P]
- **T025 + T026** (Phase 5 RED): Contract test and unit test for US3 target different files [P]
- **Phase 3 + Phase 4 + Phase 5**: All 3 user stories can proceed in parallel after Phase 2 is complete [P]
- **T034 + T035** (Phase 6): Lint and typecheck target different tools [P]

---

## TDD Parallel Example: User Story 1

```bash
# RED: Launch both test files together (they will FAIL):
Task: "T007 [P] [US1] Write contract test -> verify FAILS"
Task: "T008 [P] [US1] Write unit test -> verify FAILS"

# GREEN: Implement to make tests pass (sequential):
Task: "T009 Contract schemas -> contract tests GREEN"
Task: "T010 Barrel export update"
Task: "T011 Primitive -> unit tests GREEN"
Task: "T012 Definition (MCP handler)"
Task: "T013 Register in server.ts"

# REFACTOR: Polish while green:
Task: "T014 Build + test verification"
Task: "T015 OmniFocus Script Editor verification"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (shared schemas)
2. Complete Phase 2: Foundational (shared contract tests)
3. Complete Phase 3: User Story 1 -- get_forecast_range (TDD cycle)
4. **STOP and VALIDATE**: All tests GREEN, OmniJS verified in Script Editor
5. `get_forecast_range` delivers immediate value for weekly reviews

### Incremental Delivery

1. Phase 1 + Phase 2 -> Foundation ready
2. Phase 3: get_forecast_range -> TDD cycle -> All tests GREEN (MVP!)
3. Phase 4: get_forecast_day -> TDD cycle -> All tests GREEN
4. Phase 5: select_forecast_days -> TDD cycle -> All tests GREEN
5. Phase 6: Polish -> Full test suite GREEN -> Ready for PR
6. Each tool adds value without breaking previous tools (tests catch regressions)

### Parallel Team Strategy

With multiple developers after Phase 2 is complete:

- Developer A: User Story 1 -- get_forecast_range (Phase 3)
- Developer B: User Story 2 -- get_forecast_day (Phase 4)
- Developer C: User Story 3 -- select_forecast_days (Phase 5)

All stories complete and integrate independently. All tests GREEN before merge.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- **TDD is mandatory** -- tests MUST fail before implementation begins
- Commit after each TDD cycle (RED verified, GREEN achieved, REFACTOR done)
- Stop at any checkpoint to validate story independently
- CRITICAL: All OmniJS scripts use synchronous IIFE pattern (no Timer.once)
- CRITICAL: Forecast perspective must be set via `window.perspective = Perspective.BuiltIn.Forecast` before calling forecastDayForDate() or selectForecastDays()
- Reference patterns: `getProjectsForReview` primitive for read-only query pattern (US1/US2); `getPerspectiveView` for UI-affecting pattern (US3)
- Shared kindToString/statusToString helper functions are defined inline in each OmniJS script (not shared across scripts -- each script is self-contained)
