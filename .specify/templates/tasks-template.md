---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST follow TDD Red-Green-Refactor:
  1. RED: Write failing tests FIRST
  2. GREEN: Implement minimum code to pass
  3. REFACTOR: Clean up while staying green

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Setup database schema and migrations framework
- [ ] T005 [P] Implement authentication/authorization framework
- [ ] T006 [P] Setup API routing and middleware structure
- [ ] T007 Create base models/entities that all stories depend on
- [ ] T008 Configure error handling and logging infrastructure
- [ ] T009 Setup environment configuration management

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T010 [P] [US1] Write contract test for [schema] in tests/contract/test_[name].ts → verify FAILS
- [ ] T011 [P] [US1] Write unit test for [primitive] in tests/unit/test_[name].ts → verify FAILS

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T012 [P] [US1] Create [Entity1] model in src/models/[entity1].ts → tests turn GREEN
- [ ] T013 [P] [US1] Create [Entity2] model in src/models/[entity2].ts
- [ ] T014 [US1] Implement [primitive] in src/tools/primitives/[name].ts → unit tests GREEN
- [ ] T015 [US1] Implement [definition] in src/tools/definitions/[name].ts
- [ ] T016 [US1] Register tool in src/server.ts

### 🔵 REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T017 [US1] Refactor if needed while keeping tests green
- [ ] T018 [US1] Manual verification in OmniFocus (Script Editor)

**Checkpoint**: At this point, User Story 1 should be fully functional and tested

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### 🔴 RED Phase - Tests First (REQUIRED)

- [ ] T019 [P] [US2] Write contract test for [schema] in tests/contract/test_[name].ts → verify FAILS
- [ ] T020 [P] [US2] Write unit test for [primitive] in tests/unit/test_[name].ts → verify FAILS

### 🟢 GREEN Phase - Implementation

- [ ] T021 [P] [US2] Create [Entity] model in src/models/[entity].ts
- [ ] T022 [US2] Implement [primitive] in src/tools/primitives/[name].ts → tests GREEN
- [ ] T023 [US2] Implement [definition] in src/tools/definitions/[name].ts
- [ ] T024 [US2] Register tool in src/server.ts

### 🔵 REFACTOR Phase - Polish

- [ ] T025 [US2] Refactor if needed while keeping tests green
- [ ] T026 [US2] Manual verification in OmniFocus

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### 🔴 RED Phase - Tests First (REQUIRED)

- [ ] T027 [P] [US3] Write contract test for [schema] in tests/contract/test_[name].ts → verify FAILS
- [ ] T028 [P] [US3] Write unit test for [primitive] in tests/unit/test_[name].ts → verify FAILS

### 🟢 GREEN Phase - Implementation

- [ ] T029 [P] [US3] Create [Entity] model in src/models/[entity].ts
- [ ] T030 [US3] Implement [primitive] in src/tools/primitives/[name].ts → tests GREEN
- [ ] T031 [US3] Implement [definition] in src/tools/definitions/[name].ts

### 🔵 REFACTOR Phase - Polish

- [ ] T032 [US3] Refactor if needed while keeping tests green
- [ ] T033 [US3] Manual verification in OmniFocus

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same TDD pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring (tests stay GREEN)
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX Security hardening
- [ ] TXXX Run quickstart.md validation
- [ ] TXXX Run full test suite: `pnpm test`
- [ ] TXXX Run coverage check: `pnpm test:coverage`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### TDD Order Within Each User Story (MANDATORY)

```text
1. 🔴 RED: Write failing tests
   - Contract tests for schemas
   - Unit tests for primitives
   - Run `pnpm test` → verify tests FAIL

2. 🟢 GREEN: Implement minimum code
   - Primitives first (business logic)
   - Definitions second (MCP interface)
   - Run `pnpm test` → tests turn GREEN

3. 🔵 REFACTOR: Clean up
   - Improve code quality
   - Run `pnpm test` → tests stay GREEN
   - Manual OmniFocus verification (last)
```

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All RED phase tests for a user story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## TDD Parallel Example: User Story 1

```bash
# 🔴 RED: Launch all tests together (they will FAIL):
Task: "T010 [P] [US1] Write contract test → verify FAILS"
Task: "T011 [P] [US1] Write unit test → verify FAILS"

# 🟢 GREEN: Implement to make tests pass:
Task: "T012-T016 Implementation tasks"

# 🔵 REFACTOR: Polish while green:
Task: "T017 Refactor if needed"
Task: "T018 Manual verification"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (following TDD cycle)
4. **STOP and VALIDATE**: All tests GREEN, manual verification passes
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → TDD cycle → All tests GREEN → Deploy/Demo (MVP!)
3. Add User Story 2 → TDD cycle → All tests GREEN → Deploy/Demo
4. Add User Story 3 → TDD cycle → All tests GREEN → Deploy/Demo
5. Each story adds value without breaking previous stories (tests catch regressions)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (TDD cycle)
   - Developer B: User Story 2 (TDD cycle)
   - Developer C: User Story 3 (TDD cycle)
3. Stories complete and integrate independently
4. All tests GREEN before merge

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD is mandatory** - tests MUST fail before implementation begins
- Commit after each TDD cycle (RED verified, GREEN achieved, REFACTOR done)
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- If tests don't fail initially, the test is either wrong or implementation already exists
