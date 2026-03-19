# Tasks: SPEC-008 Perspectives

**Input**: Design documents from `/specs/008-perspectives/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Contracts in `src/contracts/perspective-tools/`
- Primitives in `src/tools/primitives/`
- Definitions in `src/tools/definitions/`
- Contract tests in `tests/contract/perspective-tools/`
- Unit tests in `tests/unit/perspective-tools/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, shared schemas, and contract file creation

- [ ] T001 Create directory structure: `src/contracts/perspective-tools/shared/`, `tests/contract/perspective-tools/`, `tests/unit/perspective-tools/`
- [ ] T002 [P] Copy shared schema `specs/008-perspectives/contracts/shared/perspective-identifier.ts` to `src/contracts/perspective-tools/shared/perspective-identifier.ts`
- [ ] T003 [P] Copy shared schema `specs/008-perspectives/contracts/shared/perspective-summary.ts` to `src/contracts/perspective-tools/shared/perspective-summary.ts`
- [ ] T004 [P] Copy shared barrel `specs/008-perspectives/contracts/shared/index.ts` to `src/contracts/perspective-tools/shared/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: All tool-specific contracts must be in place before any TDD RED phase can begin. Also audit legacy files to confirm migration targets.

- [ ] T005 [P] Copy contract `specs/008-perspectives/contracts/list-perspectives.ts` to `src/contracts/perspective-tools/list-perspectives.ts`
- [ ] T006 [P] Copy contract `specs/008-perspectives/contracts/get-perspective.ts` to `src/contracts/perspective-tools/get-perspective.ts`
- [ ] T007 [P] Copy contract `specs/008-perspectives/contracts/switch-perspective.ts` to `src/contracts/perspective-tools/switch-perspective.ts`
- [ ] T008 [P] Copy contract `specs/008-perspectives/contracts/export-perspective.ts` to `src/contracts/perspective-tools/export-perspective.ts`
- [ ] T009 [P] Copy contract `specs/008-perspectives/contracts/set-perspective-icon.ts` to `src/contracts/perspective-tools/set-perspective-icon.ts`
- [ ] T010 Copy barrel export `specs/008-perspectives/contracts/index.ts` to `src/contracts/perspective-tools/index.ts`
- [ ] T011 Audit legacy files to confirm deletion targets exist: `src/tools/definitions/listPerspectives.ts`, `src/tools/definitions/getPerspectiveView.ts`, `src/tools/primitives/listPerspectives.ts`, `src/tools/primitives/getPerspectiveView.ts`, and `OmnifocusPerspective` interface in `src/types.ts`
- [ ] T012 Run `pnpm build` to verify contracts compile without errors

**Checkpoint**: All contracts in place, build passes. TDD RED phases can now begin.

---

## Phase 3: User Story 1 - List All Perspectives (Priority: P1) -- MVP

**Goal**: Replace legacy `list_perspectives` with enhanced implementation returning identifiers, metadata, and filter aggregation for custom perspectives. Supports `type` filter enum ("all"/"builtin"/"custom").

**Independent Test**: Call `list_perspectives` and verify it returns both built-in and custom perspectives with correct identifiers, sorted alphabetically by name within type groups, with `totalCount` matching array length.

**Acceptance**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-040, FR-041, FR-043

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T013 [P] [US1] Write shared contract tests for PerspectiveIdentifierSchema, PerspectiveListItemSchema, PerspectiveTypeSchema, and BUILT_IN_PERSPECTIVE_NAMES in `tests/contract/perspective-tools/shared.contract.test.ts` -- verify FAILS
- [ ] T014 [P] [US1] Write contract tests for ListPerspectivesInputSchema, ListPerspectivesSuccessSchema, ListPerspectivesErrorSchema, and ListPerspectivesResponseSchema in `tests/contract/perspective-tools/list-perspectives.contract.test.ts` -- verify FAILS
- [ ] T015 [P] [US1] Write unit tests for listPerspectives primitive in `tests/unit/perspective-tools/listPerspectives.test.ts` covering: all perspectives returned (FR-001, FR-002), type filter (FR-003), built-in names (FR-004), custom metadata (FR-005), alphabetical sort within type groups (FR-006), totalCount (FR-007), version-gated filterAggregation null on <v4.2, empty custom list -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T016 [US1] Implement listPerspectives primitive in `src/tools/primitives/listPerspectives.ts` (new file, replaces legacy) -- generates OmniJS script enumerating `Perspective.BuiltIn.*` + `Perspective.Custom.all` with version-gated `archivedTopLevelFilterAggregation` (v4.2+), returns sorted PerspectiveListItem array -- contract and unit tests turn GREEN
- [ ] T017 [US1] Implement listPerspectives definition in `src/tools/definitions/listPerspectives.ts` (new file, replaces legacy) -- imports ListPerspectivesInputSchema from contract, defines MCP tool handler calling primitive -- verify tests still GREEN

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T018 [US1] Run `pnpm build && pnpm test` to verify all tests pass including new US1 tests
- [ ] T019 [US1] Manual verification: test listPerspectives OmniJS script in OmniFocus Script Editor

**Checkpoint**: list_perspectives fully functional and tested. Delivers immediate value for perspective discovery.

---

## Phase 4: User Story 2 - Get Perspective Details (Priority: P1)

**Goal**: New `get_perspective` tool replacing legacy `get_perspective_view`. Returns full perspective metadata including filter rules configuration for custom perspectives and limited metadata for built-in perspectives. Supports lookup by name or identifier with disambiguation.

**Independent Test**: Call `get_perspective` with a known perspective name or identifier and verify it returns complete configuration details including filter rules (custom) or name+type (built-in).

**Acceptance**: FR-009, FR-010, FR-011, FR-012, FR-012a, FR-013, FR-014, FR-015, FR-016, FR-040, FR-041, FR-042, FR-043

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T020 [P] [US2] Write contract tests for GetPerspectiveInputSchema, GetPerspectiveSuccessSchema (CustomPerspectiveDetail and BuiltInPerspectiveDetail variants), GetPerspectiveErrorSchema (NOT_FOUND and DISAMBIGUATION_REQUIRED codes, candidates array), and GetPerspectiveResponseSchema in `tests/contract/perspective-tools/get-perspective.contract.test.ts` -- verify FAILS
- [ ] T021 [P] [US2] Write unit tests for getPerspective primitive in `tests/unit/perspective-tools/getPerspective.test.ts` covering: lookup by name (FR-009, FR-010), lookup by identifier (FR-009, FR-010), custom perspective detail with filter rules (FR-011, FR-012), built-in perspective detail (FR-016), not found error (FR-013), disambiguation with candidates (FR-014, FR-042), version-gated filterRules/filterAggregation null on <v4.2 (FR-012a), identifier precedence over name -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T022 [US2] Implement getPerspective primitive in `src/tools/primitives/getPerspective.ts` -- generates OmniJS script using `Perspective.Custom.byName()`/`byIdentifier()` for custom and case-insensitive name match for built-in, returns CustomPerspectiveDetail or BuiltInPerspectiveDetail, handles NOT_FOUND and DISAMBIGUATION_REQUIRED -- contract and unit tests turn GREEN
- [ ] T023 [US2] Implement getPerspective definition in `src/tools/definitions/getPerspective.ts` -- imports GetPerspectiveInputSchema from contract, defines MCP tool handler calling primitive -- verify tests still GREEN

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T024 [US2] Run `pnpm build && pnpm test` to verify all tests pass including US1 + US2
- [ ] T025 [US2] Manual verification: test getPerspective OmniJS script in OmniFocus Script Editor with custom and built-in perspectives

**Checkpoint**: get_perspective fully functional and tested. Together with US1, covers complete perspective discovery and inspection.

---

## Phase 5: User Story 3 - Switch Active Perspective (Priority: P2)

**Goal**: New `switch_perspective` tool that navigates the frontmost OmniFocus window to the specified perspective. Supports both built-in and custom perspectives. Returns previous perspective name for undo context.

**Independent Test**: Call `switch_perspective` with a valid perspective name and verify the OmniFocus window displays that perspective. Verify error handling for missing perspectives and no open windows.

**Acceptance**: FR-017, FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-024, FR-040, FR-041, FR-042, FR-043

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T026 [P] [US3] Write contract tests for SwitchPerspectiveInputSchema, SwitchPerspectiveSuccessSchema (perspectiveName, previousPerspective, message), SwitchPerspectiveErrorSchema (NOT_FOUND, NO_WINDOW, DISAMBIGUATION_REQUIRED codes, candidates array), and SwitchPerspectiveResponseSchema in `tests/contract/perspective-tools/switch-perspective.contract.test.ts` -- verify FAILS
- [ ] T027 [P] [US3] Write unit tests for switchPerspective primitive in `tests/unit/perspective-tools/switchPerspective.test.ts` covering: switch to custom by name (FR-017, FR-024), switch to custom by identifier (FR-017), switch to built-in (FR-024), no window error (FR-019, FR-020), not found error, idempotent re-switch (FR-023), previous perspective returned (FR-021), disambiguation with candidates (FR-042) -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T028 [US3] Implement switchPerspective primitive in `src/tools/primitives/switchPerspective.ts` -- generates OmniJS script validating `document.windows.length > 0`, captures `document.windows[0].perspective` name as previous, sets `document.windows[0].perspective` to target perspective, returns SwitchPerspectiveSuccess -- contract and unit tests turn GREEN
- [ ] T029 [US3] Implement switchPerspective definition in `src/tools/definitions/switchPerspective.ts` -- imports SwitchPerspectiveInputSchema from contract, includes UI-affecting warning in tool description (FR-022), defines MCP tool handler calling primitive -- verify tests still GREEN

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T030 [US3] Run `pnpm build && pnpm test` to verify all tests pass including US1 + US2 + US3
- [ ] T031 [US3] Manual verification: test switchPerspective OmniJS script in OmniFocus Script Editor, confirm window navigation

**Checkpoint**: switch_perspective fully functional. AI assistants can now navigate OmniFocus to any perspective.

---

## Phase 6: User Story 4 - Export Perspective Configuration (Priority: P3)

**Goal**: New `export_perspective` tool that exports custom perspective configurations. Supports saving to a directory (`.ofocus-perspective` file) or returning export metadata. Only custom perspectives can be exported.

**Independent Test**: Call `export_perspective` on a custom perspective and verify the returned data contains valid exportable configuration metadata. If `saveTo` is provided, verify the file is written.

**Acceptance**: FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032, FR-040, FR-041, FR-042, FR-043

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T032 [P] [US4] Write contract tests for ExportPerspectiveInputSchema (PerspectiveIdentifier + saveTo), ExportPerspectiveFileSuccessSchema, ExportPerspectiveMetadataSuccessSchema, ExportPerspectiveErrorSchema (NOT_FOUND, BUILTIN_NOT_EXPORTABLE, INVALID_DIRECTORY, DISAMBIGUATION_REQUIRED codes), and ExportPerspectiveResponseSchema in `tests/contract/perspective-tools/export-perspective.contract.test.ts` -- verify FAILS
- [ ] T033 [P] [US4] Write unit tests for exportPerspective primitive in `tests/unit/perspective-tools/exportPerspective.test.ts` covering: export metadata without saveTo (FR-027, FR-030), export file with saveTo (FR-028, FR-029), built-in not exportable error (FR-026), not found error (FR-031), invalid directory error (FR-032), disambiguation with candidates -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T034 [US4] Implement exportPerspective primitive in `src/tools/primitives/exportPerspective.ts` -- generates OmniJS script using `perspective.fileWrapper()` for metadata and `writeFileRepresentationIntoDirectory()` for saveTo path, validates BUILTIN_NOT_EXPORTABLE and INVALID_DIRECTORY error codes -- contract and unit tests turn GREEN
- [ ] T035 [US4] Implement exportPerspective definition in `src/tools/definitions/exportPerspective.ts` -- imports ExportPerspectiveInputSchema from contract, defines MCP tool handler calling primitive -- verify tests still GREEN

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T036 [US4] Run `pnpm build && pnpm test` to verify all tests pass including US1-US4
- [ ] T037 [US4] Manual verification: test exportPerspective OmniJS script in OmniFocus Script Editor, verify `.ofocus-perspective` file creation

**Checkpoint**: export_perspective fully functional. Perspective backup and sharing capability available.

---

## Phase 7: User Story 5 - Set Perspective Icon Color (Priority: P3)

**Goal**: New `set_perspective_icon` tool that sets the icon color of a custom perspective. Accepts CSS hex color strings, converts to `Color.RGB()` in OmniJS. Version-gated to OmniFocus v4.5.2+.

**Independent Test**: Call `set_perspective_icon` on a custom perspective with a valid hex color and verify the color changes in OmniFocus. Verify version-gate error on older versions.

**Acceptance**: FR-033, FR-034, FR-035, FR-036, FR-037, FR-038, FR-039, FR-040, FR-041, FR-042, FR-043

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T038 [P] [US5] Write contract tests for SetPerspectiveIconInputSchema (PerspectiveIdentifier + CSS hex color regex validation for #RGB, #RGBA, #RRGGBB, #RRGGBBAA), SetPerspectiveIconSuccessSchema, SetPerspectiveIconErrorSchema (NOT_FOUND, BUILTIN_NOT_MODIFIABLE, VERSION_NOT_SUPPORTED, DISAMBIGUATION_REQUIRED codes), and SetPerspectiveIconResponseSchema in `tests/contract/perspective-tools/set-perspective-icon.contract.test.ts` -- verify FAILS
- [ ] T039 [P] [US5] Write unit tests for setPerspectiveIcon primitive in `tests/unit/perspective-tools/setPerspectiveIcon.test.ts` covering: set color on custom perspective (FR-033, FR-035, FR-037), built-in not modifiable error (FR-034), CSS hex validation and Color.RGB() conversion (FR-036), not found error (FR-038), version-gate v4.5.2+ error (FR-039), disambiguation with candidates, 3/4/6/8 digit hex formats, idempotent overwrite -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T040 [US5] Implement setPerspectiveIcon primitive in `src/tools/primitives/setPerspectiveIcon.ts` -- generates OmniJS script: version-gate `app.userVersion.atLeast(new Version('4.5.2'))`, lookup perspective, validate BUILTIN_NOT_MODIFIABLE, parse CSS hex to RGBA floats in TypeScript, pass pre-computed floats to OmniJS `Color.RGB(r, g, b, a)`, set `perspective.iconColor` -- contract and unit tests turn GREEN
- [ ] T041 [US5] Implement setPerspectiveIcon definition in `src/tools/definitions/setPerspectiveIcon.ts` -- imports SetPerspectiveIconInputSchema from contract, defines MCP tool handler calling primitive -- verify tests still GREEN

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T042 [US5] Run `pnpm build && pnpm test` to verify all tests pass including US1-US5
- [ ] T043 [US5] Manual verification: test setPerspectiveIcon OmniJS script in OmniFocus Script Editor, confirm icon color change

**Checkpoint**: set_perspective_icon fully functional. Visual customization of perspectives is available on v4.5.2+.

---

## Phase 8: Legacy Cleanup & Migration

**Purpose**: Delete legacy files, remove old interfaces, and update server.ts registrations. Migration order: new files are already created (Phases 3-7), now delete old files and update registrations.

- [ ] T044 Delete legacy primitive `src/tools/primitives/listPerspectives.ts` (replaced by new implementation in Phase 3)
- [ ] T045 Delete legacy primitive `src/tools/primitives/getPerspectiveView.ts` (retired, replaced by getPerspective)
- [ ] T046 [P] Delete legacy definition `src/tools/definitions/listPerspectives.ts` (replaced by new implementation in Phase 3)
- [ ] T047 [P] Delete legacy definition `src/tools/definitions/getPerspectiveView.ts` (retired, replaced by getPerspective)
- [ ] T048 Remove `OmnifocusPerspective` interface from `src/types.ts` (superseded by contracts in `src/contracts/perspective-tools/`)
- [ ] T049 Update `src/server.ts`: remove old `list_perspectives` and `get_perspective_view` registrations (imports + `server.tool()` calls), add new registrations for all 5 tools (`list_perspectives`, `get_perspective`, `switch_perspective`, `export_perspective`, `set_perspective_icon`) importing from new definitions
- [ ] T050 Run `pnpm build` to verify no dangling imports after legacy file deletion
- [ ] T051 Run `pnpm test` to verify all existing tests still pass and no regressions from migration

**Checkpoint**: Legacy files deleted, server.ts updated, build and all tests pass. Migration complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and full test suite verification

- [ ] T052 [P] Run full test suite: `pnpm test` -- verify all new + existing tests pass
- [ ] T053 [P] Run coverage check: `pnpm test:coverage` -- verify perspective-tools coverage
- [ ] T054 [P] Run linter: `pnpm lint` -- verify no lint errors in new files
- [ ] T055 [P] Run type checker: `pnpm typecheck` -- verify no type errors
- [ ] T056 Run quickstart.md validation: verify all implementation steps from `specs/008-perspectives/quickstart.md` are satisfied
- [ ] T057 Run `pnpm build` and verify `dist/` output includes all new perspective tools

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion -- BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 -- first TDD cycle
- **US2 (Phase 4)**: Depends on Phase 2 -- can run in PARALLEL with Phase 3 [P]
- **US3 (Phase 5)**: Depends on Phase 2 -- can run in PARALLEL with Phases 3-4 [P]
- **US4 (Phase 6)**: Depends on Phase 2 -- can run in PARALLEL with Phases 3-5 [P]
- **US5 (Phase 7)**: Depends on Phase 2 -- can run in PARALLEL with Phases 3-6 [P]
- **Legacy Cleanup (Phase 8)**: Depends on ALL user story phases (3-7) being complete
- **Polish (Phase 9)**: Depends on Phase 8 completion

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories. Uses shared contracts from Phase 2.
- **US2 (P1)**: No dependencies on other stories. Uses shared contracts from Phase 2.
- **US3 (P2)**: No dependencies on US1/US2. Independently testable.
- **US4 (P3)**: No dependencies on US1/US2/US3. Independently testable.
- **US5 (P3)**: No dependencies on US1-US4. Independently testable.

### TDD Order Within Each User Story (MANDATORY)

```text
1. RED: Write failing tests
   - Contract tests for schemas
   - Unit tests for primitives
   - Run `pnpm test` -- verify tests FAIL

2. GREEN: Implement minimum code
   - Primitives first (business logic)
   - Definitions second (MCP interface)
   - Run `pnpm test` -- tests turn GREEN

3. REFACTOR: Clean up
   - Improve code quality
   - Run `pnpm test` -- tests stay GREEN
   - Manual OmniFocus verification (last)
```

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 can run in parallel (different files)
- **Phase 2**: T005-T009 can run in parallel (different contract files)
- **Phases 3-7**: All five user stories can run in parallel after Phase 2 completes (different files, no cross-story dependencies)
- **Within each story**: RED phase contract + unit test tasks marked [P] can run in parallel
- **Phase 8**: T046, T047 can run in parallel (different legacy definition files)
- **Phase 9**: T052-T055 can run in parallel (independent validation commands)

---

## TDD Parallel Example: User Story 1

```bash
# RED: Launch all tests together (they will FAIL):
Task: "T013 [P] [US1] Write shared contract tests -- verify FAILS"
Task: "T014 [P] [US1] Write list-perspectives contract tests -- verify FAILS"
Task: "T015 [P] [US1] Write listPerspectives unit tests -- verify FAILS"

# GREEN: Implement to make tests pass:
Task: "T016 Implement listPerspectives primitive"
Task: "T017 Implement listPerspectives definition"

# REFACTOR: Polish while green:
Task: "T018 Run build + test"
Task: "T019 Manual verification in Script Editor"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (shared schemas)
2. Complete Phase 2: Foundational (all contracts, legacy audit)
3. Complete Phase 3: User Story 1 (following TDD cycle)
4. **STOP and VALIDATE**: All tests GREEN, manual verification passes
5. `list_perspectives` delivers immediate perspective discovery value

### Incremental Delivery

1. Complete Setup + Foundational -- contracts in place
2. Add US1 (list_perspectives) -- TDD cycle -- All tests GREEN (MVP!)
3. Add US2 (get_perspective) -- TDD cycle -- All tests GREEN -- Full perspective inspection
4. Add US3 (switch_perspective) -- TDD cycle -- All tests GREEN -- AI-driven navigation
5. Add US4 (export_perspective) -- TDD cycle -- All tests GREEN -- Backup capability
6. Add US5 (set_perspective_icon) -- TDD cycle -- All tests GREEN -- Visual customization
7. Phase 8: Legacy cleanup -- Delete old files, update server.ts
8. Phase 9: Polish -- Full validation suite

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Phases 1-2)
2. Once Foundational is done:
   - Developer A: US1 (list_perspectives) + US2 (get_perspective) -- P1 stories
   - Developer B: US3 (switch_perspective) -- P2 story
   - Developer C: US4 (export_perspective) + US5 (set_perspective_icon) -- P3 stories
3. All stories complete independently, all tests GREEN
4. Phase 8 (Legacy Cleanup) after all stories merge
5. Phase 9 (Polish) final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- **TDD is mandatory** -- tests MUST fail before implementation begins
- Commit after each TDD cycle (RED verified, GREEN achieved, REFACTOR done)
- Stop at any checkpoint to validate story independently
- Legacy cleanup (Phase 8) MUST wait until all new implementations exist
- Migration order: create new files (Phases 3-7) -- delete old files (Phase 8) -- update server.ts (Phase 8)
- Version-gated features: filterAggregation/filterRules (v4.2+), iconColor (v4.5.2+)
- Use `escapeForJS()` for all string interpolation in OmniJS scripts
- All OmniJS scripts wrapped in try-catch returning JSON per FR-043
