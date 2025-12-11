# Tasks: Folder Management Tools

**Branch**: `002-folder-tools`
**Date**: 2025-12-10
**Input**: Design documents from `/specs/002-folder-tools/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story with TDD phases (RED → GREEN → REFACTOR) to enable test-driven implementation.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US0, US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Contracts defined in `specs/002-folder-tools/contracts/`
- Implementation follows definitions/primitives separation pattern

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Copy contract schemas and prepare implementation foundation

- [x] T001 Copy contract schemas from specs/002-folder-tools/contracts/ to src/contracts/folder-tools/
- [x] T002 [P] Create barrel export in src/contracts/folder-tools/index.ts
- [x] T003 [P] Verify contracts compile with `pnpm typecheck`

---

## Phase 2: Foundational - US0 Refactor to Omni Automation (Priority: P0)

**Purpose**: Migrate existing AppleScript-based tools to Omni Automation JavaScript

**⚠️ CRITICAL**: This phase MUST complete before implementing any folder tools to ensure consistency and avoid technical debt.

**Goal**: All existing primitives consistently use Omni Automation JavaScript via `evaluate javascript` pattern

**Independent Test**: All existing tests pass, `pnpm build` and `pnpm typecheck` succeed with no regressions

### Analysis

- [x] T004 [US0] Audit src/tools/primitives/ to identify AppleScript-based files needing migration. Output: PR comment or commit message listing files and their current automation approach (AppleScript, Omni Automation, or hybrid)
- [x] T005 [US0] Document current patterns in each file (AppleScript vs Omni Automation). Output: Table in PR description with columns: File | Current Approach | Migration Needed (Y/N)

**Audit Results (T004-T005):**

| File | Current Approach | Migration Needed |
|------|------------------|------------------|
| addProject.ts | AppleScript (`tell application "OmniFocus"`) | Yes |
| addOmniFocusTask.ts | AppleScript (`tell application "OmniFocus"`) | Yes |
| editItem.ts | AppleScript (`tell application "OmniFocus"`) | Yes |
| removeItem.ts | AppleScript (`tell application "OmniFocus"`) | Yes |
| queryOmnifocus.ts | Omni Automation JS (JXA via `executeOmniFocusScript`) | No |
| listPerspectives.ts | Omni Automation JS (via `@listPerspectives.js`) | No |
| batchAddItems.ts | AppleScript (delegates to addOmniFocusTask) | Yes (indirect) |
| batchRemoveItems.ts | AppleScript (delegates to removeItem) | Yes (indirect) |
| getPerspectiveView.ts | Omni Automation JS (via `executeOmniFocusScript`) | No |
| queryOmnifocusDebug.ts | Omni Automation JS | No |

### 🔴 RED Phase - Update Tests First

- [x] T006 [P] [US0] Update tests for addProject to expect Omni Automation JavaScript output → verify FAILS ✓
- [x] T007 [P] [US0] Update tests for addOmniFocusTask to expect Omni Automation JavaScript output → verify FAILS ✓

### 🟢 GREEN Phase - Migration

- [x] T008 [US0] Refactor src/tools/primitives/addProject.ts to Omni Automation JavaScript → tests GREEN ✓
- [x] T009 [US0] Refactor src/tools/primitives/addOmniFocusTask.ts to Omni Automation JavaScript → tests GREEN ✓
- [x] T010 [US0] Verify editItem.ts uses consistent Omni Automation patterns (refactor if needed) → refactored to Omni Automation ✓
- [x] T011 [US0] Verify removeItem.ts uses consistent Omni Automation patterns (refactor if needed) → refactored to Omni Automation ✓

### 🔵 REFACTOR Phase - Documentation

- [x] T012 [US0] Update CLAUDE.md to document Omni Automation JavaScript approach ✓
- [x] T013 [US0] Run full test suite to verify no regressions: `pnpm test` → 384 tests pass ✓
- [x] T014 [US0] Run build and typecheck: `pnpm build && pnpm typecheck` → build succeeds ✓

**Checkpoint**: Foundation ready - all tools consistently use Omni Automation JavaScript

---

## Phase 3: User Story 1 - View Folder Structure (Priority: P1) 🎯 MVP ✅ COMPLETE

**Goal**: Enable AI assistants to list and view folder hierarchy from OmniFocus

**Independent Test**: Call `list_folders` with no parameters and verify it returns all folders with correct hierarchy (id, name, status, parentId)

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T015 [P] [US1] Write contract test tests/contract/listFolders.test.ts for ListFoldersInputSchema → verify FAILS ✓
- [x] T016 [P] [US1] Write unit test tests/unit/listFolders.test.ts for listFolders primitive → verify FAILS ✓
- [x] T016a [P] [US1] Write unit test for invalid parentId error handling (edge case: "Invalid parentId 'xyz': folder not found") → verify FAILS ✓

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T017 [P] [US1] Create primitive src/tools/primitives/listFolders.ts with OmniJS script generation → tests GREEN ✓
- [x] T018 [P] [US1] Create definition src/tools/definitions/listFolders.ts with Zod schema and handler ✓
- [x] T019 [US1] Register list_folders tool in src/server.ts ✓
- [x] T020 [US1] Implement status filter (`active`/`dropped`) in listFolders primitive ✓
- [x] T021 [US1] Implement parentId filter in listFolders primitive ✓
- [x] T022 [US1] Implement includeChildren parameter (flattenedFolders vs folders) in listFolders primitive ✓

### 🔵 REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [x] T023 [US1] Refactor if needed while keeping tests green ✓
- [x] T024 [US1] Verify list_folders in OmniFocus Script Editor (manual test) ✓

**Checkpoint**: User Story 1 complete - `list_folders` tool functional and tested ✅

---

## Phase 4: User Story 2 - Create New Folders (Priority: P2) ✅ COMPLETE

**Goal**: Enable AI assistants to create folders at specified positions in the hierarchy

**Independent Test**: Call `add_folder` with name and position to create folder, verify it appears in OmniFocus at correct location

### 🔴 RED Phase - Tests First (US2)

- [x] T025 [P] [US2] Write contract test tests/contract/addFolder.test.ts for AddFolderInputSchema → verify FAILS ✓
- [x] T026 [P] [US2] Write unit test tests/unit/addFolder.test.ts for addFolder primitive with position scenarios → verify FAILS ✓
- [x] T026a [P] [US2] Write unit test for special characters in folder names (edge case: quotes, slashes, Unicode, emoji) → verify FAILS ✓

### 🟢 GREEN Phase - Implementation (US2)

- [x] T027 [P] [US2] Create primitive src/tools/primitives/addFolder.ts with OmniJS script generation → tests GREEN ✓
- [x] T028 [P] [US2] Create definition src/tools/definitions/addFolder.ts with Zod schema and handler ✓
- [x] T029 [US2] Register add_folder tool in src/server.ts ✓
- [x] T030 [US2] Implement position resolution (beginning/ending/before/after) in addFolder primitive ✓
- [x] T031 [US2] Implement relativeTo validation (folder exists, correct parent for before/after) ✓
- [x] T032 [US2] Implement default position handling (library.ending when position omitted) ✓
- [x] T033 [US2] Implement name trimming and validation (non-empty after trim) ✓

### 🔵 REFACTOR Phase - Polish (US2)

- [x] T034 [US2] Refactor if needed while keeping tests green ✓
- [x] T035 [US2] Verify add_folder in OmniFocus Script Editor (manual test) ✓

**Checkpoint**: User Story 2 complete - `add_folder` tool functional and tested ✅

---

## Phase 5: User Story 3 - Edit Folder Properties (Priority: P3) ✅ COMPLETE

**Goal**: Enable AI assistants to rename folders and change their status

**Independent Test**: Call `edit_folder` to rename a folder, verify name change persists in OmniFocus

### 🔴 RED Phase - Tests First (US3)

- [x] T036 [P] [US3] Write contract test tests/contract/editFolder.test.ts for EditFolderInputSchema → verify FAILS ✓
- [x] T037 [P] [US3] Write unit test tests/unit/editFolder.test.ts with disambiguation scenarios → verify FAILS ✓

### 🟢 GREEN Phase - Implementation (US3)

- [x] T038 [P] [US3] Create primitive src/tools/primitives/editFolder.ts with OmniJS script generation → tests GREEN ✓
- [x] T039 [P] [US3] Create definition src/tools/definitions/editFolder.ts with Zod schema and handler ✓
- [x] T040 [US3] Register edit_folder tool in src/server.ts ✓
- [x] T041 [US3] Implement folder lookup by ID (Folder.byIdentifier) ✓
- [x] T042 [US3] Implement folder lookup by name with disambiguation (flattenedFolders.filter) ✓
- [x] T043 [US3] Implement disambiguation error response with matchingIds array (code: DISAMBIGUATION_REQUIRED) ✓
- [x] T044 [US3] Implement partial update for newName (folder.name assignment) ✓
- [x] T045 [US3] Implement partial update for newStatus (folder.status assignment) ✓
- [x] T046 [US3] Implement validation requiring at least one of newName or newStatus ✓

### 🔵 REFACTOR Phase - Polish (US3)

- [x] T047 [US3] Refactor if needed while keeping tests green ✓
- [x] T048 [US3] Verify edit_folder in OmniFocus Script Editor (manual test) ✓

**Checkpoint**: User Story 3 complete - `edit_folder` tool functional with disambiguation support ✅

---

## Phase 6: User Story 4 - Delete Folders (Priority: P4) ✅ COMPLETE

**Goal**: Enable AI assistants to delete folders (with all contents recursively)

**Independent Test**: Call `remove_folder` to delete a folder, verify it and all contents are removed from OmniFocus

### 🔴 RED Phase - Tests First (US4)

- [x] T049 [P] [US4] Write contract test tests/contract/removeFolder.test.ts for RemoveFolderInputSchema → verify FAILS ✓
- [x] T050 [P] [US4] Write unit test tests/unit/removeFolder.test.ts → verify FAILS ✓
- [x] T050a [P] [US4] Write unit test for library deletion rejection (edge case: "Cannot delete/move library: not a valid folder target") → verify FAILS ✓

### 🟢 GREEN Phase - Implementation (US4)

- [x] T051 [P] [US4] Create primitive src/tools/primitives/removeFolder.ts with OmniJS script generation → tests GREEN ✓
- [x] T052 [P] [US4] Create definition src/tools/definitions/removeFolder.ts with Zod schema and handler ✓
- [x] T053 [US4] Register remove_folder tool in src/server.ts ✓
- [x] T054 [US4] Implement folder lookup by ID or name (reuse pattern from editFolder) ✓
- [x] T055 [US4] Implement disambiguation error response for name lookups ✓
- [x] T056 [US4] Implement deleteObject(folder) call in OmniJS ✓
- [x] T057 [US4] Capture folder ID and name before deletion for response ✓

### 🔵 REFACTOR Phase - Polish (US4)

- [x] T058 [US4] Refactor if needed while keeping tests green ✓
- [x] T059 [US4] Verify remove_folder in OmniFocus Script Editor (manual test) ✓

**Checkpoint**: User Story 4 complete - `remove_folder` tool functional with recursive deletion ✅

---

## Phase 7: User Story 5 - Move Folders (Priority: P5) ✅ COMPLETE

**Goal**: Enable AI assistants to reorganize folder hierarchy by moving folders

**Independent Test**: Call `move_folder` to move a folder to a different parent, verify hierarchy change in OmniFocus

### 🔴 RED Phase - Tests First (US5)

- [x] T060 [P] [US5] Write contract test tests/contract/moveFolder.test.ts for MoveFolderInputSchema → verify FAILS ✓
- [x] T061 [P] [US5] Write unit test tests/unit/moveFolder.test.ts with circular detection scenarios → verify FAILS ✓
- [x] T061a [P] [US5] Write unit test for library move rejection (edge case: "Cannot delete/move library: not a valid folder target") → verify FAILS ✓

### 🟢 GREEN Phase - Implementation (US5)

- [x] T062 [P] [US5] Create primitive src/tools/primitives/moveFolder.ts with OmniJS script generation → tests GREEN ✓
- [x] T063 [P] [US5] Create definition src/tools/definitions/moveFolder.ts with Zod schema and handler ✓
- [x] T064 [US5] Register move_folder tool in src/server.ts ✓
- [x] T065 [US5] Implement folder lookup by ID or name (reuse pattern from editFolder) ✓
- [x] T066 [US5] Implement disambiguation error response for name lookups ✓
- [x] T067 [US5] Implement position resolution for moveSections (beginning/ending/before/after) ✓
- [x] T068 [US5] Implement circular move detection (cannot move folder into its own descendant) ✓
- [x] T069 [US5] Implement moveSections([folder], position) call in OmniJS ✓

### 🔵 REFACTOR Phase - Polish (US5)

- [x] T070 [US5] Refactor if needed while keeping tests green ✓
- [x] T071 [US5] Verify move_folder in OmniFocus Script Editor (manual test) ✓

**Checkpoint**: User Story 5 complete - `move_folder` tool functional with circular detection ✅

---

## Phase 8: Polish & Cross-Cutting Concerns ✅ COMPLETE

**Purpose**: Final verification, documentation, and cleanup

- [x] T072 [P] Create contract schema validation test tests/contract/folder-schemas.test.ts ✓
- [x] T073 [P] Update README.md with new folder tool documentation ✓
- [x] T074 Run full test suite: `pnpm test` → all tests GREEN (660 tests) ✓
- [x] T075 Run coverage check: `pnpm test:coverage` ✓
- [x] T076 Run lint check: `pnpm lint` ✓
- [x] T077 Run typecheck: `pnpm typecheck` ✓
- [x] T078 Run build: `pnpm build` ✓
- [x] T079 Manual end-to-end verification with OmniFocus (all 5 tools) ✓
- [x] T080 Run quickstart.md validation scenarios ✓

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational US0 (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on US0 completion
  - User stories can proceed sequentially (P1 → P2 → P3 → P4 → P5)
  - OR in parallel if team capacity allows (all depend only on US0)
- **Polish (Phase 8)**: Depends on all user stories being complete

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

### User Story Dependencies

- **US0 (P0)**: Foundational - MUST complete before any folder tools
- **US1 (P1)**: Can start after US0 - No dependencies on other folder stories
- **US2 (P2)**: Can start after US0 - Independent of US1
- **US3 (P3)**: Can start after US0 - May reuse lookup patterns from implementation (not a dependency)
- **US4 (P4)**: Can start after US0 - Reuses lookup pattern (implementation similarity, not dependency)
- **US5 (P5)**: Can start after US0 - Most complex, reuses lookup + position patterns

### Parallel Opportunities

- T001-T003 (Setup) can run in parallel
- T006-T007 (US0 RED phase tests) can run in parallel
- T015-T016 (US1 RED phase) in parallel
- T017-T018 (US1 GREEN primitive + definition) in parallel
- T025-T026 (US2 RED phase) in parallel
- T036-T037 (US3 RED phase) in parallel
- T049-T050 (US4 RED phase) in parallel
- T060-T061 (US5 RED phase) in parallel
- All RED phase test tasks can run in parallel within their user story

---

## TDD Parallel Example: User Story 1

```bash
# 🔴 RED: Launch all tests together (they will FAIL):
Task: "T015 [P] [US1] Write contract test → verify FAILS"
Task: "T016 [P] [US1] Write unit test → verify FAILS"

# Verify: pnpm test shows listFolders tests FAILING

# 🟢 GREEN: Implement to make tests pass:
Task: "T017 [P] [US1] Create primitive → tests turn GREEN"
Task: "T018 [P] [US1] Create definition"
Task: "T019-T022 Implementation details"

# Verify: pnpm test shows listFolders tests PASSING

# 🔵 REFACTOR: Polish while green:
Task: "T023 Refactor if needed"
Task: "T024 Manual verification in OmniFocus"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: US0 Foundational with TDD (T004-T014)
3. Complete Phase 3: User Story 1 with TDD (T015-T024)
4. **STOP and VALIDATE**: All tests GREEN, manual verification passes
5. Deploy/demo if ready - AI can now VIEW folder structure

### Incremental Delivery

1. Setup + US0 → Foundation ready, consistency achieved, tests GREEN
2. Add US1 → TDD cycle → All tests GREEN → Deploy (MVP!)
3. Add US2 → TDD cycle → All tests GREEN → Deploy (Create capability)
4. Add US3 → TDD cycle → All tests GREEN → Deploy (Modify capability)
5. Add US4 → TDD cycle → All tests GREEN → Deploy (Delete capability)
6. Add US5 → TDD cycle → All tests GREEN → Deploy (Full hierarchy control)
7. Each story adds value without breaking previous stories (tests catch regressions)

### Parallel Team Strategy

With multiple developers after US0 completes:

1. Team completes Setup + US0 together (with TDD)
2. Once US0 is done, all folder tools can start in parallel:
   - Developer A: US1 (list_folders) - TDD cycle
   - Developer B: US2 (add_folder) - TDD cycle
   - Developer C: US3 (edit_folder) - TDD cycle
   - Developer D: US4 (remove_folder) - TDD cycle
   - Developer E: US5 (move_folder) - TDD cycle
3. Stories complete and integrate independently
4. All tests GREEN before merge

---

## Summary

| Phase | Story | Task Count | RED Tasks | GREEN Tasks | REFACTOR Tasks |
|-------|-------|------------|-----------|-------------|----------------|
| Setup | - | 3 | 0 | 3 | 0 |
| Foundational | US0 | 11 | 2 | 6 | 3 |
| User Story 1 | US1 | 11 | 3 | 6 | 2 |
| User Story 2 | US2 | 12 | 3 | 7 | 2 |
| User Story 3 | US3 | 13 | 2 | 9 | 2 |
| User Story 4 | US4 | 12 | 3 | 7 | 2 |
| User Story 5 | US5 | 13 | 3 | 8 | 2 |
| Polish | - | 9 | 0 | 9 | 0 |
| **Total** | | **84** | **16** | **55** | **13** |

**MVP Scope**: Phase 1 + Phase 2 (US0) + Phase 3 (US1) = 25 tasks for basic folder viewing capability (with full TDD coverage)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- **TDD is mandatory** - tests MUST fail before implementation begins (RED phase)
- Tests MUST pass after implementation (GREEN phase)
- Tests MUST stay passing during refactoring (REFACTOR phase)
- Commit after each TDD cycle (RED verified, GREEN achieved, REFACTOR done)
- Stop at any checkpoint to validate story independently
- US0 is foundational - without it, folder tools would introduce inconsistency
- If tests don't fail initially, the test is either wrong or implementation already exists
