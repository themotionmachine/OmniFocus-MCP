# Tasks: TaskPaper Import/Export

**Input**: Design documents from `/specs/012-taskpaper/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD approach -- contract and unit tests are included per the specification's TDD requirement (Constitution X).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundation (Shared Schemas & Contracts Infrastructure)

**Purpose**: Create all Zod schemas, shared types, and barrel exports that every tool depends on. No business logic yet.

- [ ] T001 [P] Create shared validation types (ParsedItem, ValidationSummary, ValidationWarning) in src/contracts/taskpaper-tools/shared/validation-types.ts from specs/012-taskpaper/contracts/shared/validation-types.ts
- [ ] T002 [P] Create shared import types (CreatedItem, ImportSummary) in src/contracts/taskpaper-tools/shared/import-types.ts from specs/012-taskpaper/contracts/shared/import-types.ts
- [ ] T003 [P] Create shared export types (TaskpaperStatusFilter, ExportSummary) in src/contracts/taskpaper-tools/shared/export-types.ts from specs/012-taskpaper/contracts/shared/export-types.ts
- [ ] T004 Create shared barrel export in src/contracts/taskpaper-tools/shared/index.ts re-exporting all shared types
- [ ] T005 [P] Create import_taskpaper contract (input/success/error/response schemas) in src/contracts/taskpaper-tools/import-taskpaper.ts from specs/012-taskpaper/contracts/import-taskpaper.ts
- [ ] T006 [P] Create export_taskpaper contract (input with .refine() mutual exclusion, success/error/response schemas) in src/contracts/taskpaper-tools/export-taskpaper.ts from specs/012-taskpaper/contracts/export-taskpaper.ts
- [ ] T007 [P] Create validate_transport_text contract (input/success/error/response schemas) in src/contracts/taskpaper-tools/validate-transport-text.ts from specs/012-taskpaper/contracts/validate-transport-text.ts
- [ ] T008 Create top-level barrel export in src/contracts/taskpaper-tools/index.ts re-exporting all tool contracts and shared types
- [ ] T009 Verify contracts compile with pnpm typecheck (no new source files beyond contracts at this point)

**Checkpoint**: All Zod schemas exist and compile. No runtime code yet.

---

## Phase 2: User Story 1 - Import Transport Text (Priority: P1) -- MVP

**Goal**: Import a transport text string to create tasks/projects in OmniFocus, returning identifiers of every created item. Supports optional target project placement.

**Independent Test**: Pass a multi-line transport text string containing a project with nested tasks, tags, dates, and notes, then verify the correct items are returned with expected hierarchy and metadata. (FR-001, FR-002, FR-008, FR-009, FR-011)

### Contract Tests for US1

> Write these tests FIRST, ensure they FAIL before implementation

- [ ] T010 [P] [US1] Create contract tests for import_taskpaper schemas in tests/contract/taskpaper-tools/import-taskpaper.test.ts -- test InputSchema accepts valid text, rejects empty string (FR-008), validates optional targetProjectId; test ResponseSchema accepts success with items+summary and error variants; test ImportSummary and CreatedItem schemas

### Unit Tests for US1

- [ ] T011 [P] [US1] Create unit tests for importTaskpaper primitive in tests/unit/taskpaper-tools/importTaskpaper.test.ts -- test OmniJS script generation with text-only input (FR-001), script generation with targetProjectId (FR-002), whitespace-only text rejection (FR-008), empty byParsingTransportText result handling, recursive ID collection from nested tasks (FR-001), moveTasks call when targetProjectId provided (FR-002), special character escaping in transport text (FR-009)

### Implementation for US1

- [ ] T012 [US1] Implement importTaskpaper primitive in src/tools/primitives/importTaskpaper.ts -- generate OmniJS script calling Task.byParsingTransportText(text, null), recursive walk of flattenedTasks to collect all created item IDs (FR-001), optional two-phase moveTasks to target project via Project.byIdentifier (FR-002), whitespace-only input guard (FR-008), empty result detection, structured JSON response with items array and ImportSummary
- [ ] T013 [US1] Implement importTaskpaper definition in src/tools/definitions/importTaskpaper.ts -- MCP handler using ImportTaskpaperInputSchema for validation, calls importTaskpaper primitive, formats response as MCP content, tool description with WARNING: prefix about non-atomic undo (FR-011)
- [ ] T014 [US1] Run tests for US1: pnpm test tests/contract/taskpaper-tools/import-taskpaper.test.ts tests/unit/taskpaper-tools/importTaskpaper.test.ts and verify all pass

**Checkpoint**: import_taskpaper primitive and definition complete. Contract and unit tests pass. Tool is independently functional.

---

## Phase 3: User Story 2 - Export Tasks to Transport Text (Priority: P2)

**Goal**: Export a project, folder, or set of task IDs to a transport text string with full metadata fidelity.

**Independent Test**: Export an existing project and verify the resulting transport text accurately represents task names, hierarchy, tags, dates, flags, estimates, and notes. (FR-003, FR-004, FR-005, FR-009, FR-010)

### Contract Tests for US2

- [ ] T015 [P] [US2] Create contract tests for export_taskpaper schemas in tests/contract/taskpaper-tools/export-taskpaper.test.ts -- test InputSchema accepts projectId-only, folderId-only, taskIds-only; test .refine() rejects zero scopes, rejects multiple scopes; test taskIds bounds (1-100); test status filter default and enum values; test ResponseSchema success with transportText+summary+warnings and error variant; test ExportSummary schema

### Unit Tests for US2

- [ ] T016 [P] [US2] Create unit tests for exportTaskpaper primitive in tests/unit/taskpaper-tools/exportTaskpaper.test.ts -- test OmniJS script generation for project scope (FR-003), folder scope with recursive traversal (FR-004), taskIds scope with input-order preservation (FR-005), status filter application (FR-003), date formatting as yyyy-MM-dd using local timezone components, estimate conversion (minutes to human-readable duration string), @done(date) emission for completed items, @tags() serialization, // note serialization (multi-line), empty project export (project header only), item-not-found error handling, empty-name task handling, warnings array for non-fatal issues

### Implementation for US2

- [ ] T017 [US2] Create shared token-to-property mapping constants in src/tools/primitives/taskpaper/token-map.ts -- define TaskPaperTokenMapping interface and TASKPAPER_TOKENS constant array covering all recognized tokens (@defer, @due, @done, @estimate, @flagged, @tags, @autodone, @parallel, @repeat-method, @repeat-rule) with valueType metadata (FR-006, FR-009, FR-010). NOTE: Also consumed by US3 (validate_transport_text) for token recognition.
- [ ] T018 [US2] Implement exportTaskpaper primitive in src/tools/primitives/exportTaskpaper.ts -- generate OmniJS script with custom serializer: resolve scope (Project.byIdentifier / Folder.byIdentifier / Task.byIdentifier for each ID), recursive traversal via task.tasks preserving hierarchy (FR-003, FR-004), input-order for taskIds (FR-005), status filtering (FR-003), date formatting yyyy-MM-dd with getFullYear/getMonth/getDate (local timezone), estimate conversion, @done(date) for completed, @tags(), // notes, tab indentation, ExportSummary computation, warnings array for edge cases. CONSTRAINT: Must NOT use document.makeFileWrapper (async/Promise-based, exports entire database, not scoped -- per spec Assumptions).
- [ ] T019 [US2] Implement exportTaskpaper definition in src/tools/definitions/exportTaskpaper.ts -- MCP handler using ExportTaskpaperInputSchema for validation (including .refine() mutual exclusion), calls exportTaskpaper primitive, formats response as MCP content
- [ ] T020 [US2] Run tests for US2: pnpm test tests/contract/taskpaper-tools/export-taskpaper.test.ts tests/unit/taskpaper-tools/exportTaskpaper.test.ts and verify all pass

**Checkpoint**: export_taskpaper primitive and definition complete. Contract and unit tests pass. Round-trip fidelity can be manually verified.

---

## Phase 4: User Story 3 - Validate Transport Text (Priority: P3)

**Goal**: Parse and validate a transport text string without modifying OmniFocus, returning a structured dry-run report.

**Independent Test**: Pass various transport text strings (valid, malformed, empty) and verify the returned report accurately lists items, hierarchy, tags, dates, and syntax warnings -- all without touching OmniFocus. (FR-006, FR-007, FR-008)

### Contract Tests for US3

- [ ] T021 [P] [US3] Create contract tests for validate_transport_text schemas in tests/contract/taskpaper-tools/validate-transport-text.test.ts -- test InputSchema accepts any non-empty string including whitespace-only (validator returns zero-item report, not error); test ResponseSchema success with items+summary+warnings and error variant; test ParsedItem recursive schema with children; test ValidationSummary and ValidationWarning schemas

### Unit Tests for US3

- [ ] T022 [P] [US3] Create unit tests for validateTransportText primitive in tests/unit/taskpaper-tools/validateTransportText.test.ts -- test parsing of task lines (- prefix), project headers (Name:), tab indentation depth, @tags() extraction, @due/@defer/@done date extraction, @flagged detection, @estimate() duration extraction, // note extraction, ::ProjectName reference extraction (FR-006), unrecognized syntax warning generation with line numbers (FR-007), empty/whitespace-only input returns zero-item report (FR-008), mixed indentation (tabs vs spaces) warning, deeply nested hierarchy parsing, multi-line notes, @autodone/@parallel/@repeat-* recognized without warning (FR-006), special characters in names (Unicode, emoji), summary count computation (tasks, projects, unique tags, maxDepth)

### Implementation for US3

- [ ] T023 [US3] Implement validateTransportText primitive in src/tools/primitives/validateTransportText.ts -- pure TypeScript parser (NO executeOmniFocusScript): parse lines into ParsedItem tree using tab depth, extract tokens using shared token-map.ts constants, build children array by indentation nesting, compute ValidationSummary (task/project counts, unique tags, maxDepth), generate ValidationWarning for unrecognized syntax with line numbers (FR-007), handle empty/whitespace-only input as zero-item success (FR-008), recognize full token set including @autodone/@parallel/@repeat-* (FR-006)
- [ ] T024 [US3] Implement validateTransportText definition in src/tools/definitions/validateTransportText.ts -- MCP handler using ValidateTransportTextInputSchema for validation, calls validateTransportText primitive, formats response as MCP content
- [ ] T025 [US3] Run tests for US3: pnpm test tests/contract/taskpaper-tools/validate-transport-text.test.ts tests/unit/taskpaper-tools/validateTransportText.test.ts and verify all pass

**Checkpoint**: validate_transport_text is fully functional. All 3 tools now have working primitives and definitions.

---

## Phase 5: Server Registration, Integration & Polish

**Purpose**: Register all 3 tools in server.ts, run full test suite, verify build, format, and lint.

- [ ] T026 Register import_taskpaper tool in src/server.ts with WARNING: prefix in description about non-atomic undo (FR-011), import definition from src/tools/definitions/importTaskpaper.ts
- [ ] T027 Register export_taskpaper tool in src/server.ts, import definition from src/tools/definitions/exportTaskpaper.ts
- [ ] T028 Register validate_transport_text tool in src/server.ts, import definition from src/tools/definitions/validateTransportText.ts
- [ ] T029 Run full test suite: pnpm test -- verify all existing 4021+ tests still pass plus all new taskpaper-tools tests
- [ ] T030 Run pnpm build and verify clean compilation with no errors
- [ ] T031 Run pnpm lint and pnpm format to verify Biome compliance across all new files
- [ ] T032 Run pnpm typecheck to verify no type errors across the full codebase
- [ ] T033 Verify all text files end with a newline (project convention)

**Checkpoint**: All 3 tools registered, full test suite green, build/lint/typecheck clean.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundation)**: No dependencies -- can start immediately
- **Phase 2 (US1 - Import)**: Depends on Phase 1 completion (needs contracts)
- **Phase 3 (US2 - Export)**: Depends on Phase 1 completion (needs contracts). Can run in parallel with Phase 2.
- **Phase 4 (US3 - Validate)**: Depends on Phase 1 completion (needs contracts) and Phase 3 T017 (shared token-map.ts). Can run in parallel with Phase 2.
- **Phase 5 (Polish)**: Depends on Phases 2, 3, and 4 completion

### User Story Dependencies

- **US1 (Import, P1)**: Can start after Phase 1. No dependencies on other stories.
- **US2 (Export, P2)**: Can start after Phase 1. No dependencies on US1. Creates token-map.ts used by US3.
- **US3 (Validate, P3)**: Can start after Phase 1 + T017 (token-map.ts from US2). Otherwise independent.

### Within Each User Story

- Contract tests MUST be written and FAIL before implementation
- Unit tests MUST be written and FAIL before implementation
- Primitives before definitions (definitions call primitives)
- Run tests after implementation to verify green

### Parallel Opportunities

- T001, T002, T003 can all run in parallel (different shared type files)
- T005, T006, T007 can all run in parallel (different tool contract files)
- T010, T011 can run in parallel with T015, T016 and T021, T022 (different test files)
- US1 (Phase 2) and US2 (Phase 3) can run in parallel after Phase 1
- US3 (Phase 4) can start after T017 from US2 is complete

---

## Parallel Example: Phase 1

```bash
# Launch all shared type files together:
Task T001: "Create shared validation types in src/contracts/taskpaper-tools/shared/validation-types.ts"
Task T002: "Create shared import types in src/contracts/taskpaper-tools/shared/import-types.ts"
Task T003: "Create shared export types in src/contracts/taskpaper-tools/shared/export-types.ts"

# Then launch all tool contracts together:
Task T005: "Create import_taskpaper contract in src/contracts/taskpaper-tools/import-taskpaper.ts"
Task T006: "Create export_taskpaper contract in src/contracts/taskpaper-tools/export-taskpaper.ts"
Task T007: "Create validate_transport_text contract in src/contracts/taskpaper-tools/validate-transport-text.ts"
```

## Parallel Example: US1 + US2 After Phase 1

```bash
# These can run simultaneously after Phase 1:
Stream A (US1): T010 → T011 → T012 → T013 → T014
Stream B (US2): T015 → T016 → T017 → T018 → T019 → T020
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundation (shared schemas + contracts)
2. Complete Phase 2: User Story 1 (import_taskpaper)
3. **STOP and VALIDATE**: Contract + unit tests pass, tool independently functional
4. This alone delivers the primary AI-assistant bulk-creation use case

### Incremental Delivery

1. Foundation (Phase 1) -- All schemas ready
2. US1 Import (Phase 2) -- MVP: AI can bulk-create task hierarchies
3. US2 Export (Phase 3) -- Round-trip: data portability and archiving
4. US3 Validate (Phase 4) -- Safety net: preview before import
5. Polish (Phase 5) -- Server registration, full suite verification

### FR Coverage

| FR | Description | Task(s) |
|----|-------------|---------|
| FR-001 | Import creates all items, returns all IDs (recursive) | T010, T011, T012, T013 |
| FR-002 | Optional target project placement | T011, T012 |
| FR-003 | Export by project ID with metadata | T015, T016, T018, T019 |
| FR-004 | Export by folder ID (recursive) | T016, T018 |
| FR-005 | Export by task IDs (1-100, input order) | T015, T016, T018 |
| FR-006 | Validate returns parsed items, summary, warnings | T017, T021, T022, T023, T024 |
| FR-007 | Warnings for unrecognized/malformed syntax | T022, T023 |
| FR-008 | Reject empty/whitespace-only input (import only; validate returns zero-item report) | T010, T011, T012 |
| FR-009 | Handle full metadata set | T011, T012, T016, T017, T018 |
| FR-010 | Document non-representable properties | T017 |
| FR-011 | WARNING: prefix for non-atomic undo | T013, T026 |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing (TDD: Red-Green-Refactor)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- validate_transport_text primitive has NO executeOmniFocusScript call -- pure TypeScript only
