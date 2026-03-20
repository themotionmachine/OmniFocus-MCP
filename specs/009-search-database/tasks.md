# Tasks: Search & Database

**Input**: Design documents from `/specs/009-search-database/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Contracts**: `src/contracts/search-tools/` and `src/contracts/database-tools/`
- **Definitions**: `src/tools/definitions/`
- **Primitives**: `src/tools/primitives/`
- **Contract Tests**: `tests/contract/search-tools/` and `tests/contract/database-tools/`
- **Unit Tests**: `tests/unit/search-tools/` and `tests/unit/database-tools/`
- **Integration Tests**: `tests/integration/search-database/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure and shared schemas that all tools depend on

- [x] T001 Create contract directory structure: `src/contracts/search-tools/shared/`, `src/contracts/search-tools/`, `src/contracts/database-tools/`
- [x] T002 Create test directory structure: `tests/contract/search-tools/`, `tests/contract/database-tools/`, `tests/unit/search-tools/`, `tests/unit/database-tools/`, `tests/integration/search-database/`
- [x] T003 [P] Implement shared search result schemas (TaskStatusValueSchema, SearchTaskResultSchema, SearchProjectResultSchema, SearchFolderResultSchema, SearchTagResultSchema, ProjectStatusValueSchema, TagStatusValueSchema) in `src/contracts/search-tools/shared/search-result.ts` per contracts/search-tools.ts design
- [x] T004 [P] Implement shared search result barrel export in `src/contracts/search-tools/shared/index.ts`

**Checkpoint**: Directory structure and shared schemas ready. All user story work can now begin.

---

## Phase 2: User Story 1 - Search Tasks by Name (Priority: P1)

**Goal**: GTD practitioners can search tasks by name using case-insensitive substring matching with status filtering. Delivers the most frequently needed search capability. (FR-001, FR-005, FR-006, FR-007, FR-008, FR-016)

**Independent Test**: Create tasks with known names, search by keyword, verify correct tasks returned with IDs, names, project context, and status.

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T005 [P] [US1] Write contract tests for SearchTasksInputSchema, SearchTasksSuccessSchema, SearchTasksErrorSchema, SearchTasksResponseSchema in `tests/contract/search-tools/search-tasks.test.ts` — validate query min length 1 (FR-016), limit range 1-1000 default 50 (FR-005), status filter default "active" (FR-006), success response with results array and totalMatches (FR-008), error response shape, empty results as success not error (FR-007) -> verify FAILS
- [x] T006 [P] [US1] Write contract tests for shared search result schemas (SearchTaskResultSchema with id/name/status/projectName/flagged fields) in `tests/contract/search-tools/shared-search-result.test.ts` — validate TaskStatusValueSchema enum values, nullable projectName, boolean flagged -> verify FAILS
- [x] T007 [P] [US1] Write unit tests for searchTasks primitive in `tests/unit/search-tools/searchTasks.test.ts` — test OmniJS script generation with query/limit/status params, case-insensitive matching via toLowerCase, root task skip pattern, status filter mapping (active maps to Available+Blocked+DueSoon+Next+Overdue), result limit applied via slice, totalMatches count, empty result returns success, result shape with projectName "Inbox" for inbox tasks -> verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T008 [US1] Implement SearchTasks contract schemas (SearchTasksInputSchema, SearchTasksSuccessSchema, SearchTasksErrorSchema, SearchTasksResponseSchema) in `src/contracts/search-tools/search-tasks.ts` per contracts/search-tools.ts design -> contract tests GREEN
- [x] T009 [US1] Implement searchTasks primitive in `src/tools/primitives/searchTasks.ts` — generate OmniJS script using quickstart.md pattern: flattenedTasks.filter() with case-insensitive substring match, root task skip, status filter mapping, result limit via slice, mapTaskStatus helper, projectName resolution (inInbox -> "Inbox", containingProject -> name, else null) -> unit tests GREEN
- [x] T010 [US1] Implement searchTasks definition in `src/tools/definitions/searchTasks.ts` — register MCP tool "search_tasks" with input schema, tool description from plan.md, call primitive, return response
- [x] T011 [US1] Register search_tasks tool in `src/server.ts`

### REFACTOR Phase - Polish

- [x] T012 [US1] Refactor searchTasks if needed (extract shared OmniJS helpers if pattern emerges) while keeping tests green
- [x] T013 [US1] Manual verification: test search_tasks OmniJS script in OmniFocus Script Editor with various queries and status filters

**Checkpoint**: search_tasks fully functional with TDD coverage. Users can find tasks by name with status filtering.

---

## Phase 3: User Story 2 - Search Projects by Name (Priority: P1)

**Goal**: GTD practitioners can search projects by name using Smart Match relevance ranking. Returns matching projects with folder context. (FR-002, FR-005, FR-007, FR-008, FR-016)

**Independent Test**: Create projects in different folders, search by keyword, verify correct projects returned with folder context.

### RED Phase - Tests First (REQUIRED)

- [x] T014 [P] [US2] Write contract tests for SearchProjectsInputSchema, SearchProjectsSuccessSchema, SearchProjectsErrorSchema, SearchProjectsResponseSchema in `tests/contract/search-tools/search-projects.test.ts` — validate query min length 1 (FR-016), limit range 1-1000 default 50 (FR-005), success with results and totalMatches (FR-008), empty results as success (FR-007) -> verify FAILS
- [x] T015 [P] [US2] Write unit tests for searchProjects primitive in `tests/unit/search-tools/searchProjects.test.ts` — test OmniJS script generation with query/limit params, projectsMatching() call, result limit via slice, totalMatches count, result shape with folderName (nullable), mapProjectStatus helper -> verify FAILS

### GREEN Phase - Implementation

- [x] T016 [P] [US2] Implement SearchProjects contract schemas in `src/contracts/search-tools/search-projects.ts` per contracts/search-tools.ts design -> contract tests GREEN
- [x] T017 [US2] Implement searchProjects primitive in `src/tools/primitives/searchProjects.ts` — generate OmniJS script using quickstart.md pattern: projectsMatching(query), slice to limit, map with id/name/status/folderName -> unit tests GREEN
- [x] T018 [US2] Implement searchProjects definition in `src/tools/definitions/searchProjects.ts` — register MCP tool "search_projects" with input schema and description
- [x] T019 [US2] Register search_projects tool in `src/server.ts`

### REFACTOR Phase - Polish

- [x] T020 [US2] Manual verification: test search_projects OmniJS script in OmniFocus Script Editor

**Checkpoint**: search_tasks and search_projects both functional. Core P1 search tools complete.

---

## Phase 4: User Story 3 - Search Folders by Name (Priority: P2)

**Goal**: GTD practitioners can search folders by name using Smart Match. Returns matching folders with parent context. (FR-003, FR-005, FR-007, FR-008, FR-016)

**Independent Test**: Create folders, search by keyword, verify matching folders returned with parent info.

### RED Phase - Tests First (REQUIRED)

- [x] T021 [P] [US3] Write contract tests for SearchFoldersInputSchema, SearchFoldersSuccessSchema, SearchFoldersErrorSchema, SearchFoldersResponseSchema in `tests/contract/search-tools/search-folders.test.ts` — validate query min length, limit, success shape with totalMatches, empty results as success -> verify FAILS
- [x] T022 [P] [US3] Write unit tests for searchFolders primitive in `tests/unit/search-tools/searchFolders.test.ts` — test foldersMatching() call, result limit, totalMatches, result shape with parentFolderName (nullable) -> verify FAILS

### GREEN Phase - Implementation

- [x] T023 [P] [US3] Implement SearchFolders contract schemas in `src/contracts/search-tools/search-folders.ts` per contracts/search-tools.ts design -> contract tests GREEN
- [x] T024 [US3] Implement searchFolders primitive in `src/tools/primitives/searchFolders.ts` — generate OmniJS script using quickstart.md pattern: foldersMatching(query), slice to limit, map with id/name/parentFolderName -> unit tests GREEN
- [x] T025 [US3] Implement searchFolders definition in `src/tools/definitions/searchFolders.ts` — register MCP tool "search_folders"
- [x] T026 [US3] Register search_folders tool in `src/server.ts`

### REFACTOR Phase - Polish

- [x] T027 [US3] Manual verification: test search_folders OmniJS script in OmniFocus Script Editor

**Checkpoint**: Three search tools functional (tasks, projects, folders).

---

## Phase 5: User Story 4 - Search Tags by Name (Priority: P2)

**Goal**: GTD practitioners can search tags by name using Smart Match. Returns matching tags with parent context. (FR-004, FR-005, FR-007, FR-008, FR-016)

**Independent Test**: Create tags, search by keyword, verify matching tags returned with parent info.

### RED Phase - Tests First (REQUIRED)

- [x] T028 [P] [US4] Write contract tests for SearchTagsInputSchema, SearchTagsSuccessSchema, SearchTagsErrorSchema, SearchTagsResponseSchema in `tests/contract/search-tools/search-tags.test.ts` — validate query min length, limit, success shape with totalMatches, empty results as success -> verify FAILS
- [x] T029 [P] [US4] Write unit tests for searchTags primitive in `tests/unit/search-tools/searchTags.test.ts` — test tagsMatching() call, result limit, totalMatches, result shape with parentTagName (nullable), mapTagStatus helper -> verify FAILS

### GREEN Phase - Implementation

- [x] T030 [P] [US4] Implement SearchTags contract schemas in `src/contracts/search-tools/search-tags.ts` per contracts/search-tools.ts design -> contract tests GREEN
- [x] T031 [US4] Implement searchTags primitive in `src/tools/primitives/searchTags.ts` — generate OmniJS script using quickstart.md pattern: tagsMatching(query), slice to limit, map with id/name/status/parentTagName -> unit tests GREEN
- [x] T032 [US4] Implement searchTags definition in `src/tools/definitions/searchTags.ts` — register MCP tool "search_tags"
- [x] T033 [US4] Register search_tags tool in `src/server.ts`

### REFACTOR Phase - Polish

- [x] T034 [US4] Manual verification: test search_tags OmniJS script in OmniFocus Script Editor

**Checkpoint**: All 4 search tools complete. Search tools barrel export next.

- [x] T035 Implement search-tools barrel export in `src/contracts/search-tools/index.ts` — re-export all schemas from shared/, search-tasks, search-projects, search-folders, search-tags

---

## Phase 6: User Story 5 - Get Database Statistics (Priority: P2)

**Goal**: GTD practitioners can view aggregate database statistics for system health monitoring and weekly review support. Returns task counts by status, project counts by status, folder/tag totals, and inbox count. (FR-014)

**Independent Test**: Query statistics, verify returned counts match actual database state.

### RED Phase - Tests First (REQUIRED)

- [x] T036 [P] [US5] Write contract tests for GetDatabaseStatsInputSchema (empty object), TaskStatsSchema, ProjectStatsSchema, GetDatabaseStatsSuccessSchema, GetDatabaseStatsErrorSchema, GetDatabaseStatsResponseSchema in `tests/contract/database-tools/get-database-stats.test.ts` — validate task stats fields (available/blocked/completed/dropped/total), project stats fields (active/onHold/completed/dropped/total), folders/tags/inbox counts, all non-negative integers, total equals sum of parts -> verify FAILS
- [x] T037 [P] [US5] Write unit tests for getDatabaseStats primitive in `tests/unit/database-tools/getDatabaseStats.test.ts` — test OmniJS script generation, root task skip pattern in iteration, task status grouping (Available+DueSoon+Next+Overdue -> available), project status mapping, flattenedFolders.length, flattenedTags.length, inbox.length -> verify FAILS

### GREEN Phase - Implementation

- [x] T038 [P] [US5] Implement GetDatabaseStats contract schemas in `src/contracts/database-tools/get-database-stats.ts` per contracts/database-tools.ts design -> contract tests GREEN
- [x] T039 [US5] Implement getDatabaseStats primitive in `src/tools/primitives/getDatabaseStats.ts` — generate OmniJS script using quickstart.md pattern: iterate flattenedTasks with root task skip, count by status, iterate flattenedProjects, use .length for folders/tags/inbox -> unit tests GREEN
- [x] T040 [US5] Implement getDatabaseStats definition in `src/tools/definitions/getDatabaseStats.ts` — register MCP tool "get_database_stats" (parameterless)
- [x] T041 [US5] Register get_database_stats tool in `src/server.ts`

### REFACTOR Phase - Polish

- [x] T042 [US5] Manual verification: test get_database_stats OmniJS script in OmniFocus Script Editor, compare counts with OmniFocus UI

**Checkpoint**: Database statistics operational. GTD weekly review support ready.

---

## Phase 7: User Story 6 - Get Inbox Count (Priority: P2)

**Goal**: Lightweight inbox count for quick pulse checks. AI assistants can proactively suggest inbox processing. (FR-015)

**Independent Test**: Add items to inbox, query count, verify it matches actual inbox items.

### RED Phase - Tests First (REQUIRED)

- [x] T043 [P] [US6] Write contract tests for GetInboxCountInputSchema (empty object), GetInboxCountSuccessSchema (success + count), GetInboxCountErrorSchema, GetInboxCountResponseSchema in `tests/contract/database-tools/get-inbox-count.test.ts` — validate count is non-negative integer, success/error discriminated union -> verify FAILS
- [x] T044 [P] [US6] Write unit tests for getInboxCount primitive in `tests/unit/database-tools/getInboxCount.test.ts` — test OmniJS script generation uses inbox.length, returns {success, count}, handles empty inbox (count: 0) -> verify FAILS

### GREEN Phase - Implementation

- [x] T045 [P] [US6] Implement GetInboxCount contract schemas in `src/contracts/database-tools/get-inbox-count.ts` per contracts/database-tools.ts design -> contract tests GREEN
- [x] T046 [US6] Implement getInboxCount primitive in `src/tools/primitives/getInboxCount.ts` — generate OmniJS script using quickstart.md pattern: inbox.length -> unit tests GREEN
- [x] T047 [US6] Implement getInboxCount definition in `src/tools/definitions/getInboxCount.ts` — register MCP tool "get_inbox_count" (parameterless)
- [x] T048 [US6] Register get_inbox_count tool in `src/server.ts`

### REFACTOR Phase - Polish

- [x] T049 [US6] Manual verification: test get_inbox_count OmniJS script in OmniFocus Script Editor

**Checkpoint**: Inbox count operational. All P2 tools complete.

---

## Phase 8: User Story 7 - Save Database and Trigger Sync (Priority: P3)

**Goal**: Explicit save and sync trigger after batch AI-assisted changes. Idempotent. (FR-013)

**Independent Test**: Make changes via MCP, trigger save, verify no error.

### RED Phase - Tests First (REQUIRED)

- [x] T050 [P] [US7] Write contract tests for SaveDatabaseInputSchema (empty object), SaveDatabaseSuccessSchema, SaveDatabaseErrorSchema, SaveDatabaseResponseSchema in `tests/contract/database-tools/save-database.test.ts` — validate success-only response shape (no data fields), discriminated union -> verify FAILS
- [x] T051 [P] [US7] Write unit tests for saveDatabase primitive in `tests/unit/database-tools/saveDatabase.test.ts` — test OmniJS script generation calls save(), returns {success: true}, handles save() exception -> verify FAILS

### GREEN Phase - Implementation

- [x] T052 [P] [US7] Implement SaveDatabase contract schemas in `src/contracts/database-tools/save-database.ts` per contracts/database-tools.ts design -> contract tests GREEN
- [x] T053 [US7] Implement saveDatabase primitive in `src/tools/primitives/saveDatabase.ts` — generate OmniJS script using quickstart.md pattern: save() -> unit tests GREEN
- [x] T054 [US7] Implement saveDatabase definition in `src/tools/definitions/saveDatabase.ts` — register MCP tool "save_database" (parameterless)
- [x] T055 [US7] Register save_database tool in `src/server.ts`

### REFACTOR Phase - Polish

- [x] T056 [US7] Manual verification: test save_database OmniJS script in OmniFocus Script Editor

**Checkpoint**: Save and sync operational.

---

## Phase 9: User Story 8 - Clean Up Database (Priority: P3)

**Goal**: Trigger OmniFocus Clean Up operation to process inbox items and perform delayed filtering. Idempotent. (FR-009)

**Independent Test**: Create tasks in inbox with project assignments, trigger cleanup, verify items relocated.

### RED Phase - Tests First (REQUIRED)

- [x] T057 [P] [US8] Write contract tests for CleanupDatabaseInputSchema (empty object), CleanupDatabaseSuccessSchema, CleanupDatabaseErrorSchema, CleanupDatabaseResponseSchema in `tests/contract/database-tools/cleanup-database.test.ts` — validate success-only response shape, discriminated union -> verify FAILS
- [x] T058 [P] [US8] Write unit tests for cleanupDatabase primitive in `tests/unit/database-tools/cleanupDatabase.test.ts` — test OmniJS script generation calls cleanUp(), returns {success: true}, handles cleanUp() exception -> verify FAILS

### GREEN Phase - Implementation

- [x] T059 [P] [US8] Implement CleanupDatabase contract schemas in `src/contracts/database-tools/cleanup-database.ts` per contracts/database-tools.ts design -> contract tests GREEN
- [x] T060 [US8] Implement cleanupDatabase primitive in `src/tools/primitives/cleanupDatabase.ts` — generate OmniJS script using quickstart.md pattern: cleanUp() -> unit tests GREEN
- [x] T061 [US8] Implement cleanupDatabase definition in `src/tools/definitions/cleanupDatabase.ts` — register MCP tool "cleanup_database" (parameterless)
- [x] T062 [US8] Register cleanup_database tool in `src/server.ts`

### REFACTOR Phase - Polish

- [x] T063 [US8] Manual verification: test cleanup_database OmniJS script in OmniFocus Script Editor

**Checkpoint**: Cleanup operational.

---

## Phase 10: User Story 9 - Undo/Redo Operations (Priority: P3)

**Goal**: Safety net for accidental changes via AI assistants. Undo reverses last operation, redo reapplies. Both pre-check availability before attempting. DESTRUCTIVE operations affecting entire database. (FR-010, FR-011, FR-012)

**Independent Test**: Create a task, undo (task removed), redo (task reappears). Also test empty stack returns performed: false.

### RED Phase - Tests First (REQUIRED)

- [x] T064 [P] [US9] Write contract tests for UndoInputSchema, UndoSuccessSchema (performed/canUndo/canRedo booleans), UndoErrorSchema, UndoResponseSchema in `tests/contract/database-tools/undo.test.ts` — validate performed boolean, canUndo/canRedo post-operation state, discriminated union -> verify FAILS
- [x] T065 [P] [US9] Write contract tests for RedoInputSchema, RedoSuccessSchema, RedoErrorSchema, RedoResponseSchema in `tests/contract/database-tools/redo.test.ts` — same shape as undo -> verify FAILS
- [x] T066 [P] [US9] Write unit tests for undoOperation primitive in `tests/unit/database-tools/undoOperation.test.ts` — test OmniJS script generation: canUndo pre-check, undo() call only when canUndo is true, returns {performed, canUndo, canRedo} post-state, empty stack returns performed: false (FR-012) -> verify FAILS
- [x] T067 [P] [US9] Write unit tests for redoOperation primitive in `tests/unit/database-tools/redoOperation.test.ts` — test OmniJS script generation: canRedo pre-check, redo() call only when canRedo is true, returns {performed, canUndo, canRedo} post-state, empty stack returns performed: false (FR-012) -> verify FAILS

### GREEN Phase - Implementation

- [x] T068 [P] [US9] Implement Undo contract schemas in `src/contracts/database-tools/undo.ts` per contracts/database-tools.ts design -> contract tests GREEN
- [x] T069 [P] [US9] Implement Redo contract schemas in `src/contracts/database-tools/redo.ts` per contracts/database-tools.ts design -> contract tests GREEN
- [x] T070 [US9] Implement undoOperation primitive in `src/tools/primitives/undoOperation.ts` — generate OmniJS script using quickstart.md pattern: canUndo check, conditional undo(), return performed + post-state -> unit tests GREEN
- [x] T071 [US9] Implement redoOperation primitive in `src/tools/primitives/redoOperation.ts` — generate OmniJS script using quickstart.md pattern: canRedo check, conditional redo(), return performed + post-state -> unit tests GREEN
- [x] T072 [US9] Implement undoOperation definition in `src/tools/definitions/undoOperation.ts` — register MCP tool "undo" with DESTRUCTIVE warning in description
- [x] T073 [US9] Implement redoOperation definition in `src/tools/definitions/redoOperation.ts` — register MCP tool "redo" with DESTRUCTIVE warning in description
- [x] T074 [US9] Register undo and redo tools in `src/server.ts`

### REFACTOR Phase - Polish

- [x] T075 [US9] Manual verification: test undo/redo OmniJS scripts in OmniFocus Script Editor — create task, undo, verify removed, redo, verify restored

**Checkpoint**: All 10 tools implemented. Undo/redo safety net operational.

- [x] T076 Implement database-tools barrel export in `src/contracts/database-tools/index.ts` — re-export all schemas from get-database-stats, get-inbox-count, save-database, cleanup-database, undo, redo

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, documentation, and final validation

- [x] T077 [P] Scaffold integration test in `tests/integration/search-database/search-database.integration.test.ts` — create test structure for round-trip OmniFocus verification of all 10 tools
- [x] T078 [P] Update CLAUDE.md — add Search & Database to Implemented Tool Domains table, update tool count, add phase notes
- [x] T079 Run full test suite: `pnpm test` — all existing 2823+ tests pass plus new search/database tests
- [x] T080 Run type check: `pnpm typecheck` — zero errors
- [x] T081 Run lint: `pnpm lint` — zero errors
- [x] T082 Run build: `pnpm build` — successful compilation to dist/
- [x] T083 Run coverage: `pnpm test:coverage` — verify new code meets project coverage standards

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 Search Tasks (Phase 2)**: Depends on Phase 1 (shared search result schemas)
- **US2 Search Projects (Phase 3)**: Depends on Phase 1; independent of US1
- **US3 Search Folders (Phase 4)**: Depends on Phase 1; independent of US1/US2
- **US4 Search Tags (Phase 5)**: Depends on Phase 1; independent of US1/US2/US3
- **US5 Database Stats (Phase 6)**: Depends on Phase 1 (directory structure only); independent of search tools
- **US6 Inbox Count (Phase 7)**: No dependencies on other stories; depends on Phase 1 directory structure
- **US7 Save Database (Phase 8)**: No dependencies on other stories; depends on Phase 1 directory structure
- **US8 Cleanup Database (Phase 9)**: No dependencies on other stories; depends on Phase 1 directory structure
- **US9 Undo/Redo (Phase 10)**: No dependencies on other stories; depends on Phase 1 directory structure
- **Polish (Phase 11)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Search Tasks)**: Depends on shared search result schemas from Phase 1
- **US2 (Search Projects)**: Depends on shared search result schemas from Phase 1
- **US3 (Search Folders)**: Depends on shared search result schemas from Phase 1
- **US4 (Search Tags)**: Depends on shared search result schemas from Phase 1
- **US5-US9 (Database Tools)**: Each depends only on Phase 1 directory structure; fully independent of each other and of search tools

### TDD Order Within Each User Story (MANDATORY)

```text
1. RED: Write failing tests
   - Contract tests for Zod schemas
   - Unit tests for primitives
   - Run `pnpm test` -> verify tests FAIL

2. GREEN: Implement minimum code
   - Contract schemas first (make contract tests GREEN)
   - Primitives second (make unit tests GREEN)
   - Definitions third (MCP tool interface)
   - Register in server.ts
   - Run `pnpm test` -> tests turn GREEN

3. REFACTOR: Clean up
   - Improve code quality
   - Run `pnpm test` -> tests stay GREEN
   - Manual OmniFocus verification (Script Editor)
```

### Parallel Opportunities

**After Phase 1 completes, ALL user stories can begin in parallel:**

```text
Phase 1 (Setup) ─┬─> Phase 2 (US1: Search Tasks) ──────────────────┐
                  ├─> Phase 3 (US2: Search Projects) ────────────────┤
                  ├─> Phase 4 (US3: Search Folders) ─────────────────┤
                  ├─> Phase 5 (US4: Search Tags) ───────────────────┤
                  ├─> Phase 6 (US5: Database Stats) ─────────────────┤
                  ├─> Phase 7 (US6: Inbox Count) ───────────────────┤
                  ├─> Phase 8 (US7: Save Database) ─────────────────┤
                  ├─> Phase 9 (US8: Cleanup Database) ──────────────┤
                  └─> Phase 10 (US9: Undo/Redo) ───────────────────┤
                                                                     └─> Phase 11 (Polish)
```

**Within each story**, RED tests marked [P] can be written simultaneously (different test files).

**Barrel exports** (T035, T076) should be done after all tools in their domain are complete.

---

## TDD Parallel Example: User Story 1 (Search Tasks)

```bash
# RED: Write all tests in parallel (they will FAIL):
T005 [P] Write contract tests for search-tasks schemas
T006 [P] Write contract tests for shared search result schemas
T007 [P] Write unit tests for searchTasks primitive

# GREEN: Implement to make tests pass (sequential within story):
T008 Implement contract schemas -> contract tests GREEN
T009 Implement primitive -> unit tests GREEN
T010 Implement definition
T011 Register in server.ts

# REFACTOR: Polish while green:
T012 Refactor if needed
T013 Manual verification in Script Editor
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (shared schemas + directories)
2. Complete Phase 2: US1 Search Tasks (TDD cycle) — most valuable tool
3. Complete Phase 3: US2 Search Projects (TDD cycle) — second most valuable
4. **STOP and VALIDATE**: All tests GREEN, manual verification passes
5. Both P1 search tools deliver immediate value

### Incremental Delivery

1. Phase 1 Setup -> Foundation ready
2. US1 Search Tasks -> TDD cycle -> GREEN -> First search capability live
3. US2 Search Projects -> TDD cycle -> GREEN -> Core P1 search complete
4. US3-US4 Search Folders/Tags -> TDD cycle -> GREEN -> Full search suite
5. US5-US6 Stats/Inbox -> TDD cycle -> GREEN -> Database read operations
6. US7-US9 Save/Cleanup/Undo/Redo -> TDD cycle -> GREEN -> Database write operations
7. Phase 11 Polish -> All tests GREEN, docs updated, coverage verified

### Parallel Team Strategy

With multiple developers after Phase 1:
- Developer A: US1 Search Tasks + US2 Search Projects (P1 priority)
- Developer B: US3 Search Folders + US4 Search Tags (P2 search)
- Developer C: US5 Database Stats + US6 Inbox Count + US7-US9 (P2-P3 database)

All stories complete and integrate independently. All tests GREEN before merge.

---

## FR Traceability

| FR | Tool | Tasks |
|----|------|-------|
| FR-001 | search_tasks | T005-T013 |
| FR-002 | search_projects | T014-T020 |
| FR-003 | search_folders | T021-T027 |
| FR-004 | search_tags | T028-T034 |
| FR-005 | All search tools | T005, T014, T021, T028 (limit param) |
| FR-006 | search_tasks | T005, T007 (status filter) |
| FR-007 | All search tools | T005, T014, T021, T028 (empty result as success) |
| FR-008 | All search tools | T005, T014, T021, T028 (totalMatches) |
| FR-009 | cleanup_database | T057-T063 |
| FR-010 | undo | T064, T066, T068, T070, T072 |
| FR-011 | redo | T065, T067, T069, T071, T073 |
| FR-012 | undo, redo | T064-T067 (performed: false on empty stack) |
| FR-013 | save_database | T050-T056 |
| FR-014 | get_database_stats | T036-T042 |
| FR-015 | get_inbox_count | T043-T049 |
| FR-016 | All search tools | T005, T014, T021, T028 (query validation) |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- **TDD is mandatory** — tests MUST fail before implementation begins
- Commit after each TDD cycle (RED verified, GREEN achieved, REFACTOR done)
- Stop at any checkpoint to validate story independently
- All 10 tools follow the established definitions/primitives separation pattern
- Search tools share result schemas via `src/contracts/search-tools/shared/`
- Database tools have no shared schemas (independent contracts per tool)
- Barrel exports (T035, T076) consolidate after all domain tools are complete
