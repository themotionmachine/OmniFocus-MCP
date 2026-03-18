# Tasks: Task Status & Completion

**Input**: Design documents from `/specs/013-task-status/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Contracts**: `src/contracts/status-tools/`
- **Shared Schemas**: `src/contracts/status-tools/shared/`
- **Primitives**: `src/tools/primitives/`
- **Definitions**: `src/tools/definitions/`
- **Contract Tests**: `tests/contract/status-tools/`
- **Unit Tests**: `tests/unit/status-tools/`
- **Integration Tests**: `tests/integration/status-tools/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure for the 6 new status tools

- [x] T001 Create directory structure: `src/contracts/status-tools/shared/`, `tests/contract/status-tools/`, `tests/unit/status-tools/`, `tests/integration/status-tools/`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Shared Zod schemas used by ALL 6 tools — MUST complete before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**References**: Data-model §ItemIdentifier, §StatusBatchItemResult, §Batch Response; Plan §Reusable Schemas

### 🔴 RED Phase - Tests First (REQUIRED)

- [x] T002 Write contract tests for shared schemas (ItemIdentifierSchema validation: conditional id/name, id-precedence, empty-string rejection; StatusBatchItemResultSchema: success/failure discriminant, error codes, candidates array; SummarySchema: total/succeeded/failed counters; DisambiguationErrorSchema: success=false, code literal, matchingIds min(2)) in `tests/contract/status-tools/shared-schemas.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [x] T003 [P] Implement ItemIdentifierSchema with Zod 4.x `.refine()` for conditional requirement (at least one of id/name non-empty) in `src/contracts/status-tools/shared/item-identifier.ts`
- [x] T004 [P] Implement StatusBatchItemResultSchema (success boolean discriminant, optional error/code/candidates fields, 6 error code literals) and SummarySchema (total/succeeded/failed as `z.number().int().min(0)`) in `src/contracts/status-tools/shared/batch.ts`
- [x] T005 [P] Implement DisambiguationErrorSchema (`success: z.literal(false)`, `code: z.literal('DISAMBIGUATION_REQUIRED')`, `matchingIds: z.array(z.string()).min(2)`) in `src/contracts/status-tools/shared/disambiguation.ts` — follows per-domain pattern from task-tools/project-tools/tag-tools/folder-tools (each domain owns its own identical schema)
- [x] T006 Create shared barrel export in `src/contracts/status-tools/shared/index.ts` re-exporting ItemIdentifierSchema, StatusBatchItemResultSchema, SummarySchema, DisambiguationErrorSchema → shared schema contract tests GREEN

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Mark Items Complete (Priority: P1) 🎯 MVP

**Goal**: Complete tasks/projects individually or in batch (1-100) with optional completion date

**Independent Test**: Create a task, mark it complete via `mark_complete`, verify status changes to Completed. Test with batch of 3 items where one doesn't exist — verify partial success.

**References**: FR-001 (complete with optional date), FR-004 (batch 1-100), FR-005 (per-item results), FR-006 (ID/name lookup), FR-011 (repeating task clone), FR-012 (idempotent)

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T007 [P] [US1] Write contract tests for MarkCompleteInputSchema (items array `.min(1).max(100)`, optional completionDate as ISO 8601 string, ItemIdentifier elements), MarkCompleteSuccessSchema (results array, summary object), MarkCompleteErrorSchema (catastrophic error), MarkCompleteResponseSchema (discriminated union) in `tests/contract/status-tools/mark-complete.test.ts` → verify FAILS
- [x] T008 [P] [US1] Write unit tests for markComplete primitive: success case (single task), batch with partial failure (NOT_FOUND item), disambiguation (DISAMBIGUATION_REQUIRED with candidates), idempotent no-op (ALREADY_COMPLETED code with `success: true`), optional completionDate parameter, project completion, batch with duplicate identifiers (second occurrence returns ALREADY_COMPLETED no-op per spec §Edge Cases §5) in `tests/unit/status-tools/markComplete.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T009 [US1] Implement MarkCompleteInputSchema, MarkCompleteSuccessSchema, MarkCompleteErrorSchema, MarkCompleteResponseSchema in `src/contracts/status-tools/mark-complete.ts` → contract tests GREEN
- [x] T010 [US1] Implement markComplete primitive with OmniJS script generation (item lookup by ID/name, disambiguation, markComplete(date), ALREADY_COMPLETED no-op, batch results at original indices) in `src/tools/primitives/markComplete.ts` → unit tests GREEN
- [x] T011 [US1] Implement markComplete definition handler (import contract schema, call primitive, format batch results for human-readable MCP text output, handle catastrophic errors with logger) in `src/tools/definitions/markComplete.ts`
- [x] T012 [US1] Register `mark_complete` tool in `src/server.ts` (import as namespace, add `server.tool()` call with snake_case name, description, schema.shape, handler)

### 🔵 REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [x] T013 [US1] Verify OmniJS script in OmniFocus Script Editor: complete a test task, complete with backdate, verify ALREADY_COMPLETED idempotency, verify repeating task clone behavior (complete a repeating task, confirm clone created and original continues per FR-011 / research.md §5)

**Checkpoint**: mark_complete is fully functional — can complete tasks/projects with batch support

---

## Phase 4: User Story 2 — Reopen Completed/Dropped Items (Priority: P2)

**Goal**: Reopen items regardless of whether they were completed or dropped — tool auto-detects state

**Independent Test**: Complete a task then mark_incomplete — verify returns to Available. Drop a task then mark_incomplete — verify also returns to Available. The user doesn't need to know the internal mechanism difference.

**References**: FR-002 (reopen completed/dropped with auto-detection), FR-004 (batch), FR-005 (per-item results), FR-006 (ID/name lookup), FR-012 (idempotent)

### 🔴 RED Phase - Tests First (REQUIRED)

- [x] T014 [P] [US2] Write contract tests for MarkIncompleteInputSchema (items array `.min(1).max(100)`), MarkIncompleteSuccessSchema, MarkIncompleteResponseSchema in `tests/contract/status-tools/mark-incomplete.test.ts` → verify FAILS
- [x] T015 [P] [US2] Write unit tests for markIncomplete primitive: reopen completed task (uses markIncomplete()), reopen dropped task (uses `active = true`), reopen completed project (uses markIncomplete()), reopen dropped project (uses `status = Active`), idempotent ALREADY_ACTIVE no-op, batch with mixed states in `tests/unit/status-tools/markIncomplete.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [x] T016 [US2] Implement MarkIncompleteInputSchema, MarkIncompleteSuccessSchema, MarkIncompleteErrorSchema, MarkIncompleteResponseSchema in `src/contracts/status-tools/mark-incomplete.ts` → contract tests GREEN
- [x] T017 [US2] Implement markIncomplete primitive with OmniJS script generation (state detection: task.completed → markIncomplete(), task.dropDate → active=true, project.status=Done → markIncomplete(), project.status=Dropped → status=Active, already active → ALREADY_ACTIVE no-op) in `src/tools/primitives/markIncomplete.ts` → unit tests GREEN
- [x] T018 [US2] Implement markIncomplete definition handler in `src/tools/definitions/markIncomplete.ts`
- [x] T019 [US2] Register `mark_incomplete` tool in `src/server.ts`

### 🔵 REFACTOR Phase - Polish

- [x] T020 [US2] Verify OmniJS script in Script Editor: reopen a completed task, reopen a dropped task, verify both return to Available state

**Checkpoint**: mark_incomplete handles both completed and dropped items transparently

---

## Phase 5: User Story 3 — Drop Items (Priority: P2)

**Goal**: Drop tasks/projects (preserve in database, remove from active views) with v3.8+ version detection and allOccurrences control for repeating tasks

**Independent Test**: Drop a task, verify it has a dropDate and no longer appears in active views. Test version detection by mocking old version response.

**References**: FR-003 (drop with allOccurrences), FR-004 (batch), FR-005 (per-item results), FR-006 (ID/name lookup), FR-010 (version error), FR-012 (idempotent)

### 🔴 RED Phase - Tests First (REQUIRED)

- [x] T021 [P] [US3] Write contract tests for DropItemsInputSchema (items array, optional `allOccurrences` boolean defaulting to `true`), DropItemsSuccessSchema, DropItemsResponseSchema in `tests/contract/status-tools/drop-items.test.ts` → verify FAILS
- [x] T022 [P] [US3] Write unit tests for dropItems primitive: drop task (calls `task.drop(allOccurrences)`), drop project (sets `status = Dropped`, ignores allOccurrences), version check failure (VERSION_NOT_SUPPORTED as catastrophic error), idempotent ALREADY_DROPPED no-op, allOccurrences=false for repeating tasks in `tests/unit/status-tools/dropItems.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [x] T023 [US3] Implement DropItemsInputSchema (allOccurrences with `.default(true)`), DropItemsSuccessSchema, DropItemsErrorSchema, DropItemsResponseSchema in `src/contracts/status-tools/drop-items.ts` → contract tests GREEN
- [x] T024 [US3] Implement dropItems primitive with OmniJS script generation (fail-fast version check via `app.userVersion.atLeast(new Version("3.8"))`, task.drop(allOccurrences) for tasks, project.status=Dropped for projects, ALREADY_DROPPED no-op) in `src/tools/primitives/dropItems.ts` → unit tests GREEN
- [x] T025 [US3] Implement dropItems definition handler in `src/tools/definitions/dropItems.ts`
- [x] T026 [US3] Register `drop_items` tool in `src/server.ts`

### 🔵 REFACTOR Phase - Polish

- [x] T027 [US3] Verify OmniJS script in Script Editor: drop a task, drop a project, verify version detection error message format

**Checkpoint**: drop_items handles tasks (v3.8+ drop()) and projects (status assignment) with version detection

---

## Phase 6: User Story 4 — Set Project Type (Priority: P3)

**Goal**: Set project type to sequential, parallel, or single-actions with mutual exclusion (single-actions wins)

**Independent Test**: Create a parallel project with 3 tasks, set to sequential, verify only first task shows as Next.

**References**: FR-007 (project type with mutual exclusion), FR-006 (ID/name lookup); Data-model §SetProjectTypeInput mutual exclusion table

### 🔴 RED Phase - Tests First (REQUIRED)

- [x] T028 [P] [US4] Write contract tests for SetProjectTypeInputSchema (inline id/name with conditional requirement, projectType enum `'sequential' | 'parallel' | 'single-actions'`), SetProjectTypeSuccessSchema (includes resolved sequential + containsSingletonActions booleans), SetProjectTypeResponseSchema, including DisambiguationErrorSchema from `shared/disambiguation.ts` in error union in `tests/contract/status-tools/set-project-type.test.ts` → verify FAILS
- [x] T029 [P] [US4] Write unit tests for setProjectType primitive: set sequential (sequential=true, containsSingletonActions=false), set parallel (both false), set single-actions (containsSingletonActions=true, sequential=false), project not found, disambiguation, project-only validation in `tests/unit/status-tools/setProjectType.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [x] T030 [US4] Implement SetProjectTypeInputSchema (projectType as `z.enum(['sequential', 'parallel', 'single-actions'])`), SetProjectTypeSuccessSchema, SetProjectTypeErrorSchema (import DisambiguationErrorSchema from shared), SetProjectTypeResponseSchema in `src/contracts/status-tools/set-project-type.ts` → contract tests GREEN
- [x] T031 [US4] Implement setProjectType primitive with OmniJS script generation (project lookup by ID/name, mutual exclusion switch, return resolved boolean flags) in `src/tools/primitives/setProjectType.ts` → unit tests GREEN
- [x] T032 [US4] Implement setProjectType definition handler in `src/tools/definitions/setProjectType.ts`
- [x] T033 [US4] Register `set_project_type` tool in `src/server.ts`

### 🔵 REFACTOR Phase - Polish

- [x] T034 [US4] Verify OmniJS script in Script Editor: set project to each type, verify mutual exclusion behavior

**Checkpoint**: set_project_type changes project ordering with correct mutual exclusion

---

## Phase 7: User Story 5 — Get Next Task (Priority: P3)

**Goal**: Query the next available task in a project with distinct responses for "no tasks" vs "single-actions project"

**Independent Test**: Create sequential project with 3 tasks, get_next_task returns first. Complete first task, get_next_task returns second.

**References**: FR-008 (next task query with disambiguation of null cases), FR-006 (ID/name lookup); Data-model §GetNextTaskSuccess discriminated by hasNext

### 🔴 RED Phase - Tests First (REQUIRED)

- [x] T035 [P] [US5] Write contract tests for GetNextTaskInputSchema (inline id/name), GetNextTaskSuccessSchema (discriminated by hasNext: true → task details, false → reason code), GetNextTaskResponseSchema, including DisambiguationErrorSchema from `shared/disambiguation.ts` in error union in `tests/contract/status-tools/get-next-task.test.ts` → verify FAILS
- [x] T036 [P] [US5] Write unit tests for getNextTask primitive: sequential project with available task (returns full TaskDetails), all tasks completed (NO_AVAILABLE_TASKS reason), single-actions project (SINGLE_ACTIONS_PROJECT reason checked before nextTask), parallel project (returns first available), disambiguation in `tests/unit/status-tools/getNextTask.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [x] T037 [US5] Implement GetNextTaskInputSchema, GetNextTaskSuccessSchema (with hasNext discriminant, TaskDetails type reusing get_task field pattern), GetNextTaskErrorSchema (import DisambiguationErrorSchema from shared), GetNextTaskResponseSchema in `src/contracts/status-tools/get-next-task.ts` → contract tests GREEN
- [x] T038 [US5] Implement getNextTask primitive with OmniJS script generation (project lookup, check containsSingletonActions FIRST → SINGLE_ACTIONS_PROJECT, then project.nextTask → null means NO_AVAILABLE_TASKS, non-null returns full task details) in `src/tools/primitives/getNextTask.ts` → unit tests GREEN
- [x] T039 [US5] Implement getNextTask definition handler in `src/tools/definitions/getNextTask.ts`
- [x] T040 [US5] Register `get_next_task` tool in `src/server.ts`

### 🔵 REFACTOR Phase - Polish

- [x] T041 [US5] Verify OmniJS script in Script Editor: get next task from sequential project, verify null disambiguation

**Checkpoint**: get_next_task returns full task details or distinct reason codes

---

## Phase 8: User Story 6 — Set Floating Timezone (Priority: P4)

**Goal**: Enable/disable floating timezone on tasks and projects so dates follow device timezone when traveling

**Independent Test**: Set floating timezone on a task with a due date, verify `shouldUseFloatingTimeZone` changes.

**References**: FR-009 (floating TZ on tasks AND projects), FR-006 (ID/name lookup); Data-model §SetFloatingTimezoneInput

### 🔴 RED Phase - Tests First (REQUIRED)

- [x] T042 [P] [US6] Write contract tests for SetFloatingTimezoneInputSchema (inline id/name, required boolean `enabled`), SetFloatingTimezoneSuccessSchema (includes itemType `'task' | 'project'`), SetFloatingTimezoneResponseSchema, including DisambiguationErrorSchema from `shared/disambiguation.ts` in error union in `tests/contract/status-tools/set-floating-timezone.test.ts` → verify FAILS
- [x] T043 [P] [US6] Write unit tests for setFloatingTimezone primitive: enable on task, enable on project, disable, item not found, disambiguation, task with no dates (setting applied, takes effect when dates assigned) in `tests/unit/status-tools/setFloatingTimezone.test.ts` → verify FAILS

### 🟢 GREEN Phase - Implementation

- [x] T044 [US6] Implement SetFloatingTimezoneInputSchema, SetFloatingTimezoneSuccessSchema (with itemType literal union), SetFloatingTimezoneErrorSchema (import DisambiguationErrorSchema from shared), SetFloatingTimezoneResponseSchema in `src/contracts/status-tools/set-floating-timezone.ts` → contract tests GREEN
- [x] T045 [US6] Implement setFloatingTimezone primitive with OmniJS script generation (item lookup for task or project, set `shouldUseFloatingTimeZone = enabled`, return item details with itemType) in `src/tools/primitives/setFloatingTimezone.ts` → unit tests GREEN
- [x] T046 [US6] Implement setFloatingTimezone definition handler in `src/tools/definitions/setFloatingTimezone.ts`
- [x] T047 [US6] Register `set_floating_timezone` tool in `src/server.ts`

### 🔵 REFACTOR Phase - Polish

- [x] T048 [US6] Verify OmniJS script in Script Editor: enable/disable floating timezone on task and project

**Checkpoint**: set_floating_timezone controls timezone behavior on tasks and projects

---

## Phase 9: Integration & Polish

**Purpose**: Cross-cutting concerns, barrel exports, full verification

- [x] T049 Create `src/contracts/status-tools/index.ts` barrel export re-exporting all 6 tool contracts + shared schemas (following review-tools/index.ts pattern)
- [x] T050 Scaffold integration test `tests/integration/status-tools/status-workflow.integration.test.ts` as `describe.skip` (requires live OmniFocus) — following review-tools pattern (`review-workflow.integration.test.ts`). Cover round-trip: mark_complete → mark_incomplete → drop_items lifecycle on a test task
- [x] T051 Run full test suite: `pnpm test` → all existing (1924) + new status-tools tests pass
- [x] T052 Run typecheck: `pnpm typecheck` → clean
- [x] T053 Run lint: `pnpm biome check ./src ./tests` → 0 errors
- [x] T054 Run build: `pnpm build` → clean (ESM + CJS)
- [x] T055 Update CLAUDE.md Recent Changes section with Phase 13 status-tools summary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundation (Phase 2) completion
  - All 6 user stories can proceed in parallel after Foundation
  - Or sequentially in priority order: US1(P1) → US2(P2) → US3(P2) → US4(P3) → US5(P3) → US6(P4)
- **Integration (Phase 9)**: Depends on all 6 user stories being complete

### User Story Dependencies

- **US1 Mark Complete (P1)**: Foundation only — no cross-story dependencies
- **US2 Mark Incomplete (P2)**: Foundation only — no cross-story dependencies
- **US3 Drop Items (P2)**: Foundation only — no cross-story dependencies
- **US4 Set Project Type (P3)**: Foundation only — no cross-story dependencies (single-item, no batch)
- **US5 Get Next Task (P3)**: Foundation only — no cross-story dependencies (single-item, no batch)
- **US6 Set Floating Timezone (P4)**: Foundation only — no cross-story dependencies (single-item, no batch)

### TDD Order Within Each User Story (MANDATORY)

```text
1. 🔴 RED: Write failing tests
   - Contract tests for schemas
   - Unit tests for primitives
   - Run `pnpm test` → verify tests FAIL

2. 🟢 GREEN: Implement minimum code
   - Contract schemas first (Zod schemas)
   - Primitives second (OmniJS business logic)
   - Definitions third (MCP handler wrapper)
   - Server registration (tool goes live)
   - Run `pnpm test` → tests turn GREEN

3. 🔵 REFACTOR: Clean up
   - Improve code quality
   - Run `pnpm test` → tests stay GREEN
   - Manual OmniFocus verification (last)
```

### Parallel Opportunities

- Foundation: T003 + T004 + T005 can run in parallel (different files)
- Within each user story: RED tests (contract + unit) can run in parallel
- **Cross-story parallelism**: After Foundation (Phase 2), ALL 6 user stories can execute in parallel since they:
  - Write to different contract files (`mark-complete.ts` vs `drop-items.ts` vs ...)
  - Write to different primitive files (`markComplete.ts` vs `dropItems.ts` vs ...)
  - Write to different definition files
  - Write to different test files
  - Only share `server.ts` for registration (append-only, non-conflicting imports)

---

## TDD Parallel Example: Batch Tools (US1 + US2 + US3)

```bash
# After Foundation (Phase 2) completes:

# Agent A: US1 Mark Complete
Task: "T007 [P] [US1] Write contract tests → FAILS"
Task: "T008 [P] [US1] Write unit tests → FAILS"
Task: "T009-T012 Implementation → GREEN"
Task: "T013 Manual verification"

# Agent B: US2 Mark Incomplete (parallel with Agent A)
Task: "T014 [P] [US2] Write contract tests → FAILS"
Task: "T015 [P] [US2] Write unit tests → FAILS"
Task: "T016-T019 Implementation → GREEN"
Task: "T020 Manual verification"

# Agent C: US3 Drop Items (parallel with Agents A+B)
Task: "T021 [P] [US3] Write contract tests → FAILS"
Task: "T022 [P] [US3] Write unit tests → FAILS"
Task: "T023-T026 Implementation → GREEN"
Task: "T027 Manual verification"
```

## TDD Parallel Example: Single-Item Tools (US4 + US5 + US6)

```bash
# After Foundation (Phase 2) completes (can run alongside batch tools):

# Agent D: US4 Set Project Type
Task: "T028-T029 RED → T030-T033 GREEN → T034 REFACTOR"

# Agent E: US5 Get Next Task
Task: "T035-T036 RED → T037-T040 GREEN → T041 REFACTOR"

# Agent F: US6 Set Floating Timezone
Task: "T042-T043 RED → T044-T047 GREEN → T048 REFACTOR"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 Mark Complete (following TDD cycle)
4. **STOP and VALIDATE**: All tests GREEN, manual verification passes
5. `mark_complete` is immediately usable as a standalone tool

### Incremental Delivery

1. Setup + Foundation → Shared schemas ready
2. US1 Mark Complete → TDD → All GREEN → Deploy (MVP!)
3. US2 Mark Incomplete → TDD → All GREEN → Deploy
4. US3 Drop Items → TDD → All GREEN → Deploy
5. US4-US6 → TDD → All GREEN → Deploy (full feature)
6. Integration → Polish → PR

### Maximum Parallelism Strategy

With 6 parallel agents after Foundation:

1. Foundation completes (5 tasks, ~30 min)
2. Launch 6 agents simultaneously (US1-US6)
3. Each agent completes ~7 tasks independently (~1-2 hrs each)
4. Integration phase validates everything together

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 55 |
| **Phases** | 9 (Setup, Foundation, US1-US6, Integration) |
| **Tasks per User Story** | 7 each (2 RED + 4 GREEN + 1 REFACTOR) |
| **Foundation Tasks** | 6 (1 setup + 5 shared schemas incl. disambiguation) |
| **Integration Tasks** | 7 (barrel export + integration scaffold + 4 verification + CLAUDE.md) |
| **Parallel Opportunities** | 6 user stories can run simultaneously after Foundation |
| **User Stories Covered** | 6/6 (US1-US6 from spec.md) |
| **Functional Requirements Covered** | FR-001 through FR-012 (all 12) |
| **MVP Scope** | US1 Mark Complete (Phase 1-3, 13 tasks) |

## Analysis Remediations Applied

| ID | Finding | Remediation |
|----|---------|-------------|
| C1 | Plan references `tests/integration/status-tools/` but no task created it | Added T050: scaffold integration test as `describe.skip` following `review-workflow.integration.test.ts` pattern; added `tests/integration/status-tools/` to T001 directory creation |
| C2 | FR-011 (repeating task clone) not explicitly in any test task | Amended T013: added "verify repeating task clone behavior" to Script Editor verification, referencing FR-011 and research.md §5 |
| C3 | Duplicate-in-batch edge case (spec §Edge Cases §5) had no explicit test | Amended T008: added "batch with duplicate identifiers (second occurrence returns ALREADY_COMPLETED no-op)" to unit test scenarios |
| C4 | T002 had unnecessary `[P]` marker (sole RED task in Phase 2) | Removed `[P]` from T002 |
| C5 | Single-item tools needed DisambiguationErrorSchema but no task specified creating it | Added T005: create `shared/disambiguation.ts` following per-domain pattern (confirmed identical schema exists in task-tools, project-tools, tag-tools, folder-tools); updated T028/T030/T035/T037/T042/T044 to reference importing from shared |
