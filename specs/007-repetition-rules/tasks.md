# Tasks: Repetition Rule Management

**Input**: Design documents from `/specs/007-repetition-rules/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md
**Branch**: `worktree-007-repetition`

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## File Naming Convention

Per established codebase pattern (see `review-tools/`, `task-tools/`):

| Directory | Convention | Example |
|-----------|------------|---------|
| `src/contracts/` | `kebab-case.ts` | `get-repetition.ts`, `shared/repetition-enums.ts` |
| `src/tools/definitions/` | `camelCase.ts` | `getRepetition.ts` |
| `src/tools/primitives/` | `camelCase.ts` | `getRepetition.ts` |
| `tests/contract/` | `kebab-case.test.ts` | `get-repetition.test.ts` |
| `tests/unit/` | `camelCase.test.ts` | `getRepetition.test.ts` |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create contract directory structure and shared Zod schemas that ALL user stories depend on

- [x] T001 Create directory structure: `src/contracts/repetition-tools/shared/`, `tests/contract/repetition-tools/`, `tests/unit/repetition-tools/`
- [x] T002 [P] Create shared enum schemas (ScheduleType, AnchorDateKey, RepetitionMethod, PresetName, DayAbbreviation) in `src/contracts/repetition-tools/shared/repetition-enums.ts` — Zod `z.enum()` for each: `ScheduleTypeSchema = z.enum(['Regularly', 'FromCompletion', 'None'])`, `AnchorDateKeySchema = z.enum(['DueDate', 'DeferDate', 'PlannedDate'])`, `RepetitionMethodSchema = z.enum(['DueDate', 'Fixed', 'DeferUntilDate', 'None'])`, `PresetNameSchema = z.enum(['daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'monthly_last_day', 'quarterly', 'yearly'])`, `DayAbbreviationSchema = z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])`. Export inferred types via `z.infer<typeof Schema>`. [FR-004, FR-005]
- [x] T003 [P] Create RepetitionRuleData schema in `src/contracts/repetition-tools/shared/repetition-rule.ts` — fields: `ruleString: z.string()`, `isRepeating: z.literal(true)`, `scheduleType: ScheduleTypeSchema.nullable().describe('v4.7+, null if unsupported')`, `anchorDateKey: AnchorDateKeySchema.nullable().describe('v4.7+, null if unsupported')`, `catchUpAutomatically: z.boolean().nullable().describe('v4.7+, null if unsupported')`, `method: RepetitionMethodSchema.nullable().describe('DEPRECATED')`. Export `RepetitionRuleDataSchema` and `type RepetitionRuleData = z.infer<typeof RepetitionRuleDataSchema>`. [FR-001]
- [x] T004 [P] Create barrel export in `src/contracts/repetition-tools/shared/index.ts` — re-export all schemas and types from `repetition-enums.ts` and `repetition-rule.ts`
- [x] T005 Create barrel export in `src/contracts/repetition-tools/index.ts` — re-export shared schemas, plus individual tool contracts (initially empty, filled as tool contracts are added)

**Checkpoint**: Shared schemas compilable with `pnpm typecheck`. Directory structure ready for tool-specific contracts.

---

## Phase 2: Foundational (Shared Schema Tests)

**Purpose**: Validate shared schemas with contract tests BEFORE any tool implementation

**⚠️ CRITICAL**: No user story work can begin until shared schemas are tested

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD NOTE**: Shared schemas (Phase 1) are foundational infrastructure, not user-story behavior. Phase 1 creates schema files; Phase 2 tests them. Tests may pass immediately since schemas already exist. This is an accepted exception — strict RED-before-GREEN applies to user story phases (3–7), where tests are written BEFORE the contracts/primitives they validate.

- [x] T006 [P] Write contract tests for shared schemas in `tests/contract/repetition-tools/shared-schemas.test.ts` → verify FAILS (tests will fail if schemas have issues; may pass if schemas are correct from Phase 1). Test: enum schemas accept valid values and reject invalid; RepetitionRuleDataSchema accepts complete objects; `.nullable()` fields accept null; `.describe()` annotations present for v4.7+ fields; inferred types match expected shape. [FR-001, FR-004, FR-005, FR-008]

### 🟢 GREEN Phase

> **TDD RULE: The schemas from Phase 1 should make these tests pass. If not, fix schemas.**

- [x] T007 Run `pnpm test tests/contract/repetition-tools/shared-schemas.test.ts` → verify tests GREEN. Fix any schema issues.

**Checkpoint**: Shared schemas tested and validated. User story implementation can now begin.

---

## Phase 3: User Story 1 — Read Repetition Rule (Priority: P1) 🎯 MVP

**Goal**: `get_repetition` tool reads the current repetition rule from a task or project, returning ICS string, schedule type (v4.7+), anchor date (v4.7+), catch-up (v4.7+), and deprecated method.

**Independent Test**: Call `get_repetition` with a task/project ID → verify returned rule details. Delivers value even without write tools.

**Acceptance**: FR-001, FR-006, FR-007, FR-008, US-1 Scenarios 1–4

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T008 [P] [US1] Write contract tests for get-repetition schemas in `tests/contract/repetition-tools/get-repetition.test.ts` → verify FAILS. Test: `GetRepetitionInputSchema` validates `{ id: z.string().min(1) }` and rejects empty id; `GetRepetitionSuccessWithRuleSchema` validates `{ success: true, id, name, hasRule: true, rule: RepetitionRuleData }`; `GetRepetitionSuccessNoRuleSchema` validates `{ success: true, id, name, hasRule: false, rule: null }`; `GetRepetitionErrorSchema` validates `{ success: false, error: string }`; discriminated union on `success` works; verify dual-discriminator design: top-level `success: true/false` AND nested `hasRule: true/false` within success responses (both discriminators must parse correctly). [FR-001, FR-008]
- [x] T009 [P] [US1] Write unit tests for getRepetition primitive in `tests/unit/repetition-tools/getRepetition.test.ts` → verify FAILS. Mock `executeOmniJS` from `../../utils/scriptExecution.js` via `vi.mock()`. Test: task with rule returns full RepetitionRuleData; task without rule returns `hasRule: false`; project ID resolves to root task; invalid ID returns NOT_FOUND error; OmniJS error returns structured error; empty script output handled; edge case: completed task still returns rule data. [FR-001, FR-006, FR-007, US-1 Scenarios 1–4]

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T010 [US1] Create get-repetition contract in `src/contracts/repetition-tools/get-repetition.ts` — define `GetRepetitionInputSchema`, `GetRepetitionSuccessWithRuleSchema`, `GetRepetitionSuccessNoRuleSchema`, `GetRepetitionErrorSchema`, `GetRepetitionResponseSchema = z.discriminatedUnion('success', [...])`. Export all. Update `src/contracts/repetition-tools/index.ts` barrel. → contract tests GREEN [FR-001, FR-008]
- [x] T011 [US1] Implement getRepetition primitive in `src/tools/primitives/getRepetition.ts` — define local `generateGetRepetitionScript()` that returns OmniJS string, call `executeOmniJS(script)` from `../../utils/scriptExecution.js` (takes script string directly, not a file path). OmniJS script: item resolution (Task.byIdentifier → Project.byIdentifier → project.task), read `task.repetitionRule`, extract fields including v4.7+ conditional fields per quickstart.md pattern. Include local `escapeForJS()`. → unit tests GREEN [FR-001, FR-006, FR-007]
- [x] T012 [US1] Create getRepetition definition in `src/tools/definitions/getRepetition.ts` — export `schema` (from contract) and `handler` (calls primitive, formats MCP response). Follow existing definition pattern (e.g., `getProjectsForReview.ts`). [FR-008]
- [x] T013 [US1] Register `get_repetition` tool in `src/server.ts` — add import for `getRepetitionTool`, add `server.tool('get_repetition', description, schema.shape, handler)`. [FR-001]
- [x] T014 [US1] Run `pnpm build && pnpm lint && pnpm test` → all tests GREEN, no type errors, no lint issues

### 🔵 REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [x] T015 [US1] Review code for duplication/naming/structure improvements; refactor if needed while keeping tests green
- [x] T016 [US1] Manual verification: test get_repetition OmniJS script in OmniFocus Script Editor (⌘-⌃-O) with a known repeating task

**Checkpoint**: `get_repetition` fully functional. Users can read repetition rules from any task or project.

---

## Phase 4: User Story 2 — Set Repetition Rule via ICS String (Priority: P1)

**Goal**: `set_repetition` tool sets a repetition rule on a task or project using a raw ICS recurrence string with the legacy 2-param constructor.

**Independent Test**: Call `set_repetition` with an ICS string, then verify via `get_repetition`.

**Acceptance**: FR-002, FR-006, FR-007, FR-008, US-2 Scenarios 1–4

### 🔴 RED Phase - Tests First (REQUIRED)

- [x] T017 [P] [US2] Write contract tests for set-repetition schemas in `tests/contract/repetition-tools/set-repetition.test.ts` → verify FAILS. Test: `SetRepetitionInputSchema` validates `{ id: z.string().min(1), ruleString: z.string().min(1) }` and rejects empty strings; `SetRepetitionSuccessSchema` validates `{ success: true, id, name, ruleString }`; error schema; discriminated union. [FR-002, FR-008]
- [x] T018 [P] [US2] Write unit tests for setRepetition primitive in `tests/unit/repetition-tools/setRepetition.test.ts` → verify FAILS. Mock `executeOmniJS` via `vi.mock()`. Test: sets rule on task using legacy 2-param constructor; replaces existing rule; project ID resolves to root task; invalid ID returns NOT_FOUND; invalid ICS string returns OmniJS error; ruleString is escaped via `escapeForJS()`; edge case: setting rule on completed task succeeds (rule stored but doesn't trigger until incomplete). [FR-002, FR-006, FR-007, US-2 Scenarios 1–4]

### 🟢 GREEN Phase - Implementation

- [x] T019 [US2] Create set-repetition contract in `src/contracts/repetition-tools/set-repetition.ts` — `SetRepetitionInputSchema`, `SetRepetitionSuccessSchema`, `SetRepetitionErrorSchema`, `SetRepetitionResponseSchema`. Update barrel. → contract tests GREEN [FR-002, FR-008]
- [x] T020 [US2] Implement setRepetition primitive in `src/tools/primitives/setRepetition.ts` — define local `generateSetRepetitionScript()`, call `executeOmniJS(script)` from `../../utils/scriptExecution.js`. OmniJS: item resolution, `task.repetitionRule = new Task.RepetitionRule(ruleString, null)`, return `{ success, id, name, ruleString }`. Local `escapeForJS()`. → unit tests GREEN [FR-002, FR-006, FR-007]
- [x] T021 [US2] Create setRepetition definition in `src/tools/definitions/setRepetition.ts` — export `schema` and `handler`. [FR-008]
- [x] T022 [US2] Register `set_repetition` tool in `src/server.ts` [FR-002]
- [x] T023 [US2] Run `pnpm build && pnpm lint && pnpm test` → all tests GREEN, no lint issues

### 🔵 REFACTOR Phase

- [x] T024 [US2] Review code for duplication/naming/structure improvements; refactor if needed while keeping tests green
- [x] T025 [US2] Manual verification: test set_repetition in OmniFocus Script Editor, then verify with get_repetition

**Checkpoint**: `set_repetition` functional. Users can set any ICS recurrence rule on tasks/projects.

---

## Phase 5: User Story 3 — Clear Repetition Rule (Priority: P2)

**Goal**: `clear_repetition` tool removes the repetition rule from a task or project, making it non-recurring. Idempotent — succeeds even if no rule exists.

**Independent Test**: Clear a known repeating task, verify no rule via `get_repetition`.

**Acceptance**: FR-003, FR-006, FR-007, FR-008, US-3 Scenarios 1–3

### 🔴 RED Phase - Tests First (REQUIRED)

- [x] T026 [P] [US3] Write contract tests for clear-repetition schemas in `tests/contract/repetition-tools/clear-repetition.test.ts` → verify FAILS. Test: `ClearRepetitionInputSchema` validates `{ id: z.string().min(1) }`; `ClearRepetitionSuccessSchema` validates `{ success: true, id, name }` (no ruleString); error schema; discriminated union. [FR-003, FR-008]
- [x] T027 [P] [US3] Write unit tests for clearRepetition primitive in `tests/unit/repetition-tools/clearRepetition.test.ts` → verify FAILS. Mock `executeOmniJS` via `vi.mock()`. Test: clears existing rule (sets `task.repetitionRule = null`); idempotent on task with no rule (succeeds); project ID resolves to root task; invalid ID returns NOT_FOUND; edge case: clearing a rule mid-recurrence (current instance remains, no future occurrences). [FR-003, FR-006, FR-007, US-3 Scenarios 1–3]

### 🟢 GREEN Phase - Implementation

- [x] T028 [US3] Create clear-repetition contract in `src/contracts/repetition-tools/clear-repetition.ts` — `ClearRepetitionInputSchema`, `ClearRepetitionSuccessSchema`, `ClearRepetitionErrorSchema`, `ClearRepetitionResponseSchema`. Update barrel. → contract tests GREEN [FR-003, FR-008]
- [x] T029 [US3] Implement clearRepetition primitive in `src/tools/primitives/clearRepetition.ts` — define local `generateClearRepetitionScript()`, call `executeOmniJS(script)` from `../../utils/scriptExecution.js`. OmniJS: item resolution, `task.repetitionRule = null`, return `{ success, id, name }`. Local `escapeForJS()`. → unit tests GREEN [FR-003, FR-006, FR-007]
- [x] T030 [US3] Create clearRepetition definition in `src/tools/definitions/clearRepetition.ts` — export `schema` and `handler`. [FR-008]
- [x] T031 [US3] Register `clear_repetition` tool in `src/server.ts` [FR-003]
- [x] T032 [US3] Run `pnpm build && pnpm lint && pnpm test` → all tests GREEN, no lint issues

### 🔵 REFACTOR Phase

- [x] T033 [US3] Review code for duplication/naming/structure improvements; refactor if needed while keeping tests green
- [x] T034 [US3] Manual verification in OmniFocus Script Editor

**Checkpoint**: `clear_repetition` functional. Users can remove repetition rules.

---

## Phase 6: User Story 4 — Set Common Repetition Presets (Priority: P2)

**Goal**: `set_common_repetition` tool sets repetition using named presets (daily, weekdays, weekly, biweekly, monthly, monthly_last_day, quarterly, yearly). ICS string generated server-side in TypeScript, passed to OmniJS as a computed string.

**Independent Test**: Call with each preset, verify ICS string via `get_repetition`.

**Acceptance**: FR-004, FR-006, FR-007, FR-008, US-4 Scenarios 1–5

### 🔴 RED Phase - Tests First (REQUIRED)

- [x] T035 [P] [US4] Write contract tests for set-common-repetition schemas in `tests/contract/repetition-tools/set-common-repetition.test.ts` → verify FAILS. Test: `SetCommonRepetitionInputSchema` validates `{ id, preset }` with all 8 preset names; `days` array optional with DayAbbreviation enum; `dayOfMonth` optional integer 1-31; rejects invalid preset names; rejects `dayOfMonth` outside 1-31; success schema returns `{ success, id, name, ruleString }`; discriminated union. [FR-004, FR-008]
- [x] T036 [P] [US4] Write unit tests for setCommonRepetition primitive in `tests/unit/repetition-tools/setCommonRepetition.test.ts` → verify FAILS. Mock `executeOmniJS` via `vi.mock()`. Test 8 presets with 2 modifier combinations (10 test cases total): `daily→FREQ=DAILY`, `weekdays→FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`, `weekly→FREQ=WEEKLY`, `weekly+days→FREQ=WEEKLY;BYDAY=MO,WE,FR`, `biweekly→FREQ=WEEKLY;INTERVAL=2`, `monthly→FREQ=MONTHLY`, `monthly+dayOfMonth→FREQ=MONTHLY;BYMONTHDAY=15`, `monthly_last_day→FREQ=MONTHLY;BYMONTHDAY=-1`, `quarterly→FREQ=MONTHLY;INTERVAL=3`, `yearly→FREQ=YEARLY`; `days` silently ignored for non-weekly/biweekly; `dayOfMonth` silently ignored for non-monthly/quarterly; project resolution; NOT_FOUND error; edge case: last-call-wins when set_common followed by set_advanced on same task. [FR-004, FR-006, FR-007, US-4 Scenarios 1–5]

### 🟢 GREEN Phase - Implementation

- [x] T037 [US4] Create set-common-repetition contract in `src/contracts/repetition-tools/set-common-repetition.ts` — `SetCommonRepetitionInputSchema` with `id: z.string().min(1)`, `preset: PresetNameSchema`, `days: z.array(DayAbbreviationSchema).optional()`, `dayOfMonth: z.number().int().min(1).max(31).optional()`. Success/error/response schemas. Update barrel. → contract tests GREEN [FR-004, FR-008]
- [x] T038 [US4] Implement setCommonRepetition primitive in `src/tools/primitives/setCommonRepetition.ts` — define local `presetToICS()` (server-side TypeScript switch over preset name, appending BYDAY/BYMONTHDAY modifiers per quickstart.md mapping table; silently ignore `days` for non-weekly/biweekly and `dayOfMonth` for non-monthly/quarterly), define local `generateSetCommonRepetitionScript()`, call `executeOmniJS(script)` from `../../utils/scriptExecution.js`. OmniJS uses legacy constructor with computed ICS string. Local `escapeForJS()`. → unit tests GREEN [FR-004, FR-006, FR-007]
- [x] T039 [US4] Create setCommonRepetition definition in `src/tools/definitions/setCommonRepetition.ts` — export `schema` and `handler`. [FR-008]
- [x] T040 [US4] Register `set_common_repetition` tool in `src/server.ts` [FR-004]
- [x] T041 [US4] Run `pnpm build && pnpm lint && pnpm test` → all tests GREEN, no lint issues

### 🔵 REFACTOR Phase

- [x] T042 [US4] Review code for duplication/naming/structure improvements; refactor if needed while keeping tests green
- [x] T043 [US4] Manual verification: test each preset in OmniFocus Script Editor

**Checkpoint**: `set_common_repetition` functional. Users can set common recurrence patterns without knowing ICS syntax.

---

## Phase 7: User Story 5 — Set Advanced Repetition v4.7+ (Priority: P3)

**Goal**: `set_advanced_repetition` tool configures v4.7+ repetition parameters (scheduleType, anchorDateKey, catchUpAutomatically) using the 5-param constructor with read-then-merge pattern. Version-gated — returns error on pre-v4.7.

**Independent Test**: Call with v4.7+ params, verify via `get_repetition`.

**Acceptance**: FR-005, FR-006, FR-007, FR-008, US-5 Scenarios 1–6

### 🔴 RED Phase - Tests First (REQUIRED)

- [x] T044 [P] [US5] Write contract tests for set-advanced-repetition schemas in `tests/contract/repetition-tools/set-advanced-repetition.test.ts` → verify FAILS. Test: `SetAdvancedRepetitionInputSchema` validates `{ id: z.string().min(1) }` with all optional fields: `ruleString: z.string().min(1).optional()`, `scheduleType: ScheduleTypeSchema.optional()`, `anchorDateKey: AnchorDateKeySchema.optional()`, `catchUpAutomatically: z.boolean().optional()`; rejects invalid enum values; success schema returns `{ success, id, name, ruleString }`; discriminated union. [FR-005, FR-008]
- [x] T045 [P] [US5] Write unit tests for setAdvancedRepetition primitive in `tests/unit/repetition-tools/setAdvancedRepetition.test.ts` → verify FAILS. Mock `executeOmniJS` via `vi.mock()`. Test: version check returns error on pre-v4.7 with version string in message; sets all params with 5-param constructor; read-then-merge preserves existing rule when only changing scheduleType; error when no existing rule and no ruleString provided; project resolution; NOT_FOUND; OmniJS constructor error; null scheduleType/anchorDateKey from legacy rule passes null to constructor (OmniFocus applies defaults); edge case: project with null root task returns data integrity error. [FR-005, FR-006, FR-007, US-5 Scenarios 1–6]

### 🟢 GREEN Phase - Implementation

- [x] T046 [US5] Create set-advanced-repetition contract in `src/contracts/repetition-tools/set-advanced-repetition.ts` — `SetAdvancedRepetitionInputSchema` with all optional `.optional()` params, success/error/response schemas. Update barrel. → contract tests GREEN [FR-005, FR-008]
- [x] T047 [US5] Implement setAdvancedRepetition primitive in `src/tools/primitives/setAdvancedRepetition.ts` — define local `generateSetAdvancedRepetitionScript()`, call `executeOmniJS(script)` from `../../utils/scriptExecution.js`. OmniJS script: (1) version check FIRST via `app.userVersion.atLeast(new Version('4.7'))`, (2) item resolution, (3) read existing rule for merge, (4) error if no ruleString and no existing rule, (5) merge provided values with existing, (6) construct `new Task.RepetitionRule(rs, null, st, ak, cu)`. **Critical**: for writes, reference OmniJS enum constants directly (e.g., `Task.RepetitionScheduleType.Regularly`), not string values — the script generator must map TypeScript enum strings to OmniJS constant references. Local `escapeForJS()`. → unit tests GREEN [FR-005, FR-006, FR-007]
- [x] T048 [US5] Create setAdvancedRepetition definition in `src/tools/definitions/setAdvancedRepetition.ts` — export `schema` and `handler`. [FR-008]
- [x] T049 [US5] Register `set_advanced_repetition` tool in `src/server.ts` [FR-005]
- [x] T050 [US5] Run `pnpm build && pnpm lint && pnpm test` → all tests GREEN, no lint issues

### 🔵 REFACTOR Phase

- [x] T051 [US5] Review code for duplication/naming/structure improvements; refactor if needed while keeping tests green
- [x] T052 [US5] Manual verification in OmniFocus Script Editor on v4.7+

**Checkpoint**: `set_advanced_repetition` functional. Power users on v4.7+ can configure advanced repetition features.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation across all 5 tools, final cleanup

- [x] T053 [P] Run full test suite: `pnpm test` → all tests pass (regression check across all 5 tools)
- [x] T054 [P] Run coverage check: `pnpm test:coverage` → review gaps
- [x] T055 [P] Run typecheck: `pnpm typecheck` → no errors
- [x] T056 Run full build: `pnpm build` → clean build (validates barrel exports in `src/contracts/repetition-tools/index.ts`)
- [x] T057 Verify all 5 tools appear in MCP tool list (start server, check registration)
- [x] T058 Update CLAUDE.md "Recent Changes" section with Phase 7 repetition tools summary

**Checkpoint**: All 5 repetition tools fully implemented, tested, and integrated.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup) ─────→ Phase 2 (Foundation Tests) ─────→ Phases 3-7 (User Stories)
                                                            │
                                                            ├── Phase 3 (US1: get) 🎯 MVP
                                                            │     └── Phase 4 (US2: set) ──┐
                                                            │                               │
                                                            │     Phase 5 (US3: clear) ←────┘ [P]
                                                            │     Phase 6 (US4: common) ←───┘ [P]
                                                            │
                                                            └── Phase 7 (US5: advanced) ← depends on Phase 3
                                                                  (needs get_repetition for verification)

                                                            Phase 8 (Polish) ← all stories complete
```

### User Story Dependencies

- **US1 (get_repetition)**: No dependencies on other stories. Start immediately after Phase 2.
- **US2 (set_repetition)**: Logically depends on US1 for verification but can be implemented in parallel if mocking `get_repetition`.
- **US3 (clear_repetition)**: Independent. Can run in parallel with US2 after Phase 2.
- **US4 (set_common_repetition)**: Independent. Can run in parallel with US2/US3 after Phase 2.
- **US5 (set_advanced_repetition)**: Depends on Phase 3 (US1) for v4.7+ field verification. Should be last.

### TDD Order Within Each User Story (MANDATORY)

```text
1. 🔴 RED: Write failing tests
   - Contract tests for Zod schemas
   - Unit tests for primitives (mock `executeOmniJS` from `scriptExecution.js`)
   - Run `pnpm test` → verify tests FAIL

2. 🟢 GREEN: Implement minimum code
   - Contract file first (schemas)
   - Primitive second (business logic + OmniJS script)
   - Definition third (MCP handler)
   - Server registration fourth
   - Run `pnpm test` → tests turn GREEN

3. 🔵 REFACTOR: Clean up
   - Lint fixes
   - Manual OmniFocus verification (last)
   - Run `pnpm test` → tests stay GREEN
```

### Parallel Opportunities

**Within phases (independent files, no conflicts):**

- T002, T003, T004 — parallel shared schema files
- T008, T009 — parallel US1 test files
- T010 → T011 → T012 → T013 — sequential (each imports from previous)
- T017, T018 — parallel US2 test files
- T019 → T020 → T021 → T022 — sequential
- T026, T027 — parallel US3 test files
- T028 → T029 → T030 → T031 — sequential
- T035, T036 — parallel US4 test files
- T037 → T038 → T039 → T040 — sequential
- T044, T045 — parallel US5 test files
- T046 → T047 → T048 → T049 — sequential
- T053, T054, T055 — parallel validation checks

**Across user stories (after Phase 2):**

- US2 (Phase 4), US3 (Phase 5), US4 (Phase 6) can all proceed in parallel after Phase 2
- US5 (Phase 7) should follow US1 (Phase 3) for v4.7+ field verification

---

## TDD Parallel Example: User Story 1

```bash
# 🔴 RED: Launch both test files in parallel (they will FAIL):
Task: "T008 [P] [US1] Write contract tests → verify FAILS"
Task: "T009 [P] [US1] Write unit tests → verify FAILS"

# 🟢 GREEN: Implement sequentially (each imports from previous):
Task: "T010 Contract file"              # creates schemas T008 tests against
Task: "T011 Primitive implementation"   # imports from T010 contract
Task: "T012 Definition file"            # imports from T011 primitive
Task: "T013 Server registration"        # imports from T012 definition
Task: "T014 Full build + test"          # validates all above

# 🔵 REFACTOR: Polish while green:
Task: "T015 Lint fixes"
Task: "T016 Manual verification"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (shared schemas)
2. Complete Phase 2: Foundation tests (validate schemas)
3. Complete Phase 3: User Story 1 — `get_repetition` (TDD cycle)
4. **STOP and VALIDATE**: All tests GREEN, manual verification passes
5. Users can read repetition rules — immediate value delivered

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Add US1 (get) → TDD → GREEN → **MVP!** (read repetition rules)
3. Add US2 (set) → TDD → GREEN → (set ICS rules)
4. Add US3 (clear) + US4 (common) → parallel TDD → GREEN → (clear + presets)
5. Add US5 (advanced) → TDD → GREEN → (v4.7+ features)
6. Phase 8 → Final validation → **Feature complete**

### Task Count Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Phase 1: Setup | 5 | T002, T003, T004 |
| Phase 2: Foundation | 2 | — |
| Phase 3: US1 (get) | 9 | T008+T009 (RED tests) |
| Phase 4: US2 (set) | 9 | T017+T018 (RED tests) |
| Phase 5: US3 (clear) | 9 | T026+T027 (RED tests) |
| Phase 6: US4 (common) | 9 | T035+T036 (RED tests) |
| Phase 7: US5 (advanced) | 9 | T044+T045 (RED tests) |
| Phase 8: Polish | 6 | T053+T054+T055 |
| **Total** | **58** | |
