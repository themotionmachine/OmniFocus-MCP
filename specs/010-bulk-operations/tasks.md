# Tasks: Bulk Operations

**Input**: Design documents from `/specs/010-bulk-operations/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. User Stories 1-6 are independently testable after the Foundation phase completes. Stories marked [P] can proceed in parallel.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Contracts**: `src/contracts/bulk-tools/` (shared schemas in `shared/` subdirectory)
- **Definitions**: `src/tools/definitions/`
- **Primitives**: `src/tools/primitives/`
- **Contract Tests**: `tests/contract/bulk-tools/`
- **Unit Tests**: `tests/unit/bulk-tools/`
- **Integration Tests**: `tests/integration/`

---

## Phase 1: Foundation (Shared Schemas & Contracts Infrastructure)

**Purpose**: Create all shared schemas and per-tool contracts that every user story depends on. No tool implementation yet -- contracts only.

### Shared Schemas

- [ ] T001 Create shared ItemIdentifier schema in `src/contracts/bulk-tools/shared/item-identifier.ts` -- copy from `specs/010-bulk-operations/contracts/shared.ts` ItemIdentifierSchema section, adapting imports for `src/` context
- [ ] T002 Create shared BulkBatchItemResult and Summary schemas in `src/contracts/bulk-tools/shared/batch.ts` -- copy BulkBatchItemResultSchema and SummarySchema from `specs/010-bulk-operations/contracts/shared.ts`
- [ ] T003 Create TaskPosition schema in `src/contracts/bulk-tools/shared/task-position.ts` -- copy TaskPositionSchema from `specs/010-bulk-operations/contracts/shared.ts` with all 3 refine validators (exactly-one-target, no-multiple-targets, relativeTo-required)
- [ ] T004 Create SectionPosition schema in `src/contracts/bulk-tools/shared/section-position.ts` -- copy SectionPositionSchema from `specs/010-bulk-operations/contracts/shared.ts` with relativeTo refine validator
- [ ] T005 Create PropertyUpdateSet schema in `src/contracts/bulk-tools/shared/property-update.ts` -- copy PropertyUpdateSetSchema from `specs/010-bulk-operations/contracts/shared.ts` with all 5 refine validators (at-least-one-property, 4 mutual exclusions)
- [ ] T006 Create shared barrel export in `src/contracts/bulk-tools/shared/index.ts` -- re-export all shared schemas from item-identifier, batch, task-position, section-position, property-update

### Per-Tool Contracts

- [ ] T007 [P] Create move-tasks contract in `src/contracts/bulk-tools/move-tasks.ts` -- input schema (items + TaskPosition), success/error response discriminated union; reference `specs/010-bulk-operations/contracts/move-tasks.ts`
- [ ] T008 [P] Create duplicate-tasks contract in `src/contracts/bulk-tools/duplicate-tasks.ts` -- input schema (items + TaskPosition), success/error response with newId/newName; reference `specs/010-bulk-operations/contracts/duplicate-tasks.ts`
- [ ] T009 [P] Create batch-update-tasks contract in `src/contracts/bulk-tools/batch-update-tasks.ts` -- input schema (items + PropertyUpdateSet), success/error response; reference `specs/010-bulk-operations/contracts/batch-update-tasks.ts`
- [ ] T010 [P] Create convert-tasks-to-projects contract in `src/contracts/bulk-tools/convert-tasks-to-projects.ts` -- input schema (items + optional targetFolderId/targetFolderName), success/error response with newId/newName; reference `specs/010-bulk-operations/contracts/convert-tasks-to-projects.ts`
- [ ] T011 [P] Create move-sections contract in `src/contracts/bulk-tools/move-sections.ts` -- input schema (items + SectionPosition), success/error response; reference `specs/010-bulk-operations/contracts/move-sections.ts`
- [ ] T012 [P] Create duplicate-sections contract in `src/contracts/bulk-tools/duplicate-sections.ts` -- input schema (items + SectionPosition), success/error response with newId/newName; reference `specs/010-bulk-operations/contracts/duplicate-sections.ts`
- [ ] T013 Create bulk-tools barrel export in `src/contracts/bulk-tools/index.ts` -- re-export all contracts from shared/, move-tasks, duplicate-tasks, batch-update-tasks, convert-tasks-to-projects, move-sections, duplicate-sections

### Contract Tests

- [ ] T014 [P] Write shared schemas contract tests in `tests/contract/bulk-tools/shared.contract.test.ts` -- validate ItemIdentifier (id/name/both/neither), BulkBatchItemResult (all fields), Summary, TaskPosition (valid/invalid targets, relativeTo), SectionPosition (valid/invalid), PropertyUpdateSet (at-least-one, mutual exclusions, clearX semantics) -> verify PASSES
- [ ] T015 [P] Write move-tasks contract tests in `tests/contract/bulk-tools/move-tasks.contract.test.ts` -- validate input (1-100 items, position variants), success response (results + summary), error response -> verify PASSES
- [ ] T016 [P] Write duplicate-tasks contract tests in `tests/contract/bulk-tools/duplicate-tasks.contract.test.ts` -- validate input, success response with newId/newName, error response -> verify PASSES
- [ ] T017 [P] Write batch-update-tasks contract tests in `tests/contract/bulk-tools/batch-update-tasks.contract.test.ts` -- validate input (items + properties), success response, error response -> verify PASSES
- [ ] T018 [P] Write convert-tasks-to-projects contract tests in `tests/contract/bulk-tools/convert-tasks-to-projects.contract.test.ts` -- validate input (items + optional folder), success response with newId/newName, error response -> verify PASSES
- [ ] T019 [P] Write move-sections contract tests in `tests/contract/bulk-tools/move-sections.contract.test.ts` -- validate input, success response, error response -> verify PASSES
- [ ] T020 [P] Write duplicate-sections contract tests in `tests/contract/bulk-tools/duplicate-sections.contract.test.ts` -- validate input, success response with newId/newName, error response -> verify PASSES

**Checkpoint**: All shared schemas and per-tool contracts exist with passing tests. `pnpm build && pnpm test` green. No tools implemented yet.

---

## Phase 2: User Story 1 - Move Tasks (Priority: P1) [P]

**Goal**: Move 1-100 tasks to a new location (project, inbox, or parent task) with position control (FR-001, FR-007, FR-008, FR-009, FR-010, FR-015, FR-016)

**Independent Test**: Create tasks in one project, move them to another, verify they appear in the target with correct ordering and are removed from the source.

### RED Phase - Tests First

- [ ] T021 [P] [US1] Write unit tests for moveTasks primitive in `tests/unit/bulk-tools/moveTasks.test.ts` -- test: script generation with all position variants (project by ID/name, task by ID/name, inbox, beginning/ending/before/after), target pre-validation failure (TARGET_NOT_FOUND), relativeTo failure (RELATIVE_TARGET_NOT_FOUND), per-item NOT_FOUND, DISAMBIGUATION_REQUIRED, OPERATION_FAILED, partial failure (some succeed some fail), 100-item batch, inactive target warning, Zod parse of response -> verify FAILS

### GREEN Phase - Implementation

- [ ] T022 [US1] Implement moveTasks primitive in `src/tools/primitives/moveTasks.ts` -- generateMoveTasksScript() builds OmniJS IIFE with: target resolution (project/task/inbox), position resolution via ChildInsertionLocation (AD-11), relativeTo sibling resolution (AD-15), inactive target warning check (AD-13), per-item loop with Task.byIdentifier/flattenedTasks.byName + disambiguation, moveTasks([task], position) call per item, post-move verification (AD-12), Zod .parse() for response narrowing (AD-09) -> unit tests GREEN
- [ ] T023 [US1] Implement moveTasks definition in `src/tools/definitions/moveTasks.ts` -- schema = MoveTasksInputSchema, handler calls primitive, discriminated union narrowing (AD-10), format per-item results for MCP text response, handle isError for top-level failures
- [ ] T024 [US1] Register move_tasks tool in `src/server.ts` -- add import and server.tool() registration following existing pattern

### REFACTOR Phase

- [ ] T025 [US1] Run `pnpm build && pnpm test` -- all tests green, no regressions
- [ ] T026 [US1] Manual verification of move_tasks in OmniFocus Script Editor -- test moveTasks() with real tasks, verify position placement

**Checkpoint**: move_tasks fully functional. Tasks can be moved between projects, to inbox, to parent tasks with all position variants.

---

## Phase 3: User Story 2 - Duplicate Tasks (Priority: P2) [P]

**Goal**: Duplicate 1-100 tasks to a new location, creating active copies with all properties preserved and new IDs returned (FR-002, FR-007, FR-008, FR-009, FR-010, FR-011, FR-017)

**Independent Test**: Duplicate a task into a different project, verify both original and copy exist with matching properties, copy is active/incomplete, response includes new task IDs.

### RED Phase - Tests First

- [ ] T027 [P] [US2] Write unit tests for duplicateTasks primitive in `tests/unit/bulk-tools/duplicateTasks.test.ts` -- test: script generation with all position variants, duplicateTasks([task], position)[0] access pattern, newId/newName in results, markIncomplete() call for completed/dropped originals (FR-011), subtask duplication, target pre-validation, per-item errors (NOT_FOUND, DISAMBIGUATION_REQUIRED, OPERATION_FAILED), partial failure, inactive target warning, Zod parse -> verify FAILS

### GREEN Phase - Implementation

- [ ] T028 [US2] Implement duplicateTasks primitive in `src/tools/primitives/duplicateTasks.ts` -- generateDuplicateTasksScript() builds OmniJS IIFE with: target resolution, position resolution (AD-11), per-item loop with duplicateTasks([task], position)[0], markIncomplete() reset (FR-011/AD-06), read newCopy.id.primaryKey and newCopy.name for result, inactive target warning (AD-13), Zod .parse() (AD-09) -> unit tests GREEN
- [ ] T029 [US2] Implement duplicateTasks definition in `src/tools/definitions/duplicateTasks.ts` -- schema = DuplicateTasksInputSchema, handler calls primitive, format results with newId/newName
- [ ] T030 [US2] Register duplicate_tasks tool in `src/server.ts`

### REFACTOR Phase

- [ ] T031 [US2] Run `pnpm build && pnpm test` -- all tests green, no regressions
- [ ] T032 [US2] Manual verification of duplicate_tasks in OmniFocus Script Editor -- test duplicateTasks() with real tasks including completed originals

**Checkpoint**: duplicate_tasks fully functional. Tasks can be copied with all properties preserved, copies always active.

---

## Phase 4: User Story 3 - Batch Update Tasks (Priority: P2) [P]

**Goal**: Update multiple properties (flag, dates, tags, note, estimated minutes) across 1-100 tasks in a single operation (FR-006, FR-007, FR-008, FR-009, FR-013, FR-014)

**Independent Test**: Create tasks, batch-update flagged status and due dates, verify each task reflects the changes. Test tag add/remove ordering.

### RED Phase - Tests First

- [ ] T033 [P] [US3] Write unit tests for batchUpdateTasks primitive in `tests/unit/bulk-tools/batchUpdateTasks.test.ts` -- test: script generation with all property combinations (flagged, dueDate, deferDate, estimatedMinutes, plannedDate, note, addTags, removeTags, clearX flags), tag removal-before-addition order (FR-014), version gating for plannedDate/clearPlannedDate (VERSION_NOT_SUPPORTED), per-item TAG_NOT_FOUND, note append behavior, mutual exclusion enforcement at schema level, empty properties rejection (FR-013), clearX:false semantics, partial failures, Zod parse -> verify FAILS

### GREEN Phase - Implementation

- [ ] T034 [US3] Implement batchUpdateTasks primitive in `src/tools/primitives/batchUpdateTasks.ts` -- generateBatchUpdateTasksScript() builds OmniJS IIFE with: v4.7+ version check for plannedDate/clearPlannedDate, tag resolution loop (resolve all tags once before item loop), per-item loop with Task.byIdentifier/flattenedTasks.byName + disambiguation, property application (removeTags first then addTags per FR-014), clearX handling (set property to null), note append, try-catch per task for atomic per-task results, Zod .parse() (AD-09) -> unit tests GREEN
- [ ] T035 [US3] Implement batchUpdateTasks definition in `src/tools/definitions/batchUpdateTasks.ts` -- schema = BatchUpdateTasksInputSchema, handler calls primitive, format per-item results
- [ ] T036 [US3] Register batch_update_tasks tool in `src/server.ts`

### REFACTOR Phase

- [ ] T037 [US3] Run `pnpm build && pnpm test` -- all tests green, no regressions
- [ ] T038 [US3] Manual verification of batch_update_tasks in OmniFocus Script Editor -- test property updates, tag operations, date clearing

**Checkpoint**: batch_update_tasks fully functional. Multiple properties can be updated across multiple tasks in one operation.

---

## Phase 5: User Story 4 - Convert Tasks to Projects (Priority: P3) [P]

**Goal**: Convert 1-100 tasks to projects, placing new projects in an optional target folder, preserving subtasks (FR-003, FR-007, FR-008, FR-009, FR-012, FR-017)

**Independent Test**: Create a task with subtasks, convert to a project in a target folder, verify project exists with subtasks as children.

### RED Phase - Tests First

- [ ] T039 [P] [US4] Write unit tests for convertTasksToProjects primitive in `tests/unit/bulk-tools/convertTasksToProjects.test.ts` -- test: script generation with/without target folder (by ID/name, default to library root), convertTasksToProjects([task], position) API call, newId/newName in results, ALREADY_A_PROJECT error for project root tasks (FR-012), per-item NOT_FOUND, DISAMBIGUATION_REQUIRED, TARGET_NOT_FOUND for invalid folder, partial failure, targetFolderId precedence over targetFolderName, Zod parse -> verify FAILS

### GREEN Phase - Implementation

- [ ] T040 [US4] Implement convertTasksToProjects primitive in `src/tools/primitives/convertTasksToProjects.ts` -- generateConvertTasksToProjectsScript() builds OmniJS IIFE with: optional folder resolution (targetFolderId > targetFolderName > library root), pre-validate folder if specified (TARGET_NOT_FOUND), per-item loop with Task.byIdentifier/flattenedTasks.byName, check task.containingProject !== null for ALREADY_A_PROJECT, convertTasksToProjects([task], folder.ending or library.ending) call, read new project ID/name from return value, Zod .parse() (AD-09) -> unit tests GREEN
- [ ] T041 [US4] Implement convertTasksToProjects definition in `src/tools/definitions/convertTasksToProjects.ts` -- schema = ConvertTasksToProjectsInputSchema, handler calls primitive, format results with newId/newName
- [ ] T042 [US4] Register convert_tasks_to_projects tool in `src/server.ts`

### REFACTOR Phase

- [ ] T043 [US4] Run `pnpm build && pnpm test` -- all tests green, no regressions
- [ ] T044 [US4] Manual verification of convert_tasks_to_projects in OmniFocus Script Editor -- test conversion with subtasks, folder placement, root-task rejection

**Checkpoint**: convert_tasks_to_projects fully functional. Tasks can be promoted to projects with subtask preservation.

---

## Phase 6: User Story 5 - Move Sections (Priority: P3) [P]

**Goal**: Move 1-100 sections (folders and/or projects) to a new location in the folder hierarchy (FR-004, FR-007, FR-008, FR-009, FR-010, FR-015, FR-016)

**Independent Test**: Create a project in Folder A, move it to Folder B via the bulk tool, verify it appears in Folder B.

### RED Phase - Tests First

- [ ] T045 [P] [US5] Write unit tests for moveSections primitive in `tests/unit/bulk-tools/moveSections.test.ts` -- test: script generation with all SectionPosition variants (beginning/ending with/without relativeTo, before/after), Folder-then-Project probe resolution (AD-14), itemType set to 'folder' or 'project', mixed folder+project batches, target pre-validation (TARGET_NOT_FOUND), relativeTo resolution, per-item NOT_FOUND, DISAMBIGUATION_REQUIRED (across both types), OPERATION_FAILED (circular hierarchy), post-move verification via parentFolder read (AD-12), library root placement, Zod parse -> verify FAILS

### GREEN Phase - Implementation

- [ ] T046 [US5] Implement moveSections primitive in `src/tools/primitives/moveSections.ts` -- generateMoveSectionsScript() builds OmniJS IIFE with: target resolution (folder or library root from SectionPosition), relativeTo resolution (AD-15), per-item loop with Folder.byIdentifier then Project.byIdentifier probe (AD-14), name-based search across flattenedFolders + flattenedProjects for disambiguation, moveSections([section], position) call per item, post-move verification (AD-12), Zod .parse() (AD-09) -> unit tests GREEN
- [ ] T047 [US5] Implement moveSections definition in `src/tools/definitions/moveSections.ts` -- schema = MoveSectionsInputSchema, handler calls primitive, format per-item results
- [ ] T048 [US5] Register move_sections tool in `src/server.ts`

### REFACTOR Phase

- [ ] T049 [US5] Run `pnpm build && pnpm test` -- all tests green, no regressions
- [ ] T050 [US5] Manual verification of move_sections in OmniFocus Script Editor -- test moving projects between folders, folders to root

**Checkpoint**: move_sections fully functional. Folders and projects can be reorganized in the hierarchy.

---

## Phase 7: User Story 6 - Duplicate Sections (Priority: P4) [P]

**Goal**: Duplicate 1-100 sections (folders and/or projects) to a new location, preserving all contents and returning new IDs (FR-005, FR-007, FR-008, FR-009, FR-010, FR-017)

**Independent Test**: Duplicate a project with tasks into a folder, verify copy exists with all tasks preserved, response includes new IDs.

### RED Phase - Tests First

- [ ] T051 [P] [US6] Write unit tests for duplicateSections primitive in `tests/unit/bulk-tools/duplicateSections.test.ts` -- test: script generation with all SectionPosition variants, Folder-then-Project probe resolution (AD-14), duplicateSections([section], position)[0] access pattern, newId/newName in results, content preservation (child projects, tasks, settings), target pre-validation, per-item errors, mixed folder+project batches, library root placement, Zod parse -> verify FAILS

### GREEN Phase - Implementation

- [ ] T052 [US6] Implement duplicateSections primitive in `src/tools/primitives/duplicateSections.ts` -- generateDuplicateSectionsScript() builds OmniJS IIFE with: target resolution, position resolution, per-item loop with Folder-then-Project probe (AD-14), duplicateSections([section], position)[0] call, read newCopy.id.primaryKey and newCopy.name, Zod .parse() (AD-09) -> unit tests GREEN
- [ ] T053 [US6] Implement duplicateSections definition in `src/tools/definitions/duplicateSections.ts` -- schema = DuplicateSectionsInputSchema, handler calls primitive, format results with newId/newName
- [ ] T054 [US6] Register duplicate_sections tool in `src/server.ts`

### REFACTOR Phase

- [ ] T055 [US6] Run `pnpm build && pnpm test` -- all tests green, no regressions
- [ ] T056 [US6] Manual verification of duplicate_sections in OmniFocus Script Editor -- test duplicating projects with tasks, folders with substructure

**Checkpoint**: duplicate_sections fully functional. Project and folder templates can be duplicated with full content preservation.

---

## Phase 8: Integration Testing & Polish

**Purpose**: Cross-tool verification, integration tests, documentation, and final validation

- [ ] T057 [P] Write integration test scaffold in `tests/integration/bulk-operations.integration.test.ts` -- test round-trip scenarios: move tasks then move back, duplicate then verify properties, convert task to project then verify subtasks, batch-update then verify each property, move sections then verify hierarchy, duplicate sections then verify contents
- [ ] T058 [P] Update CLAUDE.md Recent Changes section with bulk-operations implementation details -- tool count, test count, contract locations
- [ ] T059 Run full test suite: `pnpm test` -- verify all contract, unit, and integration tests pass with no regressions
- [ ] T060 Run coverage check: `pnpm test:coverage` -- verify coverage meets project standards
- [ ] T061 Run lint check: `pnpm lint` -- verify no lint violations
- [ ] T062 Run type check: `pnpm typecheck` -- verify no TypeScript errors
- [ ] T063 Final build verification: `pnpm build` -- verify clean build with all 6 new tools

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundation)**: No dependencies -- start immediately. T001-T006 (shared schemas) must complete before T007-T013 (per-tool contracts). T014-T020 (contract tests) can run in parallel once contracts exist.
- **Phase 2-7 (User Stories)**: All depend on Phase 1 completion. All 6 user stories can proceed in parallel once Foundation is complete.
- **Phase 8 (Polish)**: Depends on all user story phases being complete.

### User Story Dependencies

- **US1 - Move Tasks (P1)**: Can start after Phase 1. No dependencies on other stories.
- **US2 - Duplicate Tasks (P2)**: Can start after Phase 1. No dependencies on other stories. Shares TaskPosition pattern with US1 but uses independently owned contract.
- **US3 - Batch Update Tasks (P2)**: Can start after Phase 1. No dependencies on other stories. Uses PropertyUpdateSet schema from Foundation.
- **US4 - Convert Tasks to Projects (P3)**: Can start after Phase 1. No dependencies on other stories. Unique conversion pattern.
- **US5 - Move Sections (P3)**: Can start after Phase 1. No dependencies on other stories. Uses SectionPosition schema from Foundation.
- **US6 - Duplicate Sections (P4)**: Can start after Phase 1. No dependencies on other stories. Shares SectionPosition pattern with US5 but uses independently owned contract.

### TDD Order Within Each User Story (MANDATORY)

```text
1. RED: Write failing unit tests
   - Unit tests for primitive (script generation, error handling, response parsing)
   - Run `pnpm test` -> verify tests FAIL

2. GREEN: Implement minimum code
   - Primitive first (OmniJS script generation + Zod parse)
   - Definition second (MCP handler wiring)
   - Register tool in server.ts
   - Run `pnpm test` -> tests turn GREEN

3. REFACTOR: Clean up
   - Build + full test suite pass
   - Manual OmniFocus verification (last)
```

### Parallel Opportunities

- **Phase 1**: T007-T012 (per-tool contracts) are all [P] -- different files, no dependencies on each other. T014-T020 (contract tests) are all [P].
- **Phase 2-7**: All 6 user stories are [P] relative to each other -- each operates on different definition/primitive files with independently owned contracts.
- **Within each story**: RED phase tests can be written in parallel if split across multiple test files.
- **Phase 8**: T057 and T058 are [P] relative to each other.

---

## TDD Parallel Example: Foundation + User Stories

```bash
# Phase 1: Foundation (sequential within, then parallel contract tests)
T001-T006 Shared schemas (sequential -- each builds on prior)
T007-T012 Per-tool contracts (parallel -- different files)
T013      Barrel export (after T007-T012)
T014-T020 Contract tests (parallel -- different files)

# Phase 2-7: All user stories in parallel (after Phase 1)
# Developer A: US1 (move_tasks)     T021-T026
# Developer B: US2 (duplicate_tasks) T027-T032
# Developer C: US3 (batch_update)    T033-T038
# Developer D: US4 (convert)         T039-T044
# Developer E: US5 (move_sections)   T045-T050
# Developer F: US6 (duplicate_sections) T051-T056

# Phase 8: Polish (after all stories complete)
T057-T063 Integration, docs, final validation
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundation (shared schemas + all contracts + contract tests)
2. Complete Phase 2: User Story 1 - Move Tasks (following TDD cycle)
3. **STOP and VALIDATE**: All tests GREEN, manual verification passes
4. move_tasks is immediately useful for GTD weekly review reorganization

### Incremental Delivery

1. Phase 1: Foundation -> All contracts and schemas ready
2. Phase 2: US1 Move Tasks -> TDD cycle -> GREEN -> MVP deployed
3. Phase 3: US2 Duplicate Tasks -> TDD cycle -> GREEN -> Template workflows enabled
4. Phase 4: US3 Batch Update Tasks -> TDD cycle -> GREEN -> Bulk property changes
5. Phase 5: US4 Convert Tasks to Projects -> TDD cycle -> GREEN -> GTD promotion workflow
6. Phase 6: US5 Move Sections -> TDD cycle -> GREEN -> Hierarchy reorganization
7. Phase 7: US6 Duplicate Sections -> TDD cycle -> GREEN -> Template project duplication
8. Phase 8: Polish -> Integration tests, docs, final validation

Each story adds value without breaking previous stories (contract tests catch regressions).

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after Foundation phase
- TDD is mandatory -- tests MUST fail before implementation begins
- Commit after each TDD cycle (RED verified, GREEN achieved, REFACTOR done)
- All OmniJS scripts follow single-IIFE model (AD-15) with per-item try-catch
- Use Zod .parse() for response narrowing (AD-09) -- NEVER use `as Type`
- Mirror batch patterns from status-tools (mark_complete, drop_items)
- Maximum 100 items per batch enforced at schema level (FR-009)
- Target pre-validation before item loop for all tools (FR-016/AD-05)
