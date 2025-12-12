# Tasks: Project Management Tools (Phase 4)

**Feature Branch**: `004-project-management`
**Created**: 2025-12-12
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

- **Total tasks**: 72
- **Estimated total effort**: 5-7 days
- **Parallel tracks possible**: 6 (within each user story phase)
- **Critical path length**: 9 phases (setup through polish)
- **MVP Scope**: US1 (list_projects) + US2 (get_project) + US3 (create_project) = first 3 user stories

## Dependency Graph

```text
Phase 1: Setup (Sequential Foundation)
  T001 -> T002 -> T003

Phase 2: Foundational (Parallel Utilities)
  |-- T004 [P] (shared contract tests)
  +-- T005 [P] (test directory setup)

Phase 3: User Story 1 - list_projects (P1)
  |-- T006-T010 (RED: Contract + Unit Tests)
  |   |-- T006 [P] contract tests
  |   +-- T007-T010 [P] unit tests
  |-- T011-T014 (GREEN: Implementation)
  |   T011 primitive -> T012 definition -> T013 registration
  +-- T015 (REFACTOR: Polish + Manual)

Phase 4: User Story 2 - get_project (P2)
  |-- T016-T020 (RED: Contract + Unit Tests)
  |-- T021-T024 (GREEN: Implementation)
  +-- T025 (REFACTOR: Polish + Manual)

Phase 5: User Story 3 - create_project (P3)
  |-- T026-T031 (RED: Contract + Unit Tests)
  |-- T032-T035 (GREEN: Implementation)
  +-- T036 (REFACTOR: Polish + Manual)

Phase 6: User Story 4 - edit_project (P4)
  |-- T037-T042 (RED: Contract + Unit Tests)
  |-- T043-T046 (GREEN: Implementation)
  +-- T047 (REFACTOR: Polish + Manual)

Phase 7: User Story 5 - delete_project (P5)
  |-- T048-T052 (RED: Contract + Unit Tests)
  |-- T053-T056 (GREEN: Implementation)
  +-- T057 (REFACTOR: Polish + Manual)

Phase 8: User Story 6 - move_project (P6)
  |-- T058-T062 (RED: Contract + Unit Tests)
  |-- T063-T066 (GREEN: Implementation)
  +-- T067 (REFACTOR: Polish + Manual)

Phase 9: Polish & Cross-Cutting
  T068 -> T069 -> T070 -> T071 -> T072
```

---

## Phase 1: Setup

*Foundation work - must complete before parallel development*

**Goal**: Copy contracts from spec artifacts to runtime location and verify build.

### Tasks

- [X] T001 Create directory structure `src/contracts/project-tools/` and `src/contracts/project-tools/shared/`
  - **Effort**: XS
  - **Acceptance**: Directories exist

- [X] T002 Copy contracts from `specs/004-project-management/contracts/` to `src/contracts/project-tools/`
  - **Files to copy**:
    - `specs/004-project-management/contracts/index.ts` -> `src/contracts/project-tools/index.ts`
    - `specs/004-project-management/contracts/list-projects.ts` -> `src/contracts/project-tools/list-projects.ts`
    - `specs/004-project-management/contracts/get-project.ts` -> `src/contracts/project-tools/get-project.ts`
    - `specs/004-project-management/contracts/create-project.ts` -> `src/contracts/project-tools/create-project.ts`
    - `specs/004-project-management/contracts/edit-project.ts` -> `src/contracts/project-tools/edit-project.ts`
    - `specs/004-project-management/contracts/delete-project.ts` -> `src/contracts/project-tools/delete-project.ts`
    - `specs/004-project-management/contracts/move-project.ts` -> `src/contracts/project-tools/move-project.ts`
    - `specs/004-project-management/contracts/shared/index.ts` -> `src/contracts/project-tools/shared/index.ts`
    - `specs/004-project-management/contracts/shared/project.ts` -> `src/contracts/project-tools/shared/project.ts`
    - `specs/004-project-management/contracts/shared/disambiguation.ts` -> `src/contracts/project-tools/shared/disambiguation.ts`
  - **Effort**: S
  - **Acceptance**: All contract files copied with correct imports

- [X] T003 Run `pnpm build` and `pnpm typecheck` to verify contracts compile
  - **Effort**: XS
  - **Acceptance**: Build succeeds with no type errors

---

## Phase 2: Foundational

*Shared test utilities and setup - can run in parallel*

**Goal**: Establish shared contract tests for reusable schemas (disambiguation, project status, project type).

**TDD Clarification**: Contract tests validate Zod schema structure (should PASS since schemas
already exist). Unit tests validate primitive implementation logic (should FAIL first per TDD
since implementation doesn't exist yet). This distinction is important:
- **Contract tests (T004, T006, T016, etc.)**: Test schema validation → expect PASS
- **Unit tests (T007, T017, etc.)**: Test business logic → expect FAIL until implementation

### Tasks

- [X] T004 [P] Write contract tests for shared schemas in `tests/contract/project-tools/shared-schemas.test.ts`
  - **Description**: Test ProjectStatusSchema, ProjectTypeSchema, ReviewIntervalSchema, ProjectSummarySchema, ProjectFullSchema, EntityReferenceSchema, DisambiguationErrorSchema
  - **Dependencies**: T003
  - **Effort**: M
  - **Files**:
    - `tests/contract/project-tools/shared-schemas.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] ProjectStatusSchema accepts all 4 valid status values (Active, OnHold, Done, Dropped)
    - [X] ProjectStatusSchema rejects invalid status strings (case-sensitive)
    - [X] ProjectTypeSchema accepts all 3 valid types (parallel, sequential, single-actions)
    - [X] ReviewIntervalSchema validates steps >= 1 and unit enum
    - [X] ProjectSummarySchema validates all 12 fields with correct types
    - [X] ProjectFullSchema validates all 30 properties with correct types
    - [X] DisambiguationErrorSchema requires min 2 matchingIds
    - [X] Run `pnpm test tests/contract/project-tools/shared-schemas.test.ts` -> tests PASS

- [X] T005 [P] Create test directory structure for project-tools
  - **Description**: Create `tests/contract/project-tools/` and `tests/unit/project-tools/` directories
  - **Dependencies**: T003
  - **Effort**: XS
  - **Acceptance**: Directories exist

---

## Phase 3: User Story 1 - list_projects (P1)

**Goal**: Enable AI assistants to query projects with filters (folder, status, review status, dates).

**Independent Test**: Request projects with various filter combinations and verify results match criteria.

**Acceptance Scenarios** (from spec.md):
1. Filter by folder ID/name returns only projects in that folder (including nested)
2. Filter by status returns projects matching status values (OR logic)
3. Filter by reviewStatus='due' returns projects with nextReviewDate <= today
4. Filter by reviewStatus='upcoming' returns projects due within 7 days
5. Filter by flagged returns only flagged projects
6. Filter by due date range returns projects due within range
7. Empty filter results return empty array (not error)
8. Limit parameter restricts result count

---

### RED Phase - Tests First

- [X] T006 [P] [US1] Write contract tests for list-projects in `tests/contract/project-tools/list-projects.test.ts` -> verify PASS
  - **Dependencies**: T004, T005
  - **Effort**: M
  - **Files**:
    - `tests/contract/project-tools/list-projects.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] ListProjectsInputSchema accepts empty input (all optional)
    - [X] ListProjectsInputSchema accepts all filter combinations
    - [X] ListProjectsInputSchema rejects invalid status values
    - [X] ListProjectsInputSchema rejects invalid reviewStatus values
    - [X] ListProjectsInputSchema defaults: includeCompleted=false, reviewStatus='any', limit=100
    - [X] ListProjectsResponseSchema accepts success with projects array
    - [X] ListProjectsResponseSchema accepts error response
    - [X] Run `pnpm test tests/contract/project-tools/list-projects.test.ts` -> tests PASS

- [X] T007 [P] [US1] Write unit test: listProjects returns projects on success in `tests/unit/project-tools/listProjects.test.ts` -> verify FAILS
  - **Dependencies**: T005
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/listProjects.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] Test mocks executeOmniFocusScript
    - [X] Test calls listProjects({}) with mock response
    - [X] Test expects result.success === true and projects array
    - [X] Run `pnpm test tests/unit/project-tools/listProjects.test.ts` -> test FAILS (primitive does not exist)

- [X] T008 [P] [US1] Write unit test: listProjects filters by folder in `tests/unit/project-tools/listProjects.test.ts`
  - **Dependencies**: T007
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/listProjects.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls listProjects({ folderId: 'folder123' })
    - [X] Test verifies script contains folder filter logic (recursive)
    - [X] Test written

- [X] T009 [P] [US1] Write unit test: listProjects filters by review status in `tests/unit/project-tools/listProjects.test.ts`
  - **Dependencies**: T007
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/listProjects.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls listProjects({ reviewStatus: 'due' })
    - [X] Test verifies nextReviewDate <= today logic
    - [X] Test calls listProjects({ reviewStatus: 'upcoming' })
    - [X] Test verifies 7-day window logic
    - [X] Test calls listProjects({ reviewStatus: 'any' })
    - [X] Test verifies no review filtering
    - [X] Tests written

- [X] T010 [P] [US1] Write unit test: listProjects filters by dates and status in `tests/unit/project-tools/listProjects.test.ts`
  - **Dependencies**: T007
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/listProjects.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test filters by dueAfter/dueBefore
    - [X] Test filters by deferAfter/deferBefore
    - [X] Test inverted date range (dueAfter > dueBefore) returns empty array (not error)
    - [X] Test filters by status array (OR logic)
    - [X] Test filters by flagged boolean
    - [X] Test filters by includeCompleted
    - [X] Test applies limit post-filter
    - [X] Test limit > 1000 is silently clamped to 1000
    - [X] Tests written

---

### GREEN Phase - Implementation

- [X] T011 [US1] Implement listProjects primitive in `src/tools/primitives/listProjects.ts`
  - **Dependencies**: T007, T008, T009, T010
  - **Effort**: L
  - **Files**:
    - `src/tools/primitives/listProjects.ts` (create)
  - **Acceptance Criteria**:
    - [X] Generates OmniJS script with all filter conditions
    - [X] Applies includeCompleted filter first
    - [X] Applies folder filter (recursive check for nested folders)
    - [X] Applies status filter with OR logic
    - [X] Applies review status filter ('due', 'upcoming', 'any')
    - [X] Applies flagged filter
    - [X] Applies date filters (due, defer) with inclusive bounds
    - [X] Applies limit post-filter (max 1000)
    - [X] Returns ProjectSummary array on success
    - [X] Returns error on failure
    - [X] All unit tests passing

- [X] T012 [US1] Implement listProjects definition in `src/tools/definitions/listProjects.ts`
  - **Dependencies**: T011
  - **Effort**: M
  - **Files**:
    - `src/tools/definitions/listProjects.ts` (create)
  - **Acceptance Criteria**:
    - [X] Exports `schema` (ListProjectsInputSchema)
    - [X] Exports `handler` function
    - [X] Handler validates input with Zod
    - [X] Handler calls listProjects primitive
    - [X] Handler formats MCP response
    - [X] Build succeeds

- [X] T013 [US1] Register list_projects tool in `src/server.ts`
  - **Dependencies**: T012
  - **Effort**: S
  - **Files**:
    - `src/server.ts` (modify)
  - **Acceptance Criteria**:
    - [X] Import listProjectsTool from definitions
    - [X] Register with descriptive tool name and description
    - [X] Build succeeds

- [X] T014 [US1] Run full test suite and verify all list_projects tests pass
  - **Dependencies**: T013
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm test` -> all tests pass
    - [X] `pnpm typecheck` -> no errors

---

### REFACTOR Phase - Polish

- [ ] T015 [US1] Manual verification in OmniFocus and code cleanup
  - **Dependencies**: T014
  - **Effort**: M
  - **Acceptance Criteria**:
    - [ ] Test list_projects with empty filters in OmniFocus
    - [ ] Test list_projects with folder filter
    - [ ] Test list_projects with status filter
    - [ ] Test list_projects with reviewStatus='due'
    - [ ] Test list_projects with reviewStatus='upcoming'
    - [ ] Test list_projects with date range filters
    - [ ] Test list_projects with limit
    - [ ] Refactor any verbose code
    - [ ] Add JSDoc comments to public functions

---

## Phase 4: User Story 2 - get_project (P2)

**Goal**: Retrieve all properties of a specific project by ID or name.

**Independent Test**: Request project by ID and verify all properties returned correctly.

**Acceptance Scenarios** (from spec.md):
1. Valid project ID returns complete project with all 30 properties
2. Project with parent folder includes parentFolder reference
3. Project with tags includes all tag references
4. Project with review interval includes reviewInterval, lastReviewDate, nextReviewDate
5. Project with child tasks includes taskCount and nextTask
6. Non-existent project ID returns "Project '{id}' not found" error
7. Ambiguous project name returns disambiguation error with matchingIds

---

### RED Phase - Tests First

- [X] T016 [P] [US2] Write contract tests for get-project in `tests/contract/project-tools/get-project.test.ts` -> verify PASS
  - **Dependencies**: T004, T005
  - **Effort**: M
  - **Files**:
    - `tests/contract/project-tools/get-project.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] GetProjectInputSchema requires at least one of id or name
    - [X] GetProjectInputSchema accepts id only
    - [X] GetProjectInputSchema accepts name only
    - [X] GetProjectInputSchema accepts both (id takes precedence)
    - [X] GetProjectResponseSchema accepts success with ProjectFull
    - [X] GetProjectResponseSchema accepts error response
    - [X] GetProjectResponseSchema accepts disambiguation error
    - [X] Run `pnpm test tests/contract/project-tools/get-project.test.ts` -> tests PASS

- [X] T017 [P] [US2] Write unit test: getProject returns project by ID in `tests/unit/project-tools/getProject.test.ts` -> verify FAILS
  - **Dependencies**: T005
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/getProject.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] Test mocks executeOmniFocusScript
    - [X] Test calls getProject({ id: 'proj123' })
    - [X] Test expects ProjectFull response with all properties
    - [X] Run test -> FAILS (primitive does not exist)

- [X] T018 [P] [US2] Write unit test: getProject returns project by name in `tests/unit/project-tools/getProject.test.ts`
  - **Dependencies**: T017
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/getProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls getProject({ name: 'Renovation' })
    - [X] Test expects ProjectFull response
    - [X] Test written

- [X] T019 [P] [US2] Write unit test: getProject returns not found error in `tests/unit/project-tools/getProject.test.ts`
  - **Dependencies**: T017
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/getProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks null project response
    - [X] Test expects error: "Project 'proj123' not found"
    - [X] Test verifies error message is actionable per FR-055: quotes the input value ('proj123')
    - [ ] Test written

- [X] T020 [P] [US2] Write unit test: getProject returns disambiguation error in `tests/unit/project-tools/getProject.test.ts`
  - **Dependencies**: T017
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/getProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks multiple projects with same name
    - [X] Test expects code: 'DISAMBIGUATION_REQUIRED'
    - [X] Test expects matchingIds with 2+ entries
    - [ ] Test written

---

### GREEN Phase - Implementation

- [X] T021 [US2] Implement getProject primitive in `src/tools/primitives/getProject.ts`
  - **Dependencies**: T017, T018, T019, T020
  - **Effort**: M
  - **Files**:
    - `src/tools/primitives/getProject.ts` (create)
  - **Acceptance Criteria**:
    - [X] Finds project by ID using Project.byIdentifier()
    - [X] Finds project by name using flattenedProjects.byName()
    - [X] Handles disambiguation for name lookup
    - [X] Returns complete ProjectFull with all 30 properties
    - [X] Includes projectType derivation (parallel/sequential/single-actions)
    - [X] Returns proper not found error
    - [X] Returns disambiguation error with matchingIds
    - [X] All unit tests passing

- [X] T022 [US2] Implement getProject definition in `src/tools/definitions/getProject.ts`
  - **Dependencies**: T021
  - **Effort**: S
  - **Files**:
    - `src/tools/definitions/getProject.ts` (create)
  - **Acceptance Criteria**:
    - [X] Exports `schema` (GetProjectInputSchema)
    - [X] Exports `handler` function
    - [X] Handler validates input with Zod
    - [X] Handler calls getProject primitive
    - [X] Handler formats MCP response
    - [X] Build succeeds

- [X] T023 [US2] Register get_project tool in `src/server.ts`
  - **Dependencies**: T022
  - **Effort**: S
  - **Files**:
    - `src/server.ts` (modify)
  - **Acceptance Criteria**:
    - [X] Import getProjectTool from definitions
    - [X] Register with descriptive tool name and description
    - [X] Build succeeds

- [X] T024 [US2] Run full test suite and verify all get_project tests pass
  - **Dependencies**: T023
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm test` -> all tests pass
    - [X] `pnpm typecheck` -> no errors

---

### REFACTOR Phase - Polish

- [ ] T025 [US2] Manual verification in OmniFocus and code cleanup
  - **Dependencies**: T024
  - **Effort**: M
  - **Acceptance Criteria**:
    - [ ] Test get_project with valid project ID
    - [ ] Test get_project with valid project name (unique)
    - [ ] Test get_project with non-existent ID
    - [ ] Test get_project with ambiguous name
    - [ ] Verify all ProjectFull properties returned correctly
    - [ ] Verify relationship references (parentFolder, tags, nextTask)
    - [ ] Refactor any verbose code

---

## Phase 5: User Story 3 - create_project (P3)

**Goal**: Create new projects with configurable settings and folder placement.

**Independent Test**: Create a project with various settings and verify it appears in OmniFocus correctly.

**Acceptance Scenarios** (from spec.md):
1. Create project with default settings at top level
2. Create project in specific folder by ID/name
3. Create sequential project (sequential=true)
4. Create single-actions project (containsSingletonActions=true)
5. Create project with dates (defer, due)
6. Create project with review interval
7. Create project with both sequential and containsSingletonActions -> containsSingletonActions wins (auto-clear)
8. Target folder not found returns error

---

### RED Phase - Tests First

- [X] T026 [P] [US3] Write contract tests for create-project in `tests/contract/project-tools/create-project.test.ts` -> verify PASS
  - **Dependencies**: T004, T005
  - **Effort**: M
  - **Files**:
    - `tests/contract/project-tools/create-project.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] CreateProjectInputSchema requires name
    - [X] CreateProjectInputSchema accepts all optional properties
    - [X] CreateProjectInputSchema accepts folderId or folderName
    - [X] CreateProjectInputSchema accepts position ('beginning', 'ending')
    - [X] CreateProjectInputSchema accepts sequential and containsSingletonActions (both allowed)
    - [X] CreateProjectInputSchema accepts reviewInterval object
    - [X] CreateProjectResponseSchema accepts success with id and name
    - [X] CreateProjectResponseSchema accepts error response
    - [X] Run `pnpm test tests/contract/project-tools/create-project.test.ts` -> tests PASS

- [X] T027 [P] [US3] Write unit test: createProject creates project at top level in `tests/unit/project-tools/createProject.test.ts` -> verify FAILS
  - **Dependencies**: T005
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/createProject.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] Test mocks executeOmniFocusScript
    - [X] Test calls createProject({ name: 'New Project' })
    - [X] Test expects success response with id and name
    - [X] Run test -> FAILS (primitive does not exist)

- [X] T028 [P] [US3] Write unit test: createProject creates project in folder in `tests/unit/project-tools/createProject.test.ts`
  - **Dependencies**: T027
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/createProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls createProject({ name: 'New', folderId: 'folder123' })
    - [X] Test verifies folder lookup in script
    - [X] Test written

- [X] T029 [P] [US3] Write unit test: createProject with sequential type in `tests/unit/project-tools/createProject.test.ts`
  - **Dependencies**: T027
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/createProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls createProject({ name: 'Sequential', sequential: true })
    - [X] Test verifies sequential=true and containsSingletonActions=false in script
    - [X] Test written

- [X] T030 [P] [US3] Write unit test: createProject with single-actions type in `tests/unit/project-tools/createProject.test.ts`
  - **Dependencies**: T027
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/createProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls createProject({ name: 'SAL', containsSingletonActions: true })
    - [X] Test verifies sequential=false and containsSingletonActions=true in script
    - [X] Test written

- [X] T031 [P] [US3] Write unit test: createProject with both type flags (precedence) in `tests/unit/project-tools/createProject.test.ts`
  - **Dependencies**: T027
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/createProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls createProject({ name: 'Both', sequential: true, containsSingletonActions: true })
    - [X] Test verifies containsSingletonActions wins (sequential auto-cleared)
    - [X] Test written

---

### GREEN Phase - Implementation

- [X] T032 [US3] Implement createProject primitive in `src/tools/primitives/createProject.ts`
  - **Dependencies**: T027, T028, T029, T030, T031
  - **Effort**: L
  - **Files**:
    - `src/tools/primitives/createProject.ts` (create)
  - **Acceptance Criteria**:
    - [X] Creates project with `new Project(name, position)`
    - [X] Resolves folder by ID (Folder.byIdentifier) or name (flattenedFolders.byName)
    - [X] Returns folder not found error if specified folder missing
    - [X] Implements project type auto-clear pattern (containsSingletonActions wins)
    - [X] Sets optional properties (note, status, dates, flagged, etc.)
    - [X] Sets reviewInterval as value object
    - [X] Returns success with id and name
    - [X] Returns error on failure
    - [X] All unit tests passing

- [X] T033 [US3] Implement createProject definition in `src/tools/definitions/createProject.ts`
  - **Dependencies**: T032
  - **Effort**: S
  - **Files**:
    - `src/tools/definitions/createProject.ts` (create)
  - **Acceptance Criteria**:
    - [X] Exports `schema` (CreateProjectInputSchema)
    - [X] Exports `handler` function
    - [X] Handler validates input with Zod
    - [X] Handler calls createProject primitive
    - [X] Handler formats MCP response
    - [X] Build succeeds

- [X] T034 [US3] Register create_project tool in `src/server.ts`
  - **Dependencies**: T033
  - **Effort**: S
  - **Files**:
    - `src/server.ts` (modify)
  - **Acceptance Criteria**:
    - [X] Import createProjectTool from definitions
    - [X] Register with descriptive tool name and description
    - [X] Build succeeds

- [X] T035 [US3] Run full test suite and verify all create_project tests pass
  - **Dependencies**: T034
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm test` -> all tests pass
    - [X] `pnpm typecheck` -> no errors

---

### REFACTOR Phase - Polish

- [ ] T036 [US3] Manual verification in OmniFocus and code cleanup
  - **Dependencies**: T035
  - **Effort**: M
  - **Acceptance Criteria**:
    - [ ] Test create_project with name only
    - [ ] Test create_project in folder
    - [ ] Test create_project with sequential type
    - [ ] Test create_project with single-actions type
    - [ ] Test create_project with dates and review interval
    - [ ] Test folder not found error
    - [ ] Refactor any verbose code

---

## Phase 6: User Story 4 - edit_project (P4)

**Goal**: Modify existing project properties including status, type, dates, and review settings.

**Independent Test**: Modify a project property and verify the change in OmniFocus.

**Acceptance Scenarios** (from spec.md):
1. Edit project name
2. Change project status to OnHold
3. Change project type from sequential to parallel
4. Update defer/due dates
5. Update review interval
6. Clear nullable properties by passing null
7. Auto-clear conflicting type when setting sequential or containsSingletonActions
8. Non-existent project returns error
9. Ambiguous name returns disambiguation error

---

### RED Phase - Tests First

- [X] T037 [P] [US4] Write contract tests for edit-project in `tests/contract/project-tools/edit-project.test.ts` -> verify PASS
  - **Dependencies**: T004, T005
  - **Effort**: M
  - **Files**:
    - `tests/contract/project-tools/edit-project.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] EditProjectInputSchema requires at least one of id or name
    - [X] EditProjectInputSchema accepts all editable properties
    - [X] EditProjectInputSchema accepts nullable properties (null to clear)
    - [X] EditProjectInputSchema accepts both sequential and containsSingletonActions
    - [X] EditProjectResponseSchema accepts success with id and name
    - [X] EditProjectResponseSchema accepts error response
    - [X] EditProjectResponseSchema accepts disambiguation error
    - [X] Run `pnpm test tests/contract/project-tools/edit-project.test.ts` -> tests PASS

- [X] T038 [P] [US4] Write unit test: editProject updates name by ID in `tests/unit/project-tools/editProject.test.ts` -> verify FAILS
  - **Dependencies**: T005
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/editProject.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] Test mocks executeOmniFocusScript
    - [X] Test calls editProject({ id: 'proj123', newName: 'Updated Name' })
    - [X] Test expects success response
    - [X] Run test -> FAILS (primitive does not exist)

- [X] T039 [P] [US4] Write unit test: editProject changes status in `tests/unit/project-tools/editProject.test.ts`
  - **Dependencies**: T038
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/editProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls editProject({ id: 'proj123', status: 'OnHold' })
    - [X] Test verifies status change in script
    - [X] Test written

- [X] T040 [P] [US4] Write unit test: editProject updates type with auto-clear in `tests/unit/project-tools/editProject.test.ts`
  - **Dependencies**: T038
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/editProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls editProject({ id: 'proj123', sequential: true })
    - [X] Test verifies containsSingletonActions auto-cleared
    - [X] Test calls editProject({ id: 'proj123', containsSingletonActions: true })
    - [X] Test verifies sequential auto-cleared
    - [X] Tests written

- [X] T041 [P] [US4] Write unit test: editProject clears nullable properties in `tests/unit/project-tools/editProject.test.ts`
  - **Dependencies**: T038
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/editProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls editProject({ id: 'proj123', dueDate: null })
    - [X] Test verifies dueDate set to null in script
    - [X] Test calls editProject({ id: 'proj123', reviewInterval: null })
    - [X] Test verifies reviewInterval cleared
    - [X] Tests written

- [X] T042 [P] [US4] Write unit test: editProject returns disambiguation error in `tests/unit/project-tools/editProject.test.ts`
  - **Dependencies**: T038
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/editProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks multiple projects with same name
    - [X] Test expects code: 'DISAMBIGUATION_REQUIRED'
    - [X] Test expects matchingIds with 2+ entries
    - [X] Test written

---

### GREEN Phase - Implementation

- [X] T043 [US4] Implement editProject primitive in `src/tools/primitives/editProject.ts`
  - **Dependencies**: T038, T039, T040, T041, T042
  - **Effort**: L
  - **Files**:
    - `src/tools/primitives/editProject.ts` (create)
  - **Acceptance Criteria**:
    - [X] Finds project by ID or name
    - [X] Handles disambiguation for name lookup
    - [X] Updates all editable properties
    - [X] Implements project type auto-clear pattern
    - [X] Clears nullable properties when null passed
    - [X] Updates reviewInterval as value object
    - [X] Returns success with id and name
    - [X] Returns proper error messages
    - [X] All unit tests passing

- [X] T044 [US4] Implement editProject definition in `src/tools/definitions/editProject.ts`
  - **Dependencies**: T043
  - **Effort**: S
  - **Files**:
    - `src/tools/definitions/editProject.ts` (create)
  - **Acceptance Criteria**:
    - [X] Exports `schema` (EditProjectInputSchema)
    - [X] Exports `handler` function
    - [X] Handler validates input with Zod
    - [X] Handler calls editProject primitive
    - [X] Handler formats MCP response
    - [X] Build succeeds

- [X] T045 [US4] Register edit_project tool in `src/server.ts`
  - **Dependencies**: T044
  - **Effort**: S
  - **Files**:
    - `src/server.ts` (modify)
  - **Acceptance Criteria**:
    - [X] Import editProjectTool from definitions
    - [X] Register with descriptive tool name and description
    - [X] Build succeeds

- [X] T046 [US4] Run full test suite and verify all edit_project tests pass
  - **Dependencies**: T045
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm test` -> all tests pass
    - [X] `pnpm typecheck` -> no errors

---

### REFACTOR Phase - Polish

- [ ] T047 [US4] Manual verification in OmniFocus and code cleanup
  - **Dependencies**: T046
  - **Effort**: M
  - **Acceptance Criteria**:
    - [ ] Test edit_project name change
    - [ ] Test edit_project status change
    - [ ] Test edit_project type change (with auto-clear)
    - [ ] Test edit_project date updates
    - [ ] Test edit_project review interval update/clear
    - [ ] Test disambiguation error
    - [ ] Refactor any verbose code

---

## Phase 7: User Story 5 - delete_project (P5)

**Goal**: Delete projects with cascade deletion of all child tasks.

**Independent Test**: Delete a project and verify it no longer appears in OmniFocus.

**Acceptance Scenarios** (from spec.md):
1. Delete project by ID removes project and all tasks
2. Delete project by unique name succeeds
3. Non-existent project returns error
4. Ambiguous name returns disambiguation error
5. Cascade delete confirmed in response message

---

### RED Phase - Tests First

- [X] T048 [P] [US5] Write contract tests for delete-project in `tests/contract/project-tools/delete-project.test.ts` -> verify PASS
  - **Dependencies**: T004, T005
  - **Effort**: M
  - **Files**:
    - `tests/contract/project-tools/delete-project.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] DeleteProjectInputSchema requires at least one of id or name
    - [X] DeleteProjectInputSchema accepts id only
    - [X] DeleteProjectInputSchema accepts name only
    - [X] DeleteProjectResponseSchema accepts success with id, name, message
    - [X] DeleteProjectResponseSchema accepts error response
    - [X] DeleteProjectResponseSchema accepts disambiguation error
    - [X] Run `pnpm test tests/contract/project-tools/delete-project.test.ts` -> tests PASS

- [X] T049 [P] [US5] Write unit test: deleteProject removes project by ID in `tests/unit/project-tools/deleteProject.test.ts` -> verify FAILS
  - **Dependencies**: T005
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/deleteProject.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] Test mocks executeOmniFocusScript
    - [X] Test calls deleteProject({ id: 'proj123' })
    - [X] Test expects success response with id, name, message
    - [X] Run test -> FAILS (primitive does not exist)

- [X] T050 [P] [US5] Write unit test: deleteProject removes project by name in `tests/unit/project-tools/deleteProject.test.ts`
  - **Dependencies**: T049
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/deleteProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls deleteProject({ name: 'Old Project' })
    - [X] Test expects success response
    - [X] Test written

- [X] T051 [P] [US5] Write unit test: deleteProject returns not found error in `tests/unit/project-tools/deleteProject.test.ts`
  - **Dependencies**: T049
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/deleteProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks null project response
    - [X] Test expects error: "Project 'proj123' not found"
    - [X] Test written

- [X] T052 [P] [US5] Write unit test: deleteProject returns disambiguation error in `tests/unit/project-tools/deleteProject.test.ts`
  - **Dependencies**: T049
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/deleteProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks multiple projects with same name
    - [X] Test expects code: 'DISAMBIGUATION_REQUIRED'
    - [X] Test expects matchingIds with 2+ entries
    - [X] Test written

---

### GREEN Phase - Implementation

- [X] T053 [US5] Implement deleteProject primitive in `src/tools/primitives/deleteProject.ts`
  - **Dependencies**: T049, T050, T051, T052
  - **Effort**: M
  - **Files**:
    - `src/tools/primitives/deleteProject.ts` (create)
  - **Acceptance Criteria**:
    - [X] Finds project by ID or name
    - [X] Handles disambiguation for name lookup
    - [X] Captures project name and task count before deletion
    - [X] Calls deleteObject(project) for cascade delete
    - [X] Returns success with id, name, and cascade confirmation message
    - [X] Returns proper error messages
    - [X] All unit tests passing

- [X] T054 [US5] Implement deleteProject definition in `src/tools/definitions/deleteProject.ts`
  - **Dependencies**: T053
  - **Effort**: S
  - **Files**:
    - `src/tools/definitions/deleteProject.ts` (create)
  - **Acceptance Criteria**:
    - [X] Exports `schema` (DeleteProjectInputSchema)
    - [X] Exports `handler` function
    - [X] Handler validates input with Zod
    - [X] Handler calls deleteProject primitive
    - [X] Handler formats MCP response
    - [X] Build succeeds

- [X] T055 [US5] Register delete_project tool in `src/server.ts`
  - **Dependencies**: T054
  - **Effort**: S
  - **Files**:
    - `src/server.ts` (modify)
  - **Acceptance Criteria**:
    - [X] Import deleteProjectTool from definitions
    - [X] Register with descriptive tool name and description
    - [X] Build succeeds

- [X] T056 [US5] Run full test suite and verify all delete_project tests pass
  - **Dependencies**: T055
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm test` -> all tests pass
    - [X] `pnpm typecheck` -> no errors

---

### REFACTOR Phase - Polish

- [ ] T057 [US5] Manual verification in OmniFocus and code cleanup
  - **Dependencies**: T056
  - **Effort**: M
  - **Acceptance Criteria**:
    - [ ] Test delete_project on project with tasks (verify cascade)
    - [ ] Test delete_project on empty project
    - [ ] Test delete_project with non-existent ID
    - [ ] Test delete_project with ambiguous name
    - [ ] Verify response message includes task count
    - [ ] Refactor any verbose code

---

## Phase 8: User Story 6 - move_project (P6)

**Goal**: Move projects between folders or to root level.

**Independent Test**: Move a project to a different folder and verify its new location.

**Acceptance Scenarios** (from spec.md):
1. Move project to folder by ID
2. Move project to folder by name
3. Move project to root (top-level)
4. Move project with position (beginning/ending)
5. Move to same folder succeeds as no-op
6. Non-existent project returns error
7. Non-existent target folder returns error
8. Ambiguous project name returns disambiguation error

---

### RED Phase - Tests First

- [X] T058 [P] [US6] Write contract tests for move-project in `tests/contract/project-tools/move-project.test.ts` -> verify PASS
  - **Dependencies**: T004, T005
  - **Effort**: M
  - **Files**:
    - `tests/contract/project-tools/move-project.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] MoveProjectInputSchema requires at least one of id or name
    - [X] MoveProjectInputSchema accepts targetFolderId or targetFolderName
    - [X] MoveProjectInputSchema accepts root: true
    - [X] MoveProjectInputSchema accepts position ('beginning', 'ending')
    - [X] MoveProjectResponseSchema accepts success with id, name, parentFolderId, parentFolderName
    - [X] MoveProjectResponseSchema accepts error response
    - [X] MoveProjectResponseSchema accepts disambiguation error
    - [X] Run `pnpm test tests/contract/project-tools/move-project.test.ts` -> tests PASS

- [X] T059 [P] [US6] Write unit test: moveProject moves to folder by ID in `tests/unit/project-tools/moveProject.test.ts` -> verify FAILS
  - **Dependencies**: T005
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/moveProject.test.ts` (create)
  - **Acceptance Criteria**:
    - [X] Test mocks executeOmniFocusScript
    - [X] Test calls moveProject({ id: 'proj123', targetFolderId: 'folder456' })
    - [X] Test expects success with new parentFolderId and parentFolderName
    - [X] Run test -> FAILS (primitive does not exist)

- [X] T060 [P] [US6] Write unit test: moveProject moves to root in `tests/unit/project-tools/moveProject.test.ts`
  - **Dependencies**: T059
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/moveProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test calls moveProject({ id: 'proj123', root: true })
    - [X] Test expects success with parentFolderId=null, parentFolderName=null
    - [X] Test written

- [X] T061 [P] [US6] Write unit test: moveProject returns target not found error in `tests/unit/project-tools/moveProject.test.ts`
  - **Dependencies**: T059
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/moveProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks target folder not found
    - [X] Test expects error: "Folder 'folder456' not found"
    - [X] Test written

- [X] T062 [P] [US6] Write unit test: moveProject returns disambiguation error in `tests/unit/project-tools/moveProject.test.ts`
  - **Dependencies**: T059
  - **Effort**: S
  - **Files**:
    - `tests/unit/project-tools/moveProject.test.ts` (append)
  - **Acceptance Criteria**:
    - [X] Test mocks multiple projects with same name
    - [X] Test expects code: 'DISAMBIGUATION_REQUIRED'
    - [X] Test expects matchingIds with 2+ entries
    - [X] Test written

---

### GREEN Phase - Implementation

- [X] T063 [US6] Implement moveProject primitive in `src/tools/primitives/moveProject.ts`
  - **Dependencies**: T059, T060, T061, T062
  - **Effort**: M
  - **Files**:
    - `src/tools/primitives/moveProject.ts` (create)
  - **Acceptance Criteria**:
    - [X] Finds project by ID or name
    - [X] Handles disambiguation for name lookup
    - [X] Resolves target folder by ID or name
    - [X] Handles root: true using library.ending
    - [X] Uses moveSections([project], targetFolder) API
    - [X] Handles position (beginning/ending)
    - [X] Returns success with id, name, parentFolderId, parentFolderName
    - [X] Returns target folder not found error
    - [X] Returns proper error messages
    - [X] All unit tests passing

- [X] T064 [US6] Implement moveProject definition in `src/tools/definitions/moveProject.ts`
  - **Dependencies**: T063
  - **Effort**: S
  - **Files**:
    - `src/tools/definitions/moveProject.ts` (create)
  - **Acceptance Criteria**:
    - [X] Exports `schema` (MoveProjectInputSchema)
    - [X] Exports `handler` function
    - [X] Handler validates input with Zod
    - [X] Handler calls moveProject primitive
    - [X] Handler formats MCP response
    - [X] Build succeeds

- [X] T065 [US6] Register move_project tool in `src/server.ts`
  - **Dependencies**: T064
  - **Effort**: S
  - **Files**:
    - `src/server.ts` (modify)
  - **Acceptance Criteria**:
    - [X] Import moveProjectTool from definitions
    - [X] Register with descriptive tool name and description
    - [X] Build succeeds

- [X] T066 [US6] Run full test suite and verify all move_project tests pass
  - **Dependencies**: T065
  - **Effort**: XS
  - **Acceptance Criteria**:
    - [X] `pnpm test` -> all tests pass
    - [X] `pnpm typecheck` -> no errors

---

### REFACTOR Phase - Polish

- [ ] T067 [US6] Manual verification in OmniFocus and code cleanup
  - **Dependencies**: T066
  - **Effort**: M
  - **Acceptance Criteria**:
    - [ ] Test move_project to folder
    - [ ] Test move_project to root
    - [ ] Test move_project with position
    - [ ] Test move_project to same folder (no-op)
    - [ ] Test target folder not found error
    - [ ] Test disambiguation error
    - [ ] Refactor any verbose code

---

## Phase 9: Polish & Cross-Cutting Concerns

*Final cleanup, documentation, and verification*

**Goal**: Complete documentation updates, full test coverage verification, and cross-tool integration testing.

### Tasks

- [X] T068 Update README.md with new tools documentation
  - **Dependencies**: T067
  - **Effort**: M
  - **Files**:
    - `README.md` (modify)
  - **Acceptance Criteria**:
    - [X] Add list_projects to tool list with description: "Query projects with filters (folder, status, review, dates)"
    - [X] Add get_project to tool list with description: "Retrieve complete project details (30 properties)"
    - [X] Add create_project to tool list with description: "Create projects with settings and folder placement"
    - [X] Add edit_project to tool list with description: "Modify project properties including status and type"
    - [X] Add delete_project to tool list with description: "Delete projects with cascade task deletion"
    - [X] Add move_project to tool list with description: "Move projects between folders or to root"
    - [X] Update tool count in overview section (add 6 to current count)
    - [X] Add "Project Management" section header before listing project tools

- [X] T069 Update CLAUDE.md with Phase 4 completion notes
  - **Dependencies**: T068
  - **Effort**: S
  - **Files**:
    - `CLAUDE.md` (modify)
  - **Acceptance Criteria**:
    - [X] Add Phase 4 to Recent Changes section with date
    - [X] List all 6 new tools: list_projects, get_project, create_project, edit_project, delete_project, move_project
    - [X] Update status from "Specifying" to "Complete"
    - [X] Add note about project type auto-clear pattern (unique to Phase 4)
    - [X] Reference spec location: `specs/004-project-management/spec.md`

- [X] T070 Run full test coverage and verify >= 80%
  - **Dependencies**: T068
  - **Effort**: S
  - **Acceptance Criteria**:
    - [X] `pnpm test:coverage` -> all tests pass
    - [X] Coverage >= 80% for new files (82.66% overall)
    - [X] No uncovered critical paths

- [X] T071 Run linting and final build verification
  - **Dependencies**: T070
  - **Effort**: S
  - **Acceptance Criteria**:
    - [X] `pnpm lint` -> no errors
    - [X] `pnpm build` -> success
    - [X] `pnpm typecheck` -> no errors

- [ ] T072 Create PR for Phase 4 completion
  - **Dependencies**: T071
  - **Effort**: S
  - **Acceptance Criteria**:
    - [ ] All tests passing
    - [ ] No lint errors
    - [ ] Documentation updated
    - [ ] PR description with summary of changes
    - [ ] Link to spec.md and plan.md

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
| T026-T031 | T004, T005 |
| T032 | T027-T031 |
| T033 | T032 |
| T034 | T033 |
| T035 | T034 |
| T036 | T035 |
| T037-T042 | T004, T005 |
| T043 | T038-T042 |
| T044 | T043 |
| T045 | T044 |
| T046 | T045 |
| T047 | T046 |
| T048-T052 | T004, T005 |
| T053 | T049-T052 |
| T054 | T053 |
| T055 | T054 |
| T056 | T055 |
| T057 | T056 |
| T058-T062 | T004, T005 |
| T063 | T059-T062 |
| T064 | T063 |
| T065 | T064 |
| T066 | T065 |
| T067 | T066 |
| T068 | T067 |
| T069 | T068 |
| T070 | T068 |
| T071 | T070 |
| T072 | T071 |

## Critical Path

The minimum path to completion follows:

```text
T001 -> T002 -> T003 -> T005 -> T007 -> T011 -> T012 -> T013 -> T014 -> T015
     -> T017 -> T021 -> T022 -> T023 -> T024 -> T025
     -> T027 -> T032 -> T033 -> T034 -> T035 -> T036
     -> T038 -> T043 -> T044 -> T045 -> T046 -> T047
     -> T049 -> T053 -> T054 -> T055 -> T056 -> T057
     -> T059 -> T063 -> T064 -> T065 -> T066 -> T067
     -> T068 -> T069 -> T070 -> T071 -> T072
```

**Critical path length**: 42 tasks (sequential dependencies)

## Risks & Blockers

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Review interval complexity | Medium | Medium | Research complete; value object pattern documented |
| Project type auto-clear logic | Medium | Low | Pattern documented in spec clarification |
| Folder disambiguation | Low | Medium | Follow existing folder lookup patterns |
| Cascade delete safety | Medium | Low | Clear documentation; confirm message |
| Position parameter complexity | Low | Low | Research shows clear API (moveSections) |
| Large database performance | Medium | Low | Server-side filtering; limit parameter |

## Implementation Strategy

### Recommended Approach: MVP First

**MVP Scope**: User Stories 1-3 (list_projects, get_project, create_project)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 - list_projects (P1)
4. Complete Phase 4: US2 - get_project (P2)
5. Complete Phase 5: US3 - create_project (P3)
6. **STOP and VALIDATE**: Deploy/demo if ready

This delivers:
- Project discovery (list with filters)
- Project inspection (get full details)
- Project creation (new projects with settings)

### Full Implementation

Continue with US4-US6 for complete CRUD:
- US4: edit_project - modify properties
- US5: delete_project - remove projects
- US6: move_project - reorganize hierarchy

### Time Estimates by Phase

| Phase | Estimated Time | Notes |
|-------|----------------|-------|
| Phase 1: Setup | 1-2 hours | Copy contracts, verify build |
| Phase 2: Foundational | 2-3 hours | Shared schema tests |
| Phase 3: list_projects | 6-8 hours | Most complex (filters, review status) |
| Phase 4: get_project | 4-6 hours | ProjectFull with 30 properties |
| Phase 5: create_project | 6-8 hours | Type auto-clear, folder placement |
| Phase 6: edit_project | 6-8 hours | All property updates, type switching |
| Phase 7: delete_project | 3-4 hours | Simplest write operation |
| Phase 8: move_project | 4-6 hours | moveSections API |
| Phase 9: Polish | 2-3 hours | Documentation, final verification |

**Total Estimated**: 5-7 days (full implementation)
**MVP Estimated**: 3-4 days (US1-US3 only)

### Parallelization Opportunities

Within each user story phase:
- Contract tests [P] can run in parallel with initial unit test setup
- Unit tests within a story can be written in parallel before implementation

Between phases:
- Phases 3-8 are sequential by dependency (each tool may use previous tools)
- Phase 9 depends on all user stories complete

## Quality Checklist

Before marking Phase 4 complete:

- [ ] All 72 tasks completed
- [ ] Every task has clear acceptance criteria met
- [ ] No XL tasks remain (all decomposed)
- [ ] Dependencies explicit and followed
- [ ] Parallel tasks marked [P] executed appropriately
- [ ] Effort estimates validated
- [ ] Critical path identified and followed
- [ ] Risks documented and mitigated
- [ ] Total effort aligned with plan estimate (~5-7 days)
- [ ] All tools manually verified in OmniFocus
- [ ] Documentation updated (README.md, CLAUDE.md)
- [ ] Test coverage >= 80% for new files
- [ ] No lint errors
- [ ] Build succeeds
