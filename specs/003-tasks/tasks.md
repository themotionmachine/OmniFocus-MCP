# Tasks: Enhanced Task Management Tools (Phase 3)

**Feature Branch**: `003-tasks`
**Created**: 2025-12-11
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

- **Total tasks**: 53 (including optional T048a)
- **Estimated total effort**: 4-5 days
- **Parallel tracks possible**: 4 (within each user story phase)
- **Critical path length**: 7 phases (setup through polish)

## Dependency Graph

```text
Phase 1: Setup (Sequential Foundation)
  T001 → T002 → T003

Phase 2: Foundational (Parallel Utilities)
  ├── T004 [P] (shared contract tests)
  └── T005 [P] (test mock setup)

Phase 3: User Story 1 - list_tasks
  ├── T006-T010 (RED: Contract + Unit Tests)
  │   ├── T006 [P] contract tests
  │   └── T007-T010 [P] unit tests
  ├── T011-T014 (GREEN: Implementation)
  │   T011 primitive → T012 definition → T013 registration
  └── T015 (REFACTOR: Polish + Manual)

Phase 4: User Story 2 - get_task
  ├── T016-T020 (RED: Contract + Unit Tests)
  │   ├── T016 [P] contract tests
  │   └── T017-T020 [P] unit tests
  ├── T021-T024 (GREEN: Implementation)
  │   T021 primitive → T022 definition → T023 registration
  └── T025 (REFACTOR: Polish + Manual)

Phase 5: User Story 3 - set_planned_date
  ├── T026-T030 (RED: Contract + Unit Tests)
  │   ├── T026 [P] contract tests
  │   └── T027-T030 [P] unit tests
  ├── T031-T034 (GREEN: Implementation)
  │   T031 primitive → T032 definition → T033 registration
  └── T035 (REFACTOR: Polish + Manual)

Phase 6: User Story 4 - append_note
  ├── T036-T040 (RED: Contract + Unit Tests)
  │   ├── T036 [P] contract tests
  │   └── T037-T040 [P] unit tests
  ├── T041-T044 (GREEN: Implementation)
  │   T041 primitive → T042 definition → T043 registration
  └── T045 (REFACTOR: Polish + Manual)

Phase 7: Polish & Cross-Cutting
  T046 → T047 → T048 → T049 → T050 → T051 → T052
```

---

## Phase 1: Setup

*Foundation work - must complete before parallel development*

**Goal**: Copy contracts from spec artifacts to runtime location and verify build.

### Tasks

- [X] T001 Create directory structure `src/contracts/task-tools/` and `src/contracts/task-tools/shared/`
  - **Effort**: XS
  - **Acceptance**: Directories exist

- [X] T002 Copy contracts from `specs/003-tasks/contracts/` to `src/contracts/task-tools/`
  - **Files to copy**:
    - `specs/003-tasks/contracts/index.ts` to `src/contracts/task-tools/index.ts`
    - `specs/003-tasks/contracts/list-tasks.ts` to `src/contracts/task-tools/list-tasks.ts`
    - `specs/003-tasks/contracts/get-task.ts` to `src/contracts/task-tools/get-task.ts`
    - `specs/003-tasks/contracts/set-planned-date.ts` to `src/contracts/task-tools/set-planned-date.ts`
    - `specs/003-tasks/contracts/append-note.ts` to `src/contracts/task-tools/append-note.ts`
    - `specs/003-tasks/contracts/shared/index.ts` to `src/contracts/task-tools/shared/index.ts`
    - `specs/003-tasks/contracts/shared/task.ts` to `src/contracts/task-tools/shared/task.ts`
    - `specs/003-tasks/contracts/shared/disambiguation.ts` to `src/contracts/task-tools/shared/disambiguation.ts`
  - **Effort**: S
  - **Acceptance**: All contract files copied with correct imports

- [X] T003 Run `pnpm build` and `pnpm typecheck` to verify contracts compile
  - **Effort**: XS
  - **Acceptance**: Build succeeds with no type errors

---

## Phase 2: Foundational

*Shared test utilities and setup - can run in parallel*

**Goal**: Establish shared contract tests for reusable schemas (disambiguation, task status).

### Tasks

- [X] T004 [P] Write contract tests for shared schemas in `tests/contract/task-tools/shared-schemas.test.ts`
  - **Description**: Test TaskStatusSchema, TaskSummarySchema, TaskFullSchema, EntityReferenceSchema, DisambiguationErrorSchema
  - **Dependencies**: T003
  - **Effort**: M
  - **Files**:
    - `tests/contract/task-tools/shared-schemas.test.ts` (create)
  - **Acceptance Criteria**:
    - [ ] TaskStatusSchema accepts all 7 valid status values
    - [ ] TaskStatusSchema rejects invalid status strings
    - [ ] TaskSummarySchema validates required fields
    - [ ] TaskFullSchema validates all properties with correct types
    - [ ] DisambiguationErrorSchema requires min 2 matchingIds
    - [ ] Run `pnpm test tests/contract/task-tools/shared-schemas.test.ts` → tests PASS (contracts already exist in specs/003-tasks/contracts/)
  - **Note**: Contract tests validate Zod schema structure and SHOULD PASS because the schemas already exist. Unit tests (T007+) validate primitive implementation and SHOULD FAIL first per TDD.

- [X] T005 [P] Create test directory structure for task-tools
  - **Description**: Create `tests/contract/task-tools/` and `tests/unit/task-tools/` directories
  - **Dependencies**: T003
  - **Effort**: XS
  - **Acceptance**: Directories exist

---

## Phase 3: User Story 1 - list_tasks (P1)

**Goal**: Enable AI assistants to query tasks with filters (project, folder, tags, status, dates).

**Independent Test**: Request tasks with various filter combinations and verify results match criteria.

**Acceptance Scenarios** (from spec.md):
1. Filter by project ID/name returns only tasks in that project
2. Filter by due date range returns tasks due within range
3. Filter by tags with tagFilterMode (any/all) applies correct logic
4. Filter by status returns tasks matching status values
5. Filter by defer date range returns deferred tasks in range
6. Filter by planned date range returns scheduled tasks (v4.7+)
7. Empty filter results return empty array (not error)
8. Flat list (flatten: true) returns all matching tasks without hierarchy
9. Hierarchy mode includes parent-child relationships

---

### RED Phase - Tests First

- [X] T006 [P] [US1] Write contract tests for list-tasks in `tests/contract/task-tools/list-tasks.test.ts` → verify PASS
  - **Dependencies**: T004, T005
  - **Effort**: M
  - **Files**:
    - `tests/contract/task-tools/list-tasks.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] ListTasksInputSchema accepts empty input (all optional)
    - [X] ListTasksInputSchema accepts all filter combinations
    - [X] ListTasksInputSchema rejects invalid status values
    - [X] ListTasksInputSchema defaults: includeCompleted=false, tagFilterMode='any', limit=100, flatten=true
    - [X] ListTasksResponseSchema accepts success with tasks array
    - [X] ListTasksResponseSchema accepts error response
    - [X] Run `pnpm test tests/contract/task-tools/list-tasks.test.ts` → tests PASS (validating existing Zod schema structure)

- [X] T007 [P] [US1] Write unit test: listTasks returns tasks on success in `tests/unit/task-tools/listTasks.test.ts` -> verify FAILS
  - **Dependencies**: T005
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/listTasks.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] Test mocks executeOmniFocusScript
    - [X] Test calls listTasks({}) with mock response
    - [X] Test expects result.success === true and tasks array
    - [X] Run `pnpm test tests/unit/task-tools/listTasks.test.ts` -> test FAILS (primitive does not exist)

- [X] T008 [P] [US1] Write unit test: listTasks filters by project in `tests/unit/task-tools/listTasks.test.ts` ✓
  - **Dependencies**: T007
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/listTasks.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls listTasks({ projectId: 'proj123' })
    - [X] Test verifies script contains project filter logic
    - [X] Tests written and passing

- [X] T009 [P] [US1] Write unit test: listTasks filters by tags with tagFilterMode in `tests/unit/task-tools/listTasks.test.ts` ✓
  - **Dependencies**: T007
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/listTasks.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls listTasks({ tagIds: ['t1', 't2'], tagFilterMode: 'all' })
    - [X] Test verifies AND logic applied
    - [X] Test calls listTasks({ tagIds: ['t1'], tagFilterMode: 'any' })
    - [X] Test verifies OR logic (default) applied
    - [X] Tests written and passing

- [X] T010 [P] [US1] Write unit test: listTasks filters by dates and status in `tests/unit/task-tools/listTasks.test.ts` ✓
  - **Dependencies**: T007
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/listTasks.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test filters by dueAfter/dueBefore
    - [X] Test filters by status array
    - [X] Test filters by flagged boolean
    - [X] Test filters by includeCompleted
    - [X] Test applies limit post-filter
    - [X] Tests written and passing

---

### GREEN Phase - Implementation

- [X] T011 [US1] Implement listTasks primitive in `src/tools/primitives/listTasks.ts` ✓
  - **Dependencies**: T007, T008, T009, T010
  - **Effort**: L
  - **Files**:
    - `src/tools/primitives/listTasks.ts` (create)
  - **Acceptance Criteria**:
    - [X] Generates OmniJS script with all filter conditions
    - [X] Applies includeCompleted filter first
    - [X] Applies container filters (projectId/Name, folderId/Name)
    - [X] Applies tag filters with tagFilterMode (any/all)
    - [X] Applies date filters (due, defer, planned, completed) with inclusive bounds
    - [X] Applies status filter with OR logic
    - [X] Applies limit post-filter
    - [X] Returns TaskSummary array on success
    - [X] Returns error on failure
    - [X] Tests passing

- [X] T012 [US1] Implement listTasks definition in `src/tools/definitions/listTasks.ts` ✓
  - **Dependencies**: T011
  - **Effort**: M
  - **Files**:
    - `src/tools/definitions/listTasks.ts` (create)
  - **Acceptance Criteria**:
    - [X] Exports `schema` (ListTasksInputSchema)
    - [X] Exports `handler` function
    - [X] Handler validates input with Zod
    - [X] Handler calls listTasks primitive
    - [X] Handler formats MCP response
    - [X] Build succeeds

- [X] T013 [US1] Register list_tasks tool in `src/server.ts` ✓
  - **Dependencies**: T012
  - **Effort**: S
  - **Files**:
    - `src/server.ts` (modify)
  - **Acceptance Criteria**:
    - [X] Import listTasksTool from definitions
    - [X] Register with descriptive tool name and description
    - [X] Build succeeds

- [X] T014 [US1] Run full test suite and verify all list_tasks tests pass ✓
  - **Dependencies**: T013
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm test` -> all tests pass (12 listTasks tests)
    - [X] `pnpm typecheck` -> no errors

---

### REFACTOR Phase - Polish

- [X] T015 [US1] Manual verification in OmniFocus and code cleanup ✓
  - **Dependencies**: T014
  - **Effort**: M
  - **Acceptance Criteria**:
    - [X] Test list_tasks with empty filters in OmniFocus (01-list-tasks-basic.omnijs)
    - [X] Test list_tasks with project filter (verified via generated script)
    - [X] Test list_tasks with tag filter (any mode)
    - [X] Test list_tasks with tag filter (all mode)
    - [X] Test list_tasks with date range filters (04-list-tasks-due-soon.omnijs)
    - [X] Test list_tasks with status filter (05-list-tasks-by-status.omnijs)
    - [X] Test list_tasks with limit (verified via limit parameter)
    - [X] Refactor any verbose code
    - [X] Add JSDoc comments to public functions (generateListTasksScript exported)

---

## Phase 4: User Story 2 - get_task (P2)

**Goal**: Retrieve all properties of a specific task by ID or name.

**Independent Test**: Request task by ID and verify all properties returned correctly.

**Acceptance Scenarios** (from spec.md):
1. Valid task ID returns complete task with all properties
2. Task with parent task includes parent reference
3. Task in project includes containingProject reference
4. Task with tags includes all tag references
5. Task with planned date (v4.7+) includes plannedDate and effectivePlannedDate
6. Non-existent task ID returns "Task '{id}' not found" error
7. Ambiguous task name returns disambiguation error with matchingIds

---

### RED Phase - Tests First

- [X] T016 [P] [US2] Write contract tests for get-task in `tests/contract/task-tools/get-task.test.ts` -> verify PASS
  - **Dependencies**: T004, T005
  - **Effort**: M
  - **Files**:
    - `tests/contract/task-tools/get-task.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] GetTaskInputSchema requires at least one of id or name
    - [X] GetTaskInputSchema accepts id only
    - [X] GetTaskInputSchema accepts name only
    - [X] GetTaskInputSchema accepts both (id takes precedence)
    - [X] GetTaskResponseSchema accepts success with TaskFull
    - [X] GetTaskResponseSchema accepts error response
    - [X] GetTaskResponseSchema accepts disambiguation error
    - [X] Run `pnpm test tests/contract/task-tools/get-task.test.ts` -> tests PASS

- [X] T017 [P] [US2] Write unit test: getTask returns task by ID in `tests/unit/task-tools/getTask.test.ts` ✓
  - **Dependencies**: T005
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/getTask.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] Test mocks executeOmniFocusScript
    - [X] Test calls getTask({ id: 'task123' })
    - [X] Test expects TaskFull response with all properties
    - [X] Tests written and passing

- [X] T018 [P] [US2] Write unit test: getTask returns task by name in `tests/unit/task-tools/getTask.test.ts` ✓
  - **Dependencies**: T017
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/getTask.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls getTask({ name: 'Call Mom' })
    - [X] Test expects TaskFull response
    - [X] Tests written and passing

- [X] T019 [P] [US2] Write unit test: getTask returns not found error in `tests/unit/task-tools/getTask.test.ts` ✓
  - **Dependencies**: T017
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/getTask.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks null task response
    - [X] Test expects error: "Task 'task123' not found"
    - [X] Tests written and passing

- [X] T020 [P] [US2] Write unit test: getTask returns disambiguation error in `tests/unit/task-tools/getTask.test.ts` ✓
  - **Dependencies**: T017
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/getTask.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks multiple tasks with same name
    - [X] Test expects code: 'DISAMBIGUATION_REQUIRED'
    - [X] Test expects matchingIds with 2+ entries
    - [X] Tests written and passing

---

### GREEN Phase - Implementation

- [X] T021 [US2] Implement getTask primitive in `src/tools/primitives/getTask.ts` ✓
  - **Dependencies**: T017, T018, T019, T020
  - **Effort**: M
  - **Files**:
    - `src/tools/primitives/getTask.ts` (create)
  - **Acceptance Criteria**:
    - [X] Finds task by ID using Task.byIdentifier()
    - [X] Finds task by name using flattenedTasks.byName()
    - [X] Handles disambiguation for name lookup
    - [X] Returns complete TaskFull with all properties
    - [X] Returns proper not found error
    - [X] Returns disambiguation error with matchingIds
    - [X] Tests passing (12 tests)

- [X] T022 [US2] Implement getTask definition in `src/tools/definitions/getTask.ts` ✓
  - **Dependencies**: T021
  - **Effort**: S
  - **Files**:
    - `src/tools/definitions/getTask.ts` (create)
  - **Acceptance Criteria**:
    - [X] Exports `schema` (GetTaskInputSchema)
    - [X] Exports `handler` function
    - [X] Handler validates input with Zod
    - [X] Handler calls getTask primitive
    - [X] Handler formats MCP response
    - [X] Build succeeds

- [X] T023 [US2] Register get_task tool in `src/server.ts` ✓
  - **Dependencies**: T022
  - **Effort**: S
  - **Files**:
    - `src/server.ts` (modify)
  - **Acceptance Criteria**:
    - [X] Import getTaskTool from definitions
    - [X] Register with descriptive tool name and description
    - [X] Build succeeds

- [X] T024 [US2] Run full test suite and verify all get_task tests pass ✓
  - **Dependencies**: T023
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm test` -> all tests pass (12 get_task tests)
    - [X] `pnpm typecheck` -> no errors

---

### REFACTOR Phase - Polish

- [X] T025 [US2] Manual verification in OmniFocus and code cleanup ✓
  - **Dependencies**: T024
  - **Effort**: M
  - **Acceptance Criteria**:
    - [X] Test get_task with valid task ID (06-get-task-by-id.omnijs)
    - [X] Test get_task with valid task name (unique) (07-get-task-by-name.omnijs)
    - [X] Test get_task with non-existent ID (verified in tests)
    - [X] Test get_task with ambiguous name (disambiguation error verified)
    - [X] Verify all TaskFull properties returned correctly
    - [X] Verify relationship references (project, parent, tags)
    - [X] Refactor any verbose code (generateGetTaskScript exported)

---

## Phase 5: User Story 3 - set_planned_date (P3)

**Goal**: Set planned date on tasks (OmniFocus v4.7+ feature).

**Independent Test**: Set planned date on a task and verify it appears in OmniFocus.

**Acceptance Scenarios** (from spec.md):
1. Task without planned date -> set planned date succeeds
2. Task with planned date -> update to new value succeeds
3. Task with planned date -> clear (set null) succeeds
4. Task by ID -> correct task updated
5. Task by unique name -> correct task updated
6. Task by ambiguous name -> disambiguation error returned
7. Non-existent task -> "not found" error returned

---

### RED Phase - Tests First

- [X] T026 [P] [US3] Write contract tests for set-planned-date in `tests/contract/task-tools/set-planned-date.test.ts` -> verify PASS
  - **Dependencies**: T004, T005
  - **Effort**: M
  - **Files**:
    - `tests/contract/task-tools/set-planned-date.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] SetPlannedDateInputSchema requires at least one of id or name
    - [X] SetPlannedDateInputSchema accepts plannedDate as ISO 8601 string
    - [X] SetPlannedDateInputSchema accepts plannedDate as null (clear)
    - [X] SetPlannedDateResponseSchema accepts success with id and name
    - [X] SetPlannedDateResponseSchema accepts error response
    - [X] SetPlannedDateResponseSchema accepts disambiguation error
    - [X] Run `pnpm test tests/contract/task-tools/set-planned-date.test.ts` -> tests PASS

- [X] T027 [P] [US3] Write unit test: setPlannedDate sets date by ID in `tests/unit/task-tools/setPlannedDate.test.ts` ✓
  - **Dependencies**: T005
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/setPlannedDate.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] Test mocks executeOmniFocusScript
    - [X] Test calls setPlannedDate({ id: 'task123', plannedDate: '2025-01-15T09:00:00Z' })
    - [X] Test expects success response with id and name
    - [X] Tests written and passing

- [X] T028 [P] [US3] Write unit test: setPlannedDate clears date in `tests/unit/task-tools/setPlannedDate.test.ts` ✓
  - **Dependencies**: T027
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/setPlannedDate.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls setPlannedDate({ id: 'task123', plannedDate: null })
    - [X] Test expects success response
    - [X] Tests written and passing

- [X] T029 [P] [US3] Write unit test: setPlannedDate version check error in `tests/unit/task-tools/setPlannedDate.test.ts` ✓
  - **Dependencies**: T027
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/setPlannedDate.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks version check failure response
    - [X] Test expects error: "Planned date requires OmniFocus v4.7 or later"
    - [X] Tests written and passing

- [X] T030 [P] [US3] Write unit test: setPlannedDate disambiguation error in `tests/unit/task-tools/setPlannedDate.test.ts` ✓
  - **Dependencies**: T027
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/setPlannedDate.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks multiple tasks with same name
    - [X] Test expects code: 'DISAMBIGUATION_REQUIRED'
    - [X] Test expects matchingIds with 2+ entries
    - [X] Tests written and passing

---

### GREEN Phase - Implementation

- [X] T031 [US3] Implement setPlannedDate primitive in `src/tools/primitives/setPlannedDate.ts` ✓
  - **Dependencies**: T027, T028, T029, T030
  - **Effort**: M
  - **Files**:
    - `src/tools/primitives/setPlannedDate.ts` (create)
  - **Acceptance Criteria**:
    - [X] Checks OmniFocus version >= 4.7 first (app.userVersion.atLeast)
    - [X] Finds task by ID or name
    - [X] Handles disambiguation for name lookup
    - [X] Sets task.plannedDate to new Date() or null
    - [X] Handles database migration errors gracefully
    - [X] Returns success with id and name
    - [X] Returns proper error messages
    - [X] Tests passing (11 tests)

- [X] T032 [US3] Implement setPlannedDate definition in `src/tools/definitions/setPlannedDate.ts` ✓
  - **Dependencies**: T031
  - **Effort**: S
  - **Files**:
    - `src/tools/definitions/setPlannedDate.ts` (create)
  - **Acceptance Criteria**:
    - [X] Exports `schema` (SetPlannedDateInputSchema)
    - [X] Exports `handler` function
    - [X] Handler validates input with Zod
    - [X] Handler calls setPlannedDate primitive
    - [X] Handler formats MCP response
    - [X] Build succeeds

- [X] T033 [US3] Register set_planned_date tool in `src/server.ts` ✓
  - **Dependencies**: T032
  - **Effort**: S
  - **Files**:
    - `src/server.ts` (modify)
  - **Acceptance Criteria**:
    - [X] Import setPlannedDateTool from definitions
    - [X] Register with descriptive tool name and description
    - [X] Build succeeds

- [X] T034 [US3] Run full test suite and verify all set_planned_date tests pass ✓
  - **Dependencies**: T033
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm test` -> all tests pass (11 set_planned_date tests)
    - [X] `pnpm typecheck` -> no errors

---

### REFACTOR Phase - Polish

- [X] T035 [US3] Manual verification in OmniFocus and code cleanup ✓
  - **Dependencies**: T034
  - **Effort**: M
  - **Acceptance Criteria**:
    - [X] Test set_planned_date on task (v4.7+ required) (08-set-planned-date.omnijs)
    - [X] Verify planned date appears in OmniFocus UI
    - [X] Test clearing planned date (09-clear-planned-date.omnijs)
    - [X] Test version error on older OmniFocus (N/A - v4.7+ used)
    - [X] Refactor any verbose code (fixed app.version deprecation)

---

## Phase 6: User Story 4 - append_note (P4)

**Goal**: Append text to task notes without overwriting existing content.

**Independent Test**: Append text to task note and verify both original and new content present.

**Acceptance Scenarios** (from spec.md):
1. Task with existing note -> append adds text after existing (with newline separator)
2. Task with empty note -> append sets note to appended text (no leading newline)
3. Task by ID -> correct task updated
4. Task by unique name -> correct task updated
5. Task by ambiguous name -> disambiguation error returned
6. Non-existent task -> "not found" error returned
7. Special characters in text -> preserved exactly

---

### RED Phase - Tests First

- [X] T036 [P] [US4] Write contract tests for append-note in `tests/contract/task-tools/append-note.test.ts` ✓
  - **Dependencies**: T004, T005
  - **Effort**: M
  - **Files**:
    - `tests/contract/task-tools/append-note.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] AppendNoteInputSchema requires at least one of id or name
    - [X] AppendNoteInputSchema requires text field
    - [X] AppendNoteInputSchema accepts empty string for text
    - [X] AppendNoteResponseSchema accepts success with id and name
    - [X] AppendNoteResponseSchema accepts error response
    - [X] AppendNoteResponseSchema accepts disambiguation error
    - [X] Tests written and passing

- [X] T037 [P] [US4] Write unit test: appendNote appends to existing note in `tests/unit/task-tools/appendNote.test.ts` ✓
  - **Dependencies**: T005
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/appendNote.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] Test mocks executeOmniFocusScript
    - [X] Test calls appendNote({ id: 'task123', text: 'New content' })
    - [X] Test expects success response with id and name
    - [X] Tests written and passing

- [X] T038 [P] [US4] Write unit test: appendNote handles empty note in `tests/unit/task-tools/appendNote.test.ts` ✓
  - **Dependencies**: T037
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/appendNote.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks task with empty note
    - [X] Test expects no leading newline in result
    - [X] Tests written and passing

- [X] T039 [P] [US4] Write unit test: appendNote not found error in `tests/unit/task-tools/appendNote.test.ts` ✓
  - **Dependencies**: T037
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/appendNote.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks null task response
    - [X] Test expects error: "Task 'task123' not found"
    - [X] Tests written and passing

- [X] T040 [P] [US4] Write unit test: appendNote disambiguation error in `tests/unit/task-tools/appendNote.test.ts` ✓
  - **Dependencies**: T037
  - **Effort**: S
  - **Files**:
    - `tests/unit/task-tools/appendNote.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks multiple tasks with same name
    - [X] Test expects code: 'DISAMBIGUATION_REQUIRED'
    - [X] Test expects matchingIds with 2+ entries
    - [X] Tests written and passing

---

### GREEN Phase - Implementation

- [X] T041 [US4] Implement appendNote primitive in `src/tools/primitives/appendNote.ts` ✓
  - **Dependencies**: T037, T038, T039, T040
  - **Effort**: M
  - **Files**:
    - `src/tools/primitives/appendNote.ts` (create)
  - **Acceptance Criteria**:
    - [X] Finds task by ID or name
    - [X] Handles disambiguation for name lookup
    - [X] Uses task.appendStringToNote(text) for non-empty notes
    - [X] Sets task.note = text directly for empty notes (no leading newline)
    - [X] Handles empty string text as no-op (success)
    - [X] Preserves special characters in text
    - [X] Returns success with id and name
    - [X] Returns proper error messages
    - [X] Tests passing (5 tests)

- [X] T042 [US4] Implement appendNote definition in `src/tools/definitions/appendNote.ts` ✓
  - **Dependencies**: T041
  - **Effort**: S
  - **Files**:
    - `src/tools/definitions/appendNote.ts` (create)
  - **Acceptance Criteria**:
    - [X] Exports `schema` (AppendNoteInputSchema)
    - [X] Exports `handler` function
    - [X] Handler validates input with Zod
    - [X] Handler calls appendNote primitive
    - [X] Handler formats MCP response
    - [X] Build succeeds

- [X] T043 [US4] Register append_note tool in `src/server.ts` ✓
  - **Dependencies**: T042
  - **Effort**: S
  - **Files**:
    - `src/server.ts` (modify)
  - **Acceptance Criteria**:
    - [X] Import appendNoteTool from definitions
    - [X] Register with descriptive tool name and description
    - [X] Build succeeds

- [X] T044 [US4] Run full test suite and verify all append_note tests pass ✓
  - **Dependencies**: T043
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm test` -> all tests pass (5 append_note tests)
    - [X] `pnpm typecheck` -> no errors

---

### REFACTOR Phase - Polish

- [X] T045 [US4] Manual verification in OmniFocus and code cleanup ✓
  - **Dependencies**: T044
  - **Effort**: M
  - **Acceptance Criteria**:
    - [X] Test append_note on task with existing note (10-append-note.omnijs)
    - [X] Verify newline separator added
    - [X] Test append_note on task with empty note
    - [X] Verify no leading newline
    - [X] Test special characters (quotes, newlines, unicode) (11-append-note-special-chars.omnijs)
    - [X] Refactor any verbose code (generateAppendNoteScript exported)

---

## Phase 7: Polish & Cross-Cutting Concerns

*Final cleanup, documentation, and verification*

**Goal**: Complete documentation updates, full test coverage verification, and cross-tool integration testing.

### Tasks

- [X] T046 Update README.md with new tools documentation ✓
  - **Dependencies**: T045
  - **Effort**: M
  - **Files**:
    - `README.md` (modify)
  - **Acceptance Criteria**:
    - [X] Add list_tasks to tool list with description
    - [X] Add get_task to tool list with description
    - [X] Add set_planned_date to tool list with description
    - [X] Add append_note to tool list with description
    - [X] Update tool count in overview section

- [X] T047 Update CLAUDE.md with Phase 3 completion notes ✓
  - **Dependencies**: T046
  - **Effort**: S
  - **Files**:
    - `CLAUDE.md` (modify)
  - **Acceptance Criteria**:
    - [X] Add Phase 3 to Recent Changes section
    - [X] List all 4 new tools with brief descriptions

- [X] T048 Run full test coverage and verify >= 80% ✓
  - **Dependencies**: T046
  - **Effort**: S
  - **Acceptance Criteria**:
    - [X] `pnpm test:coverage` -> all tests pass (1188 tests)
    - [X] Coverage >= 80% for new files (primitives: 100% for all 4 tools)
    - [X] No uncovered critical paths

- [X] T048a [Optional] Performance verification for SC-001 ✓
  - **Dependencies**: T048
  - **Effort**: S
  - **Description**: Verify list_tasks completes within 2 seconds for databases with up to 10,000 tasks (per SC-001). This task is optional because meaningful performance testing requires access to a large OmniFocus database.
  - **SC-001 Coverage Note**: SC-001 is inherently covered by implementation design (server-side filtering, limit parameter). This task provides empirical validation when a suitable test environment is available.
  - **Acceptance Criteria**:
    - [X] Manual test with large OmniFocus database (if available) - tested via manual OmniJS
    - [X] Document performance characteristics in PR description
    - [X] If performance issues found, create follow-up issue for optimization - N/A

- [X] T049 Run linting and fix any issues ✓
  - **Dependencies**: T048
  - **Effort**: S
  - **Acceptance Criteria**:
    - [X] `pnpm lint` -> no errors (159 files checked)
    - [X] `pnpm lint:fix` if needed - N/A

- [X] T050 Final build verification ✓
  - **Dependencies**: T049
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm build` -> success
    - [X] `pnpm typecheck` -> no errors

- [X] T051 Integration test: Cross-tool workflow ✓
  - **Dependencies**: T050
  - **Effort**: M
  - **Acceptance Criteria**:
    - [X] list_tasks -> get_task workflow (find task, get details) - verified via manual testing
    - [X] get_task -> set_planned_date workflow (inspect, schedule) - verified via manual testing
    - [X] get_task -> append_note workflow (inspect, update) - verified via manual testing
    - [X] Verify all tools work together seamlessly

- [X] T052 Create PR for Phase 3 completion ✓
  - **Dependencies**: T051
  - **Effort**: S
  - **PR**: https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/18
  - **Acceptance Criteria**:
    - [X] All tests passing
    - [X] No lint errors
    - [X] Documentation updated
    - [X] PR description with summary of changes
    - [X] Link to spec.md and plan.md

---

## Dependencies Summary

| Task | Depends On |
|------|------------|
| T001 | None |
| T002 | T001 |
| T003 | T002 |
| T004, T005 | T003 |
| T006-T010 | T004, T005 |
| T011 | T007-T010 |
| T012 | T011 |
| T013 | T012 |
| T014 | T013 |
| T015 | T014 |
| T016-T020 | T004, T005 |
| T021 | T017-T020 |
| T022 | T021 |
| T023 | T022 |
| T024 | T023 |
| T025 | T024 |
| T026-T030 | T004, T005 |
| T031 | T027-T030 |
| T032 | T031 |
| T033 | T032 |
| T034 | T033 |
| T035 | T034 |
| T036-T040 | T004, T005 |
| T041 | T037-T040 |
| T042 | T041 |
| T043 | T042 |
| T044 | T043 |
| T045 | T044 |
| T046 | T045 |
| T047 | T046 |
| T048 | T046 |
| T049 | T048 |
| T050 | T049 |
| T051 | T050 |
| T052 | T051 |

## Critical Path

The minimum path to completion follows:

```text
T001 -> T002 -> T003 -> T005 -> T007 -> T011 -> T012 -> T013 -> T014 -> T015
     -> T017 -> T021 -> T022 -> T023 -> T024 -> T025
     -> T027 -> T031 -> T032 -> T033 -> T034 -> T035
     -> T037 -> T041 -> T042 -> T043 -> T044 -> T045
     -> T046 -> T047 -> T048 -> T049 -> T050 -> T051 -> T052
```

**Critical path length**: 32 tasks (sequential dependencies)

## Risks & Blockers

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| OmniFocus v4.7+ not available for testing | High | Low | Document version requirement; test on v4.7+ machine |
| Large database performance issues | Medium | Low | Implement limit parameter; test with 10K+ tasks |
| OmniJS date handling edge cases | Medium | Medium | Use ISO 8601 throughout; test timezone scenarios |
| Disambiguation logic complexity | Low | Low | Follow existing tag-tools pattern |
| Database migration for plannedDate | Medium | Medium | Provide clear error message guiding user to migrate |

## Implementation Strategy

### Recommended Approach

1. **Sequential by User Story**: Complete each user story fully (RED -> GREEN -> REFACTOR) before moving to the next
2. **TDD Discipline**: Never write implementation before tests fail
3. **Manual Verification**: After each user story, verify in OmniFocus before proceeding
4. **Parallel Contract Tests**: Contract tests (T006, T016, T026, T036) can be written in parallel during setup

### Time Estimates by Phase

| Phase | Estimated Time | Notes |
|-------|----------------|-------|
| Phase 1: Setup | 1-2 hours | Copy contracts, verify build |
| Phase 2: Foundational | 1-2 hours | Shared test setup |
| Phase 3: list_tasks | 6-8 hours | Most complex (filters) |
| Phase 4: get_task | 4-6 hours | Moderate complexity |
| Phase 5: set_planned_date | 4-6 hours | Version checking adds complexity |
| Phase 6: append_note | 3-4 hours | Simplest tool |
| Phase 7: Polish | 2-3 hours | Documentation, final verification |

**Total Estimated**: 4-5 days

### Parallelization Opportunities

Within each user story phase:
- Contract tests [P] can run in parallel with initial unit test setup
- Unit tests within a story can be written in parallel before implementation

Between phases:
- Phases 3-6 are sequential (each builds confidence for the next)
- Phase 7 depends on all user stories complete

## Quality Checklist

Before marking Phase 3 complete:

- [X] All 53 tasks completed (including optional T048a) - 53/53 complete ✓
- [X] Every task has clear acceptance criteria met
- [X] No XL tasks remain (all decomposed)
- [X] Dependencies explicit and followed
- [X] Parallel tasks marked [P] executed appropriately
- [X] Effort estimates validated
- [X] Critical path identified and followed
- [X] Risks documented and mitigated
- [X] Total effort aligned with plan estimate (~4-5 days)
- [X] All tools manually verified in OmniFocus (12 manual tests passed)
- [X] Documentation updated (README.md, CLAUDE.md)
- [X] Test coverage >= 80% for new files (100% for all 4 primitives)
- [X] No lint errors (159 files checked)
- [X] Build succeeds
