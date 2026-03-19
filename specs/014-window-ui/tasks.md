# Tasks: Window & UI Control

**Input**: Design documents from `/specs/014-window-ui/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Contracts**: `src/contracts/window-tools/`
- **Definitions**: `src/tools/definitions/`
- **Primitives**: `src/tools/primitives/`
- **Contract tests**: `tests/contract/window-tools/`
- **Unit tests**: `tests/unit/window-tools/`
- **Integration tests**: `tests/integration/window-tools/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization -- create directory structure and shared contract schemas

- [x] T001 Create directory structure for `src/contracts/window-tools/shared/`, `tests/contract/window-tools/`, `tests/unit/window-tools/`, and `tests/integration/window-tools/`
- [x] T002 [P] Copy `WindowItemIdentifierSchema` from `specs/014-window-ui/contracts/shared/item-identifier.ts` to `src/contracts/window-tools/shared/item-identifier.ts` (adjust imports for project Zod version)
- [x] T003 [P] Copy `WindowItemTypeSchema`, `DisambiguationCandidateSchema`, `WindowBatchItemResultSchema`, `WindowBatchSummarySchema` from `specs/014-window-ui/contracts/shared/batch.ts` to `src/contracts/window-tools/shared/batch.ts`
- [x] T004 [P] Create barrel export in `src/contracts/window-tools/shared/index.ts` re-exporting all shared schemas from `item-identifier.ts` and `batch.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contract schemas for all 8 tools, plus foundational contract tests that validate schema shapes. MUST complete before ANY user story.

**CRITICAL**: No user story work can begin until this phase is complete.

### Contract Schemas

- [x] T005 [P] Copy `RevealItemsInputSchema`, `RevealItemsSuccessSchema`, `RevealItemsErrorSchema`, `RevealItemsResponseSchema` from `specs/014-window-ui/contracts/reveal-items.ts` to `src/contracts/window-tools/reveal-items.ts`
- [x] T006 [P] Copy `ExpandItemsInputSchema`, `ExpandItemsSuccessSchema`, `ExpandItemsErrorSchema`, `ExpandItemsResponseSchema` from `specs/014-window-ui/contracts/expand-items.ts` to `src/contracts/window-tools/expand-items.ts`
- [x] T007 [P] Copy `CollapseItemsInputSchema`, `CollapseItemsSuccessSchema`, `CollapseItemsErrorSchema`, `CollapseItemsResponseSchema` from `specs/014-window-ui/contracts/collapse-items.ts` to `src/contracts/window-tools/collapse-items.ts`
- [x] T008 [P] Copy `ExpandNotesInputSchema`, `ExpandNotesSuccessSchema`, `ExpandNotesErrorSchema`, `ExpandNotesResponseSchema` from `specs/014-window-ui/contracts/expand-notes.ts` to `src/contracts/window-tools/expand-notes.ts`
- [x] T009 [P] Copy `CollapseNotesInputSchema`, `CollapseNotesSuccessSchema`, `CollapseNotesErrorSchema`, `CollapseNotesResponseSchema` from `specs/014-window-ui/contracts/collapse-notes.ts` to `src/contracts/window-tools/collapse-notes.ts`
- [x] T010 [P] Copy `FocusTargetSchema`, `FocusItemsInputSchema`, `FocusItemsSuccessSchema`, `FocusItemsErrorSchema`, `FocusItemsResponseSchema` from `specs/014-window-ui/contracts/focus-items.ts` to `src/contracts/window-tools/focus-items.ts`
- [x] T011 [P] Copy `UnfocusInputSchema`, `UnfocusSuccessSchema`, `UnfocusErrorSchema`, `UnfocusResponseSchema` from `specs/014-window-ui/contracts/unfocus.ts` to `src/contracts/window-tools/unfocus.ts`
- [x] T012 [P] Copy `SelectItemsInputSchema`, `SelectItemsSuccessSchema`, `SelectItemsErrorSchema`, `SelectItemsResponseSchema` from `specs/014-window-ui/contracts/select-items.ts` to `src/contracts/window-tools/select-items.ts`
- [x] T013 Create barrel export in `src/contracts/window-tools/index.ts` re-exporting all schemas from all 8 tool contracts and shared schemas (mirror `specs/014-window-ui/contracts/index.ts`)

### Contract Tests (RED -- verify schemas compile and validate correctly)

- [x] T014 [P] Write contract tests for shared schemas in `tests/contract/window-tools/shared-schemas.test.ts` -- test `WindowItemIdentifierSchema` (requires id or name, rejects empty), `WindowItemTypeSchema` (4 valid values), `DisambiguationCandidateSchema`, `WindowBatchItemResultSchema` (success/error variants, code values), `WindowBatchSummarySchema` (validates FR-009, FR-019, FR-020, FR-022)
- [x] T015 [P] Write contract tests for `reveal-items` schemas in `tests/contract/window-tools/reveal-items.test.ts` -- test input (1-10 items array), success response (results + summary), error response, discriminated union (validates FR-001, FR-012)
- [x] T016 [P] Write contract tests for `expand-items` schemas in `tests/contract/window-tools/expand-items.test.ts` -- test input (1-50 items, optional completely), success response, error response, discriminated union (validates FR-002, FR-012)
- [x] T017 [P] Write contract tests for `collapse-items` schemas in `tests/contract/window-tools/collapse-items.test.ts` -- test input (1-50 items, optional completely), success response, error response (validates FR-003, FR-012)
- [x] T018 [P] Write contract tests for `expand-notes` schemas in `tests/contract/window-tools/expand-notes.test.ts` -- test input (1-50 items, optional completely), success response, error response (validates FR-004, FR-012)
- [x] T019 [P] Write contract tests for `collapse-notes` schemas in `tests/contract/window-tools/collapse-notes.test.ts` -- test input (1-50 items, optional completely), success response, error response (validates FR-005, FR-012)
- [x] T020 [P] Write contract tests for `focus-items` schemas in `tests/contract/window-tools/focus-items.test.ts` -- test `FocusTargetSchema` (requires id or name), input (1-50 targets), success response, error response (validates FR-006, FR-016)
- [x] T021 [P] Write contract tests for `unfocus` schemas in `tests/contract/window-tools/unfocus.test.ts` -- test empty input, success response (no results/summary), error response (validates FR-007)
- [x] T022 [P] Write contract tests for `select-items` schemas in `tests/contract/window-tools/select-items.test.ts` -- test input (1-100 items, optional extending), success response, error response (validates FR-008, FR-012)
- [x] T023 Run `pnpm test tests/contract/window-tools/` -- verify all contract tests PASS (schemas compile correctly)

**Checkpoint**: All shared schemas and contract tests in place. Foundation ready for user story implementation.

---

## Phase 3: User Story 1 -- Reveal Items in Outline (Priority: P1) -- MVP

**Goal**: Enable AI assistants to navigate to specific items in the OmniFocus outline, scrolling and expanding the hierarchy to make them visible.

**Independent Test**: Create a task nested inside a project inside a folder, reveal it, verify the outline scrolls to show that task.

**FR Coverage**: FR-001, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-018, FR-019, FR-021

### RED Phase -- Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T024 [P] [US1] Write unit tests for `revealItems` primitive in `tests/unit/window-tools/revealItems.test.ts` -- test: single item reveal by ID, multiple items reveal (batch), item not found (NOT_FOUND), name disambiguation (DISAMBIGUATION_REQUIRED), node not visible (NODE_NOT_FOUND), version guard (OF4+ required per FR-010), window guard (no window per FR-014), content tree guard (FR-011), partial failure in batch (FR-012), 4-type resolution order task->project->folder->tag (FR-009), default itemType for failed lookups (FR-019), verify all tests FAIL

### GREEN Phase -- Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T025 [US1] Implement `revealItems` primitive in `src/tools/primitives/revealItems.ts` -- generate OmniJS script with version/window/content-tree guards (FR-010, FR-014, FR-011), 4-type item resolution (FR-009), batch node resolution via `tree.nodesForObjects()`, `tree.reveal(nodes)` call, per-item result tracking with NOT_FOUND/NODE_NOT_FOUND/DISAMBIGUATION_REQUIRED codes (FR-012, FR-015, FR-019), return `RevealItemsResponse`. Follow `dropItems.ts` or `markComplete.ts` pattern for structure
- [x] T026 [US1] Implement `revealItems` definition in `src/tools/definitions/revealItems.ts` -- MCP tool handler with `RevealItemsInputSchema` validation, UI warning in description (FR-013), call primitive, return MCP response. Follow existing definition patterns (e.g., `markComplete.ts`)
- [x] T027 [US1] Register `reveal_items` tool in `src/server.ts` -- add import and tool registration following existing pattern
- [x] T028 [US1] Run `pnpm test tests/unit/window-tools/revealItems.test.ts` -- verify all tests GREEN

### REFACTOR Phase -- Polish

- [x] T029 [US1] Run `pnpm build && pnpm typecheck && pnpm lint` -- verify clean build
- [x] T030 [US1] Manual verification: test reveal_items OmniJS script in OmniFocus Script Editor

**Checkpoint**: User Story 1 (reveal_items) fully functional and tested. MVP complete.

---

## Phase 4: User Story 2 -- Expand/Collapse Outline Nodes (Priority: P1) [P]

**Goal**: Enable AI assistants to control outline detail level by expanding or collapsing nodes, with optional recursive operation.

**Independent Test**: Create a project with nested tasks, expand it to verify children become visible, collapse it to verify they are hidden.

**FR Coverage**: FR-002, FR-003, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-018, FR-019, FR-020 (ALREADY_EXPANDED, ALREADY_COLLAPSED), FR-021, FR-022

### RED Phase -- Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T031 [P] [US2] Write unit tests for `expandItems` primitive in `tests/unit/window-tools/expandItems.test.ts` -- test: single item expand, expand completely (recursive), already expanded (ALREADY_EXPANDED no-op code per FR-020), item not found (NOT_FOUND), node not found (NODE_NOT_FOUND), disambiguation, version/window/content-tree guards (FR-010, FR-014, FR-011), batch with partial failures (FR-012), verify all tests FAIL
- [x] T032 [P] [US2] Write unit tests for `collapseItems` primitive in `tests/unit/window-tools/collapseItems.test.ts` -- test: single item collapse, collapse completely (recursive), already collapsed (ALREADY_COLLAPSED no-op code per FR-020), item not found, node not found, disambiguation, guards, batch partial failures, verify all tests FAIL

### GREEN Phase -- Implementation

- [x] T033 [US2] Implement `expandItems` primitive in `src/tools/primitives/expandItems.ts` -- OmniJS script with guards, 4-type resolution, `node.expand(completely || false)`, `isExpanded` check for ALREADY_EXPANDED no-op, per-item results (FR-002, FR-012, FR-020)
- [x] T034 [US2] Implement `expandItems` definition in `src/tools/definitions/expandItems.ts` -- MCP handler with `ExpandItemsInputSchema`, UI warning (FR-013)
- [x] T035 [US2] Implement `collapseItems` primitive in `src/tools/primitives/collapseItems.ts` -- OmniJS script with guards, 4-type resolution, `node.collapse(completely || false)`, `isExpanded` check for ALREADY_COLLAPSED no-op, per-item results (FR-003, FR-012, FR-020)
- [x] T036 [US2] Implement `collapseItems` definition in `src/tools/definitions/collapseItems.ts` -- MCP handler with `CollapseItemsInputSchema`, UI warning (FR-013)
- [x] T037 [US2] Register `expand_items` and `collapse_items` tools in `src/server.ts`
- [x] T038 [US2] Run `pnpm test tests/unit/window-tools/expandItems.test.ts tests/unit/window-tools/collapseItems.test.ts` -- verify all tests GREEN

### REFACTOR Phase -- Polish

- [x] T039 [US2] Run `pnpm build && pnpm typecheck && pnpm lint` -- verify clean build
- [x] T040 [US2] Manual verification: test expand_items and collapse_items OmniJS scripts in OmniFocus Script Editor

**Checkpoint**: User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 -- Expand/Collapse Notes (Priority: P2) [P]

**Goal**: Enable AI assistants to toggle note visibility on outline items, showing or hiding note content inline.

**Independent Test**: Create a task with a note, expand its note to verify content becomes visible, collapse to verify it is hidden.

**FR Coverage**: FR-004, FR-005, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-018, FR-019, FR-020 (NO_NOTE), FR-021, FR-022

### RED Phase -- Tests First (REQUIRED)

- [x] T041 [P] [US3] Write unit tests for `expandNotes` primitive in `tests/unit/window-tools/expandNotes.test.ts` -- test: expand note on item, expand completely (recursive), item with no note (NO_NOTE no-op code per FR-020), item not found, node not found, disambiguation, guards, batch partial failures, verify all tests FAIL
- [x] T042 [P] [US3] Write unit tests for `collapseNotes` primitive in `tests/unit/window-tools/collapseNotes.test.ts` -- test: collapse note on item, collapse completely, item with no note (NO_NOTE no-op), not found, node not found, disambiguation, guards, batch partial failures, verify all tests FAIL

### GREEN Phase -- Implementation

- [x] T043 [US3] Implement `expandNotes` primitive in `src/tools/primitives/expandNotes.ts` -- OmniJS script with guards, 4-type resolution, `node.expandNote(completely || false)`, detect no-note items (NO_NOTE code), per-item results (FR-004, FR-012, FR-020)
- [x] T044 [US3] Implement `expandNotes` definition in `src/tools/definitions/expandNotes.ts` -- MCP handler with `ExpandNotesInputSchema`, UI warning (FR-013)
- [x] T045 [US3] Implement `collapseNotes` primitive in `src/tools/primitives/collapseNotes.ts` -- OmniJS script with guards, `node.collapseNote(completely || false)`, NO_NOTE detection, per-item results (FR-005, FR-012, FR-020)
- [x] T046 [US3] Implement `collapseNotes` definition in `src/tools/definitions/collapseNotes.ts` -- MCP handler with `CollapseNotesInputSchema`, UI warning (FR-013)
- [x] T047 [US3] Register `expand_notes` and `collapse_notes` tools in `src/server.ts`
- [x] T048 [US3] Run `pnpm test tests/unit/window-tools/expandNotes.test.ts tests/unit/window-tools/collapseNotes.test.ts` -- verify all tests GREEN

### REFACTOR Phase -- Polish

- [x] T049 [US3] Run `pnpm build && pnpm typecheck && pnpm lint` -- verify clean build
- [x] T050 [US3] Manual verification: test expand_notes and collapse_notes OmniJS scripts in OmniFocus Script Editor

**Checkpoint**: User Stories 1, 2, AND 3 should all work independently.

---

## Phase 6: User Story 4 -- Focus on Project or Folder (Priority: P2) [P]

**Goal**: Enable AI assistants to narrow the OmniFocus view to specific projects or folders, filtering out everything else.

**Independent Test**: Create a folder with projects, focus on that folder, verify only its contents are visible.

**FR Coverage**: FR-006, FR-009, FR-010, FR-013, FR-014, FR-016, FR-018 (no content tree guard), FR-019, FR-021, FR-022 (INVALID_TYPE)

### RED Phase -- Tests First (REQUIRED)

- [x] T051 [P] [US4] Write unit tests for `focusItems` primitive in `tests/unit/window-tools/focusItems.test.ts` -- test: focus on project, focus on folder, focus on multiple targets, task rejected (INVALID_TYPE per FR-016), tag rejected (INVALID_TYPE), item not found (NOT_FOUND), disambiguation, version guard (FR-010), window guard (FR-014), NO content tree guard (FR-018 -- focus uses window.focus directly), batch partial failures with valid+invalid mix, verify all tests FAIL

### GREEN Phase -- Implementation

- [x] T052 [US4] Implement `focusItems` primitive in `src/tools/primitives/focusItems.ts` -- OmniJS script with version + window guards (NO content tree guard per FR-018), 4-type resolution, reject task/tag with INVALID_TYPE (FR-016), set `window.focus = [validTargets]`, per-item results (FR-006, FR-012)
- [x] T053 [US4] Implement `focusItems` definition in `src/tools/definitions/focusItems.ts` -- MCP handler with `FocusItemsInputSchema`, UI warning (FR-013)
- [x] T054 [US4] Register `focus_items` tool in `src/server.ts`
- [x] T055 [US4] Run `pnpm test tests/unit/window-tools/focusItems.test.ts` -- verify all tests GREEN

### REFACTOR Phase -- Polish

- [x] T056 [US4] Run `pnpm build && pnpm typecheck && pnpm lint` -- verify clean build
- [x] T057 [US4] Manual verification: test focus_items OmniJS script in OmniFocus Script Editor

**Checkpoint**: User Stories 1-4 should all work independently.

---

## Phase 7: User Story 5 -- Unfocus (Clear Focus) (Priority: P2) [P]

**Goal**: Enable AI assistants to restore the full OmniFocus outline by clearing focus.

**Independent Test**: Focus on a folder, then unfocus, verify full outline returns.

**FR Coverage**: FR-007, FR-010, FR-013, FR-014, FR-018 (no content tree guard), FR-021

### RED Phase -- Tests First (REQUIRED)

- [x] T058 [P] [US5] Write unit tests for `unfocus` primitive in `tests/unit/window-tools/unfocus.test.ts` -- test: unfocus when focused (clears focus), unfocus when already unfocused (idempotent no-op), version guard (FR-010), window guard (FR-014), NO content tree guard (FR-018), verify all tests FAIL

### GREEN Phase -- Implementation

- [x] T059 [US5] Implement `unfocus` primitive in `src/tools/primitives/unfocus.ts` -- OmniJS script with version + window guards (NO content tree guard per FR-018), set `window.focus = []` (FR-007), return `{ success: true }` on success
- [x] T060 [US5] Implement `unfocus` definition in `src/tools/definitions/unfocus.ts` -- MCP handler with `UnfocusInputSchema` (empty object), UI warning (FR-013)
- [x] T061 [US5] Register `unfocus` tool in `src/server.ts`
- [x] T062 [US5] Run `pnpm test tests/unit/window-tools/unfocus.test.ts` -- verify all tests GREEN

### REFACTOR Phase -- Polish

- [x] T063 [US5] Run `pnpm build && pnpm typecheck && pnpm lint` -- verify clean build
- [x] T064 [US5] Manual verification: test unfocus OmniJS script in OmniFocus Script Editor

**Checkpoint**: User Stories 1-5 should all work independently.

---

## Phase 8: User Story 6 -- Select Items in Outline (Priority: P3) [P]

**Goal**: Enable AI assistants to select specific items in the OmniFocus outline for visual review or to prepare items for manual batch operations.

**Independent Test**: Create multiple tasks, select two of them, verify they appear highlighted in the outline.

**FR Coverage**: FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-017 (pre-flight reveal), FR-018, FR-019, FR-021, FR-022

### RED Phase -- Tests First (REQUIRED)

- [x] T065 [P] [US6] Write unit tests for `selectItems` primitive in `tests/unit/window-tools/selectItems.test.ts` -- test: select single item, select multiple items, extending=false replaces selection, extending=true adds to selection, pre-flight reveal called before select (FR-017), item not found (NOT_FOUND), node not found (NODE_NOT_FOUND), disambiguation, version/window/content-tree guards, batch partial failures, verify all tests FAIL

### GREEN Phase -- Implementation

- [x] T066 [US6] Implement `selectItems` primitive in `src/tools/primitives/selectItems.ts` -- OmniJS script with guards, 4-type resolution, resolve nodes via `tree.nodesForObjects()`, pre-flight `tree.reveal(nodes)` before `tree.select(nodes, extending || false)` (FR-017), per-item results (FR-008, FR-012)
- [x] T067 [US6] Implement `selectItems` definition in `src/tools/definitions/selectItems.ts` -- MCP handler with `SelectItemsInputSchema`, UI warning (FR-013)
- [x] T068 [US6] Register `select_items` tool in `src/server.ts`
- [x] T069 [US6] Run `pnpm test tests/unit/window-tools/selectItems.test.ts` -- verify all tests GREEN

### REFACTOR Phase -- Polish

- [x] T070 [US6] Run `pnpm build && pnpm typecheck && pnpm lint` -- verify clean build
- [x] T071 [US6] Manual verification: test select_items OmniJS script in OmniFocus Script Editor

**Checkpoint**: All 6 user stories and all 8 tools should work independently.

---

## Phase 9: Integration Testing & Polish

**Purpose**: Cross-tool integration tests, full suite validation, and final polish.

- [x] T072 [P] Write integration test scaffold in `tests/integration/window-tools/window-workflow.integration.test.ts` -- test reveal -> expand -> collapse -> focus -> unfocus -> select workflow end-to-end (requires OmniFocus running)
- [x] T073 Run full test suite: `pnpm test` -- verify all existing tests still pass (no regressions) and all new window-tools tests pass
- [x] T074 Run coverage check: `pnpm test:coverage` -- verify coverage meets project standards
- [x] T075 Run `pnpm build && pnpm typecheck && pnpm lint` -- final clean build validation
- [x] T076 Verify all 8 tool descriptions include UI side-effect warning (FR-013) by searching: `grep -n "WARNING.*UI state" src/tools/definitions/*.ts`
- [x] T077 Verify guard matrix compliance (FR-018) by reviewing all 8 primitives: 6 tools have version+window+content-tree guards, 2 tools (focus/unfocus) have version+window only
- [x] T078 Verify no `as Type` assertions outside primitive boundary: `grep -rn ' as [A-Z]' src/tools/ --include='*.ts'` should only match `primitives/*.ts` at `executeOmniJS` return
- [x] T079 Update `CLAUDE.md` "Recent Changes" section with Phase 14 Window & UI Control completion summary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion -- BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (Phase 3) is MVP -- recommended to complete first
  - US2-US6 (Phases 4-8) can then proceed in parallel (marked [P] at phase level)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 -- Reveal (P1)**: Can start after Phase 2. No dependencies on other stories
- **User Story 2 -- Expand/Collapse (P1)**: Can start after Phase 2. No dependencies on other stories [P]
- **User Story 3 -- Notes (P2)**: Can start after Phase 2. No dependencies on other stories [P]
- **User Story 4 -- Focus (P2)**: Can start after Phase 2. No dependencies on other stories [P]
- **User Story 5 -- Unfocus (P2)**: Can start after Phase 2. No dependencies on other stories [P]
- **User Story 6 -- Select (P3)**: Can start after Phase 2. No dependencies on other stories [P]

### TDD Order Within Each User Story (MANDATORY)

```text
1. RED: Write failing tests
   - Unit tests for primitives
   - Run `pnpm test` -> verify tests FAIL

2. GREEN: Implement minimum code
   - Primitives first (business logic + OmniJS scripts)
   - Definitions second (MCP interface)
   - Register in server.ts
   - Run `pnpm test` -> tests turn GREEN

3. REFACTOR: Clean up
   - Build, typecheck, lint
   - Manual OmniFocus verification (last)
```

### Parallel Opportunities

- T002-T004 (Phase 1): All shared schema copy tasks can run in parallel
- T005-T012 (Phase 2): All 8 contract copy tasks can run in parallel
- T014-T022 (Phase 2): All 9 contract test files can be written in parallel
- Phase 3-8 (US1-US6): All 6 user story phases can run in parallel after Phase 2
- Within each US: RED-phase test tasks marked [P] can run in parallel (expand + collapse in US2, expandNotes + collapseNotes in US3)
- T072-T078 (Phase 9): Polish tasks marked [P] can run in parallel

---

## TDD Parallel Example: User Story 2 (Expand/Collapse)

```bash
# RED: Launch both test files together (they will FAIL):
Task: "T031 [P] [US2] Write unit tests for expandItems -> verify FAILS"
Task: "T032 [P] [US2] Write unit tests for collapseItems -> verify FAILS"

# GREEN: Implement to make tests pass:
Task: "T033-T037 Implementation tasks (primitives, definitions, server registration)"

# REFACTOR: Polish while green:
Task: "T039 Build/typecheck/lint"
Task: "T040 Manual verification"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL -- blocks all stories)
3. Complete Phase 3: User Story 1 -- reveal_items (following TDD cycle)
4. **STOP and VALIDATE**: All tests GREEN, manual verification passes
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add US1 (reveal_items) -> TDD cycle -> All tests GREEN -> MVP!
3. Add US2 (expand_items + collapse_items) -> TDD cycle -> All tests GREEN
4. Add US3 (expand_notes + collapse_notes) -> TDD cycle -> All tests GREEN
5. Add US4 (focus_items) -> TDD cycle -> All tests GREEN
6. Add US5 (unfocus) -> TDD cycle -> All tests GREEN
7. Add US6 (select_items) -> TDD cycle -> All tests GREEN
8. Integration testing & polish -> Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (reveal_items) -- recommended first
   - Developer B: User Story 2 (expand/collapse)
   - Developer C: User Story 3 (notes)
   - Developer D: User Story 4 + 5 (focus/unfocus pair)
   - Developer E: User Story 6 (select)
3. Stories complete and integrate independently
4. All tests GREEN before merge

---

## FR Traceability Matrix

| FR | Description | Tasks |
|----|-------------|-------|
| FR-001 | Reveal 1-10 items | T015, T024-T030 |
| FR-002 | Expand nodes with completely | T016, T031, T033-T034 |
| FR-003 | Collapse nodes with completely | T017, T032, T035-T036 |
| FR-004 | Expand notes with completely | T018, T041, T043-T044 |
| FR-005 | Collapse notes with completely | T019, T042, T045-T046 |
| FR-006 | Focus on projects/folders | T020, T051-T053 |
| FR-007 | Unfocus (clear focus) | T021, T058-T060 |
| FR-008 | Select items with extending | T022, T065-T067 |
| FR-009 | 4-type ID/name resolution | T014, T024-T025, T031-T033, T035, T041, T043, T045, T051-T052, T065-T066 |
| FR-010 | Version guard (OF4+) | T024-T025, T031-T033, T035, T041, T043, T045, T051-T052, T058-T059, T065-T066, T077 |
| FR-011 | Content tree guard | T024-T025, T031-T033, T035, T041, T043, T045, T065-T066, T077 |
| FR-012 | Per-item batch results | T014-T022, T024-T025, T031-T035, T041-T043, T045, T051-T052, T065-T066 |
| FR-013 | UI warning in descriptions | T026, T034, T036, T044, T046, T053, T060, T067, T076 |
| FR-014 | No window error | T024-T025, T031-T033, T035, T041, T043, T045, T051-T052, T058-T059, T065-T066, T077 |
| FR-015 | NODE_NOT_FOUND distinct error | T024-T025, T031-T033, T035, T041, T043, T045, T065-T066 |
| FR-016 | Focus rejects tasks/tags | T020, T051-T052 |
| FR-017 | select pre-flight reveal | T065-T066 |
| FR-018 | Guard matrix per tool | T051-T052, T058-T059, T077 |
| FR-019 | Failed lookup defaults | T014, T024-T025, T031-T033, T035, T041, T043, T045, T051-T052, T065-T066 |
| FR-020 | No-op success codes | T014, T031-T033, T035, T041-T043, T045 |
| FR-021 | Two-tier error hierarchy | T024-T025, T031-T033, T035, T041, T043, T045, T051-T052, T058-T059, T065-T066 |
| FR-022 | Code applicability matrix | T014, T031-T032, T041-T042, T051, T065 |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD is mandatory** -- tests MUST fail before implementation begins
- Commit after each TDD cycle (RED verified, GREEN achieved, REFACTOR done)
- Stop at any checkpoint to validate story independently
- All 8 tools share the same OmniJS guard pattern -- version check, window check, optional content tree check (per FR-018 matrix)
- Focus/unfocus (US4, US5) skip content tree guard -- they use `window.focus` directly
- If tests don't fail initially, the test is either wrong or implementation already exists
