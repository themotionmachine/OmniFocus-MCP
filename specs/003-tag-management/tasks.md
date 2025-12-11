# Tasks: Tag Management Tools

**Input**: Design documents from `/specs/003-tag-management/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a single project with TypeScript MCP server:
- Source code: `src/` at repository root
- Tests: `tests/` at repository root
- Contracts: `src/contracts/tag-tools/`
- Tools: `src/tools/primitives/` and `src/tools/definitions/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and directory structure for tag management tools

- [ ] T001 [P] Create contracts directory structure: `src/contracts/tag-tools/shared/`
- [ ] T002 [P] Create tools directory structure for primitives: `src/tools/primitives/` (verify exists)
- [ ] T003 [P] Create tools directory structure for definitions: `src/tools/definitions/` (verify exists)
- [ ] T004 [P] Create test directories: `tests/contract/tag-tools/` and `tests/unit/tag-tools/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared type definitions and schemas that ALL tag tools depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] Create Tag entity schema in `src/contracts/tag-tools/shared/tag.ts` (TagSchema with id, name, status, parentId, allowsNextAction, taskCount)
- [ ] T006 [P] Create Position schema in `src/contracts/tag-tools/shared/position.ts` (TagPositionSchema with placement, relativeTo, refine validation)
- [ ] T007 [P] Create Disambiguation error schema in `src/contracts/tag-tools/shared/disambiguation.ts` (DisambiguationErrorSchema)
- [ ] T008 [P] Create BatchItemResult schema in `src/contracts/tag-tools/shared/batch-result.ts` (for assign_tags and remove_tags)
- [ ] T009 Create shared types index in `src/contracts/tag-tools/shared/index.ts` (re-export all shared schemas)
- [ ] T010 [P] Write contract test for TagSchema in `tests/contract/tag-tools/shared-tag.test.ts`
- [ ] T011 [P] Write contract test for TagPositionSchema in `tests/contract/tag-tools/shared-position.test.ts`
- [ ] T012 [P] Write contract test for DisambiguationErrorSchema in `tests/contract/tag-tools/shared-disambiguation.test.ts`
- [ ] T013 [P] Write contract test for BatchItemResultSchema in `tests/contract/tag-tools/shared-batch-result.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Tag Structure (Priority: P1) 🎯 MVP

**Goal**: Enable AI assistants to see tag hierarchy and usage statistics to understand organizational system

**Independent Test**: Request list of tags and verify hierarchical structure with task counts are returned correctly

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T014 [P] [US1] Write contract test for list_tags input schema in `tests/contract/tag-tools/list-tags.test.ts` → verify FAILS
- [ ] T015 [P] [US1] Write contract test for list_tags response schema in `tests/contract/tag-tools/list-tags.test.ts` → verify FAILS
- [ ] T016 [P] [US1] Write unit test for listTags primitive success case in `tests/unit/tag-tools/listTags.test.ts` → verify FAILS
- [ ] T017 [P] [US1] Write unit test for listTags primitive with status filter in `tests/unit/tag-tools/listTags.test.ts` → verify FAILS
- [ ] T018 [P] [US1] Write unit test for listTags primitive with parentId filter in `tests/unit/tag-tools/listTags.test.ts` → verify FAILS
- [ ] T019 [P] [US1] Write unit test for listTags primitive with includeChildren in `tests/unit/tag-tools/listTags.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T020 [P] [US1] Create list_tags contract in `src/contracts/tag-tools/list-tags.ts` (ListTagsInputSchema, ListTagsResponseSchema) → contract tests GREEN
- [ ] T021 [US1] Implement listTags primitive in `src/tools/primitives/listTags.ts` (generate OmniJS script, execute, parse response) → unit tests GREEN
- [ ] T022 [US1] Implement listTags definition handler in `src/tools/definitions/listTags.ts` (Zod validation, call primitive)
- [ ] T023 [US1] Register list_tags tool in `src/server.ts` (import schema and handler, call server.tool())

### 🔵 REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T024 [US1] Refactor listTags OmniJS script for clarity while keeping tests green
- [ ] T025 [US1] Manual verification: Test list_tags in OmniFocus Script Editor with various filters
- [ ] T026 [US1] Manual verification: Test list_tags via MCP client (Claude Desktop) with sample queries

**Checkpoint**: User Story 1 complete - can list tags with hierarchy and filters

---

## Phase 4: User Story 2 - Create Tags (Priority: P2)

**Goal**: Enable AI to create new tags to build and extend organizational taxonomy

**Independent Test**: Create a new tag and verify it appears in OmniFocus with correct settings

### 🔴 RED Phase - Tests First (REQUIRED)

- [ ] T027 [P] [US2] Write contract test for create_tag input schema in `tests/contract/tag-tools/create-tag.test.ts` → verify FAILS
- [ ] T028 [P] [US2] Write contract test for create_tag response schema in `tests/contract/tag-tools/create-tag.test.ts` → verify FAILS
- [ ] T029 [P] [US2] Write unit test for createTag primitive success case in `tests/unit/tag-tools/createTag.test.ts` → verify FAILS
- [ ] T030 [P] [US2] Write unit test for createTag with position placement in `tests/unit/tag-tools/createTag.test.ts` → verify FAILS
- [ ] T031 [P] [US2] Write unit test for createTag with parentId in `tests/unit/tag-tools/createTag.test.ts` → verify FAILS
- [ ] T032 [P] [US2] Write unit test for createTag error handling (invalid parentId) in `tests/unit/tag-tools/createTag.test.ts` → verify FAILS
- [ ] T032b [P] [US2] Write unit test for createTag error handling (invalid relativeTo) in `tests/unit/tag-tools/createTag.test.ts` → verify FAILS
- [ ] T032c [P] [US2] Write unit test for createTag with parentId AND position combination in `tests/unit/tag-tools/createTag.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [ ] T033 [P] [US2] Create create_tag contract in `src/contracts/tag-tools/create-tag.ts` (CreateTagInputSchema with position, CreateTagResponseSchema) → contract tests GREEN
- [ ] T034 [US2] Implement createTag primitive in `src/tools/primitives/createTag.ts` (position resolution, OmniJS generation, new Tag() call) → unit tests GREEN
- [ ] T035 [US2] Implement createTag definition handler in `src/tools/definitions/createTag.ts` (Zod validation, call primitive)
- [ ] T036 [US2] Register create_tag tool in `src/server.ts`

### 🔵 REFACTOR Phase - Polish

- [ ] T037 [US2] Refactor createTag position resolution logic for clarity while keeping tests green
- [ ] T038 [US2] Manual verification: Create tags at various positions in OmniFocus Script Editor
- [ ] T039 [US2] Manual verification: Test create_tag via MCP client with different position options

**Checkpoint**: User Story 2 complete - can create tags with positioning

---

## Phase 5: User Story 3 - Edit Tags (Priority: P3)

**Goal**: Enable AI to modify tag properties to evolve organizational system

**Independent Test**: Modify a tag's name, status, or settings and verify the change persists

### 🔴 RED Phase - Tests First (REQUIRED)

- [ ] T040 [P] [US3] Write contract test for edit_tag input schema with refine validations in `tests/contract/tag-tools/edit-tag.test.ts` → verify FAILS
- [ ] T041 [P] [US3] Write contract test for edit_tag response schema in `tests/contract/tag-tools/edit-tag.test.ts` → verify FAILS
- [ ] T042 [P] [US3] Write unit test for editTag primitive by ID in `tests/unit/tag-tools/editTag.test.ts` → verify FAILS
- [ ] T043 [P] [US3] Write unit test for editTag primitive by name (disambiguation) in `tests/unit/tag-tools/editTag.test.ts` → verify FAILS
- [ ] T044 [P] [US3] Write unit test for editTag updating name in `tests/unit/tag-tools/editTag.test.ts` → verify FAILS
- [ ] T045 [P] [US3] Write unit test for editTag updating status in `tests/unit/tag-tools/editTag.test.ts` → verify FAILS
- [ ] T046 [P] [US3] Write unit test for editTag updating allowsNextAction in `tests/unit/tag-tools/editTag.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [ ] T047 [P] [US3] Create edit_tag contract in `src/contracts/tag-tools/edit-tag.ts` (EditTagInputSchema with refine, EditTagResponseSchema with disambiguation) → contract tests GREEN
- [ ] T048 [US3] Implement editTag primitive in `src/tools/primitives/editTag.ts` (find by ID or name with disambiguation, partial updates, status mapping) → unit tests GREEN
- [ ] T049 [US3] Implement editTag definition handler in `src/tools/definitions/editTag.ts` (Zod validation, disambiguation error handling)
- [ ] T050 [US3] Register edit_tag tool in `src/server.ts`

### 🔵 REFACTOR Phase - Polish

- [ ] T051 [US3] Refactor editTag disambiguation logic while keeping tests green
- [ ] T052 [US3] Manual verification: Edit tags by ID and by name in OmniFocus Script Editor
- [ ] T053 [US3] Manual verification: Test edit_tag via MCP client with various property updates

**Checkpoint**: User Story 3 complete - can edit tag properties with disambiguation

---

## Phase 6: User Story 4 - Delete Tags (Priority: P4)

**Goal**: Enable AI to delete tags to keep organizational system clean

**Independent Test**: Delete a tag and verify it no longer exists

### 🔴 RED Phase - Tests First (REQUIRED)

- [ ] T054 [P] [US4] Write contract test for delete_tag input schema in `tests/contract/tag-tools/delete-tag.test.ts` → verify FAILS
- [ ] T055 [P] [US4] Write contract test for delete_tag response schema in `tests/contract/tag-tools/delete-tag.test.ts` → verify FAILS
- [ ] T056 [P] [US4] Write unit test for deleteTag primitive by ID in `tests/unit/tag-tools/deleteTag.test.ts` → verify FAILS
- [ ] T057 [P] [US4] Write unit test for deleteTag primitive by name (disambiguation) in `tests/unit/tag-tools/deleteTag.test.ts` → verify FAILS
- [ ] T058 [P] [US4] Write unit test for deleteTag with recursive child deletion in `tests/unit/tag-tools/deleteTag.test.ts` → verify FAILS
- [ ] T059 [P] [US4] Write unit test for deleteTag error handling (tag not found) in `tests/unit/tag-tools/deleteTag.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [ ] T060 [P] [US4] Create delete_tag contract in `src/contracts/tag-tools/delete-tag.ts` (DeleteTagInputSchema, DeleteTagResponseSchema with disambiguation) → contract tests GREEN
- [ ] T061 [US4] Implement deleteTag primitive in `src/tools/primitives/deleteTag.ts` (find tag with disambiguation, capture ID/name before deletion, deleteObject() call) → unit tests GREEN
- [ ] T062 [US4] Implement deleteTag definition handler in `src/tools/definitions/deleteTag.ts` (Zod validation, disambiguation error handling)
- [ ] T063 [US4] Register delete_tag tool in `src/server.ts`

### 🔵 REFACTOR Phase - Polish

- [ ] T064 [US4] Refactor deleteTag to ensure ID/name captured before deletion while keeping tests green
- [ ] T065 [US4] Manual verification: Delete tags with and without children in OmniFocus Script Editor
- [ ] T066 [US4] Manual verification: Test delete_tag via MCP client, verify tasks untagged but not deleted

**Checkpoint**: User Story 4 complete - can delete tags with recursive child deletion

---

## Phase 7: User Story 5 - Assign Tags to Tasks (Priority: P5)

**Goal**: Enable AI to add tags to tasks for context-based organization

**Independent Test**: Assign tags to tasks and verify the tags appear on those tasks

### 🔴 RED Phase - Tests First (REQUIRED)

- [ ] T067 [P] [US5] Write contract test for assign_tags input schema in `tests/contract/tag-tools/assign-tags.test.ts` → verify FAILS
- [ ] T068 [P] [US5] Write contract test for assign_tags response schema with batch results in `tests/contract/tag-tools/assign-tags.test.ts` → verify FAILS
- [ ] T069 [P] [US5] Write unit test for assignTags primitive success case in `tests/unit/tag-tools/assignTags.test.ts` → verify FAILS
- [ ] T070 [P] [US5] Write unit test for assignTags with multiple tasks and tags in `tests/unit/tag-tools/assignTags.test.ts` → verify FAILS
- [ ] T071 [P] [US5] Write unit test for assignTags with per-item failures (continue on error) in `tests/unit/tag-tools/assignTags.test.ts` → verify FAILS
- [ ] T072 [P] [US5] Write unit test for assignTags with disambiguation errors in `tests/unit/tag-tools/assignTags.test.ts` → verify FAILS
- [ ] T073 [P] [US5] Write unit test for assignTags idempotency (tag already assigned) in `tests/unit/tag-tools/assignTags.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [ ] T074 [P] [US5] Create assign_tags contract in `src/contracts/tag-tools/assign-tags.ts` (AssignTagsInputSchema, AssignTagsResponseSchema with batch results) → contract tests GREEN
- [ ] T075 [US5] Implement assignTags primitive in `src/tools/primitives/assignTags.ts` (resolve tags first, iterate tasks, task.addTag(), continue on error) → unit tests GREEN
- [ ] T076 [US5] Implement assignTags definition handler in `src/tools/definitions/assignTags.ts` (Zod validation, batch error handling)
- [ ] T077 [US5] Register assign_tags tool in `src/server.ts`

### 🔵 REFACTOR Phase - Polish

- [ ] T078 [US5] Refactor assignTags batch processing logic for clarity while keeping tests green
- [ ] T079 [US5] Manual verification: Assign tags to tasks in OmniFocus Script Editor with mixed success/failure scenarios
- [ ] T080 [US5] Manual verification: Test assign_tags via MCP client with multiple tasks and tags

**Checkpoint**: User Story 5 complete - can assign tags to tasks with batch operations

---

## Phase 8: User Story 6 - Remove Tags from Tasks (Priority: P6)

**Goal**: Enable AI to remove tags from tasks to clean up organizational metadata

**Independent Test**: Remove tags from tasks and verify the tags no longer appear on those tasks

### 🔴 RED Phase - Tests First (REQUIRED)

- [ ] T081 [P] [US6] Write contract test for remove_tags input schema with refine validations in `tests/contract/tag-tools/remove-tags.test.ts` → verify FAILS
- [ ] T082 [P] [US6] Write contract test for remove_tags response schema with batch results in `tests/contract/tag-tools/remove-tags.test.ts` → verify FAILS
- [ ] T083 [P] [US6] Write unit test for removeTags primitive with specific tags in `tests/unit/tag-tools/removeTags.test.ts` → verify FAILS
- [ ] T084 [P] [US6] Write unit test for removeTags primitive with clearAll in `tests/unit/tag-tools/removeTags.test.ts` → verify FAILS
- [ ] T085 [P] [US6] Write unit test for removeTags with per-item failures (continue on error) in `tests/unit/tag-tools/removeTags.test.ts` → verify FAILS
- [ ] T086 [P] [US6] Write unit test for removeTags with disambiguation errors in `tests/unit/tag-tools/removeTags.test.ts` → verify FAILS
- [ ] T087 [P] [US6] Write unit test for removeTags idempotency (tag not assigned) in `tests/unit/tag-tools/removeTags.test.ts` → verify FAILS
- [ ] T088 [P] [US6] Write unit test for removeTags error (clearAll + tagIds conflict) in `tests/unit/tag-tools/removeTags.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [ ] T089 [P] [US6] Create remove_tags contract in `src/contracts/tag-tools/remove-tags.ts` (RemoveTagsInputSchema with clearAll refine, RemoveTagsResponseSchema) → contract tests GREEN
- [ ] T090 [US6] Implement removeTags primitive in `src/tools/primitives/removeTags.ts` (resolve tags or use clearAll, task.removeTag() or task.clearTags(), continue on error) → unit tests GREEN
- [ ] T091 [US6] Implement removeTags definition handler in `src/tools/definitions/removeTags.ts` (Zod validation, batch error handling)
- [ ] T092 [US6] Register remove_tags tool in `src/server.ts`

### 🔵 REFACTOR Phase - Polish

- [ ] T093 [US6] Refactor removeTags clearAll logic while keeping tests green
- [ ] T094 [US6] Manual verification: Remove tags from tasks in OmniFocus Script Editor with clearAll and specific tags
- [ ] T095 [US6] Manual verification: Test remove_tags via MCP client with mixed success/failure scenarios

**Checkpoint**: User Story 6 complete - can remove tags from tasks with batch operations and clearAll

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T096 [P] Create contracts index in `src/contracts/tag-tools/index.ts` (re-export all tool contracts)
- [ ] T097 [P] Update README.md with tag management tools documentation (if exists)
- [ ] T098 [P] Update CLAUDE.md with tag management examples (if exists)
- [ ] T099 Code cleanup: Review all primitives for consistent error message formatting
- [ ] T100 Code cleanup: Review all OmniJS scripts for consistent style and error handling
- [ ] T101 Performance check: Test list_tags with large tag hierarchies (>100 tags)
- [ ] T102 Performance check: Test assign_tags and remove_tags with large batches (>50 tasks)
- [ ] T103 Security review: Verify all user inputs are escaped in OmniJS scripts
- [ ] T104 Run quickstart.md validation: Follow development workflow guide
- [ ] T105 Run full test suite: `pnpm test` → all tests GREEN
- [ ] T106 Run test coverage check: `pnpm test:coverage` → verify >80% coverage
- [ ] T107 Run linter: `pnpm lint` → no errors
- [ ] T108 Run type check: `pnpm typecheck` → no errors
- [ ] T109 Run build: `pnpm build` → successful compilation
- [ ] T110 Integration test: Test all 6 tools via Claude Desktop in sequence
- [ ] T111 Integration test: Verify error handling across all tools (not found, disambiguation, invalid inputs)
- [ ] T112 Integration test: Verify TDD compliance (all tests still GREEN after final changes)
- [ ] T113 [P] Edge case test: Verify root-level Tags container cannot be deleted or modified (returns "Cannot delete or modify the root Tags container" error)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5 → P6)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (P3)**: Can start after Foundational - Independently testable (may use US2 for test data)
- **User Story 4 (P4)**: Can start after Foundational - Independently testable (may use US2 for test data)
- **User Story 5 (P5)**: Can start after Foundational - Independently testable (needs tags from US1/US2, but not dependent on their completion)
- **User Story 6 (P6)**: Can start after Foundational - Independently testable (needs US5 for test setup, but can be independently verified)

### TDD Order Within Each User Story (MANDATORY)

```text
1. 🔴 RED: Write failing tests
   - Contract tests for schemas
   - Unit tests for primitives
   - Run `pnpm test` → verify tests FAIL

2. 🟢 GREEN: Implement minimum code
   - Contracts first (schemas)
   - Primitives second (business logic)
   - Definitions third (MCP interface)
   - Run `pnpm test` → tests turn GREEN

3. 🔵 REFACTOR: Clean up
   - Improve code quality
   - Run `pnpm test` → tests stay GREEN
   - Manual OmniFocus verification (last)
```

### Parallel Opportunities

#### Phase 1 (Setup)
- All 4 tasks (T001-T004) can run in parallel - different directories

#### Phase 2 (Foundational)
- Schema creation tasks (T005-T009) can run in parallel - different files
- Contract test tasks (T010-T013) can run in parallel after schemas exist - different test files

#### Phase 3-8 (User Stories)
Once Foundational phase completes, all user stories can start in parallel if team capacity allows:
- Developer A: US1 (list_tags) - TDD cycle
- Developer B: US2 (create_tag) - TDD cycle
- Developer C: US3 (edit_tag) - TDD cycle
- Developer D: US4 (delete_tag) - TDD cycle
- Developer E: US5 (assign_tags) - TDD cycle
- Developer F: US6 (remove_tags) - TDD cycle

Within each user story:
- All RED phase tests marked [P] can run in parallel (different test files or test suites)
- All GREEN phase tasks marked [P] can run in parallel (different implementation files)

#### Phase 9 (Polish)
- Documentation tasks (T096-T098) can run in parallel
- Cleanup tasks (T099-T100) can run in parallel
- Performance checks (T101-T102) can run in parallel
- All validation tasks (T105-T108) can run in parallel

---

## TDD Parallel Example: User Story 1

```bash
# 🔴 RED: Launch all test writing tasks together:
T014 [P] [US1] Write contract test for input schema
T015 [P] [US1] Write contract test for response schema
T016 [P] [US1] Write unit test for success case
T017 [P] [US1] Write unit test with status filter
T018 [P] [US1] Write unit test with parentId filter
T019 [P] [US1] Write unit test with includeChildren

# Verify all tests FAIL with `pnpm test`

# 🟢 GREEN: Implement in sequence (contracts → primitives → definitions):
T020 [P] [US1] Create contract (schemas)
T021 [US1] Implement primitive (business logic)
T022 [US1] Implement definition (MCP handler)
T023 [US1] Register tool (server integration)

# Tests turn GREEN with `pnpm test`

# 🔵 REFACTOR: Polish while maintaining green tests:
T024 [US1] Refactor OmniJS script
T025 [US1] Manual verification in Script Editor
T026 [US1] Manual verification via MCP client
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T013) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T014-T026) - following TDD cycle
4. **STOP and VALIDATE**: All tests GREEN, manual verification passes
5. Deploy/demo list_tags functionality

**MVP Scope**: list_tags tool enables AI to view tag structure and usage

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (list_tags) → TDD cycle → All tests GREEN → Deploy/Demo (MVP!)
3. Add User Story 2 (create_tag) → TDD cycle → All tests GREEN → Deploy/Demo
4. Add User Story 3 (edit_tag) → TDD cycle → All tests GREEN → Deploy/Demo
5. Add User Story 4 (delete_tag) → TDD cycle → All tests GREEN → Deploy/Demo
6. Add User Story 5 (assign_tags) → TDD cycle → All tests GREEN → Deploy/Demo
7. Add User Story 6 (remove_tags) → TDD cycle → All tests GREEN → Deploy/Demo
8. Complete Polish phase → Final validation → Deploy complete feature

Each story adds value without breaking previous stories (tests catch regressions)

### Parallel Team Strategy

With 6 developers available:

1. Team completes Setup + Foundational together (T001-T013)
2. Once Foundational is done, split into parallel tracks:
   - Developer A: User Story 1 - list_tags (T014-T026)
   - Developer B: User Story 2 - create_tag (T027-T039)
   - Developer C: User Story 3 - edit_tag (T040-T053)
   - Developer D: User Story 4 - delete_tag (T054-T066)
   - Developer E: User Story 5 - assign_tags (T067-T080)
   - Developer F: User Story 6 - remove_tags (T081-T095)
3. Stories complete independently and integrate via server.ts registration
4. All tests GREEN before merge
5. Team reconvenes for Polish phase (T096-T113)

---

## Task Summary

### Total Tasks: 115

### Tasks by Phase:
- **Phase 1 (Setup)**: 4 tasks (T001-T004)
- **Phase 2 (Foundational)**: 9 tasks (T005-T013)
- **Phase 3 (US1 - list_tags)**: 13 tasks (T014-T026)
- **Phase 4 (US2 - create_tag)**: 15 tasks (T027-T039, T032b, T032c)
- **Phase 5 (US3 - edit_tag)**: 14 tasks (T040-T053)
- **Phase 6 (US4 - delete_tag)**: 13 tasks (T054-T066)
- **Phase 7 (US5 - assign_tags)**: 14 tasks (T067-T080)
- **Phase 8 (US6 - remove_tags)**: 15 tasks (T081-T095)
- **Phase 9 (Polish)**: 18 tasks (T096-T113)

### Parallel Opportunities:
- Setup: 4 parallel tasks
- Foundational: 9 parallel tasks (4 schema creation + 4 contract tests, plus 1 index)
- User Stories: 6 stories can run in parallel after Foundational complete
- Within each story: 5-8 RED phase tests can run in parallel
- Within each story: 1-2 GREEN phase tasks can run in parallel
- Polish: Up to 11 tasks can run in parallel

### MVP Scope:
**User Story 1 only (list_tags)** - 26 tasks total (T001-T013 foundational + T014-T026 US1)

This provides immediate value by enabling AI assistants to view and understand the user's tag taxonomy.

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label (US1-US6) maps task to specific user story for traceability
- Each user story is independently completable and testable
- **TDD is mandatory** - tests MUST fail before implementation begins
- Commit after each TDD cycle (RED verified, GREEN achieved, REFACTOR done)
- Stop at any checkpoint to validate story independently
- All OmniJS scripts follow error handling pattern: try-catch with JSON.stringify
- All primitives return structured responses: { success: true/false, ...data/error }
- All definitions use Zod safeParse with structured error responses
- Batch operations (assign_tags, remove_tags) continue on per-item failures
- Disambiguation errors include code and matchingIds for client-side resolution
