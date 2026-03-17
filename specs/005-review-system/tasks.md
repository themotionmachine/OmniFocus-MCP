# Tasks: Review System (Phase 5)

**Feature**: `005-review-system` | **Branch**: `005-review-system`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Generated**: 2026-03-16

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 19 |
| US1 Tasks | 5 |
| US2 Tasks | 5 |
| US3 Tasks | 5 |
| Foundational | 1 |
| Polish | 3 |
| Parallel Opportunities | US2 + US3 fully parallel after Phase 2 |
| MVP Scope | Phase 2 + Phase 3 (US1 only) |

## Implementation Strategy

**TDD Cycle** (Constitution Principle X): Contract tests → Unit tests → Implementation → Integration tests

**Approach**: Contracts already exist from Phase 1 Design. Each user story follows a per-story TDD cycle: write contract tests (validate schemas), write unit tests (RED — primitive doesn't exist), implement primitive (GREEN), wire definition, register in server.

**MVP**: Complete Phase 2 (foundational) + Phase 3 (US1: `get_projects_for_review`). This delivers immediate value — users can query overdue projects. US2 and US3 can follow in parallel.

**Established Patterns**: Follow `listProjects` (definition + primitive) and `project-tools/` (contract tests) as structural templates.

---

## Phase 1: Setup

No setup tasks needed. All contracts exist from Phase 1 Design & Contracts:

- `src/contracts/review-tools/get-projects-for-review.ts` (input/output schemas)
- `src/contracts/review-tools/mark-reviewed.ts` (input/output schemas)
- `src/contracts/review-tools/set-review-interval.ts` (input/output schemas)
- `src/contracts/review-tools/shared/review-project.ts` (ReviewProjectSummarySchema)
- `src/contracts/review-tools/shared/batch.ts` (ProjectIdentifier, BatchItemResult schemas)
- `src/contracts/review-tools/shared/index.ts` (re-exports)
- `src/contracts/review-tools/index.ts` (barrel export)

---

## Phase 2: Foundational — Shared Schema Contract Tests

**Goal**: Validate shared schemas that all 3 tools depend on. Must complete before user story phases.

- [x] T001 Contract tests for shared review schemas in `tests/contract/review-tools/shared-schemas.test.ts`

  **Pattern**: Follow `tests/contract/project-tools/shared-schemas.test.ts` structure.
  **Imports**: `ReviewProjectSummarySchema`, `ProjectIdentifierSchema`, `ReviewBatchItemResultSchema`, `MarkReviewedItemResultSchema`, `SetReviewIntervalItemResultSchema` from `src/contracts/review-tools/shared/index.js`.

  **Test cases for ReviewProjectSummarySchema**:
  - Valid complete summary (all fields populated)
  - Valid with nullable fields (`lastReviewDate: null`, `nextReviewDate: null`, `reviewInterval: null`)
  - Rejects missing required fields (`id`, `name`, `status`)
  - Validates `status` is a valid ProjectStatus enum value
  - Validates `remainingCount` is non-negative integer
  - Validates `flagged` is boolean

  **Test cases for ProjectIdentifierSchema**:
  - Valid with `id` only
  - Valid with `name` only
  - Valid with both `id` and `name`
  - Rejects empty object (refinement: at least one required)
  - Rejects `id: ""` with `name: ""` (both empty strings)
  - Accepts `id: ""` with valid `name` (refinement allows)

  **Test cases for ReviewBatchItemResultSchema**:
  - Valid success result (success: true, projectId, projectName)
  - Valid error result (success: false, error, code)
  - Valid disambiguation result (code: "DISAMBIGUATION_REQUIRED", candidates array of `{id, name}` objects)
  - All error codes: NOT_FOUND, DISAMBIGUATION_REQUIRED, NO_REVIEW_INTERVAL, INVALID_INTERVAL
  - Candidates array contains objects with `id` (string) and `name` (string), not bare strings
  - Optional fields omitted on success

  **Test cases for MarkReviewedItemResultSchema**:
  - Extends base with `previousNextReviewDate` and `newNextReviewDate`
  - Both nullable ISO 8601 strings
  - Optional (not present on error results)

  **Test cases for SetReviewIntervalItemResultSchema**:
  - Extends base with `previousInterval` and `newInterval`
  - Both nullable objects with `steps` and `unit`
  - `null` for disabled reviews

  **FRs covered**: FR-018, FR-019, FR-020, FR-030c, FR-030d, FR-030e, FR-031, FR-032, FR-033

---

## Phase 3: US1 — Get Projects for Review [P1]

**Story Goal**: As a GTD practitioner, retrieve projects due for review to conduct weekly review efficiently.

**Independent Test**: Call `get_projects_for_review` and verify it returns projects where `nextReviewDate <= today`. Delivers immediate value by surfacing overdue reviews.

**Dependencies**: Phase 2 (T001) must complete first.

- [x] T002 [US1] Contract tests for get-projects-for-review schemas in `tests/contract/review-tools/get-projects-for-review.test.ts`

  **Pattern**: Follow `tests/contract/project-tools/list-projects.test.ts` structure.
  **Imports**: `GetProjectsForReviewInputSchema`, `GetProjectsForReviewSuccessSchema`, `GetProjectsForReviewErrorSchema`, `GetProjectsForReviewResponseSchema` from `src/contracts/review-tools/get-projects-for-review.js`.

  **Test cases for GetProjectsForReviewInputSchema**:
  - Accepts empty object (all defaults: includeFuture=false, futureDays=7, includeAll=false, includeInactive=false, limit=100)
  - Accepts all parameters simultaneously
  - Accepts `folderId` only, `folderName` only, and both together
  - Rejects `limit: 0` (min 1)
  - Rejects `limit: 1001` (max 1000)
  - Rejects `limit: 50.5` (must be integer)
  - Rejects `futureDays: 0` (min 1)
  - Rejects `futureDays: -1`
  - Accepts `futureDays: 365` (no max enforced)
  - Rejects `folderId: ""` (empty string — spec: "Invalid folderId: cannot be empty string")
  - Accepts `folderId: "abc123"` (non-empty string)
  - Accepts `limit: 1` and `limit: 1000` (boundary values)

  **Test cases for GetProjectsForReviewSuccessSchema**:
  - Valid response with projects array and counts
  - Valid empty response (`projects: [], totalCount: 0, dueCount: 0, upcomingCount: 0`)
  - Validates `totalCount`, `dueCount`, `upcomingCount` are non-negative integers
  - Projects array contains valid ReviewProjectSummary items

  **Test cases for GetProjectsForReviewErrorSchema**:
  - Valid error with `success: false, error: "message"`
  - Optional `code` field

  **Test cases for GetProjectsForReviewResponseSchema**:
  - Discriminated union: success=true parses as success type
  - Discriminated union: success=false parses as error type

  **FRs covered**: FR-001 through FR-011

- [x] T003 [US1] Unit tests for getProjectsForReview primitive in `tests/unit/review-tools/getProjectsForReview.test.ts`

  **Pattern**: Follow `tests/unit/project-tools/listProjects.test.ts` — mock `executeOmniJS`, test primitive function behavior.
  **Import**: `getProjectsForReview` from `src/tools/primitives/getProjectsForReview.js` (will fail initially — TDD RED).
  **Mock**: `vi.mock('src/utils/scriptExecution.js', () => ({ executeOmniJS: vi.fn() }))`.

  **Test cases**:
  - Default call (no params) returns projects where nextReviewDate <= today [FR-001]
  - `includeFuture: true` returns projects due within futureDays window [FR-002, FR-003]
  - `futureDays` is ignored when `includeFuture: false` (spec: no error, just ignored)
  - `includeAll: true` returns all reviewable projects regardless of date [FR-005]
  - `includeAll: true` overrides `includeFuture`/`futureDays` but NOT `folderId`/`includeInactive` [FR-005 precedence]
  - `includeInactive: true` includes Done/Dropped projects [FR-006]
  - Default behavior excludes Done/Dropped but includes OnHold [FR-006, spec status table]
  - Projects with `reviewInterval: null` excluded [FR-007]
  - Results sorted by `nextReviewDate` ascending [FR-008]
  - Secondary sort by `name` alphabetical when dates equal [FR-008a]
  - Sort is stable: calling with same data produces identical ordering [FR-008b]
  - Response includes all 8 fields per project [FR-009]: id, name, nextReviewDate, lastReviewDate, reviewInterval, status, flagged, remainingCount
  - `limit` parameter truncates results [FR-010]
  - `totalCount` reflects count BEFORE limit applied [FR-011]
  - `folderId` filters to folder hierarchy [FR-004]
  - `folderName` filters by name [FR-004a]
  - `folderId: ""` returns error "Invalid folderId: cannot be empty string" [spec validation rules]
  - Invalid `folderId` returns error [spec: "Folder not found: {folderId}"]
  - Empty results return `{ success: true, projects: [], totalCount: 0 }` [spec edge case]
  - OmniJS error returns `{ success: false, error: "..." }` [FR-031]
  - `generateGetProjectsForReviewScript()` produces valid OmniJS script string

  **FRs covered**: FR-001 through FR-011, FR-031

- [x] T004 [US1] Implement getProjectsForReview primitive in `src/tools/primitives/getProjectsForReview.ts`

  **Pattern**: Follow `src/tools/primitives/listProjects.ts` structure.
  **Exports**: `getProjectsForReview(params)` and `generateGetProjectsForReviewScript(params)`.
  **Reference OmniJS**: `specs/005-review-system/quickstart.md` lines 68-188 (get_projects_for_review pattern).
  **Contract types**: Import `GetProjectsForReviewInput`, `GetProjectsForReviewResponse` from contracts.

  **Implementation details**:
  - Generate OmniJS script with template literals, escaping user inputs
  - Filter chain: reviewInterval check → status filter → date filter → folder filter → sort → limit
  - Use `Calendar.current.startOfDay(new Date())` for today comparison
  - Use `Calendar.current.dateByAddingDateComponents()` for futureDays horizon
  - Sort: `nextReviewDate` ascending, then `name` alphabetical as tiebreaker [FR-008, FR-008a]
  - Return `totalCount` before applying limit [FR-011]
  - Folder filtering: `Folder.byIdentifier()` or `flattenedFolders.byName()`, then `folder.flattenedProjects`
  - Use `escapeForJS()` for all string parameters (security: prevent injection)
  - Wrap OmniJS in try-catch returning JSON error [FR-031]

  **FRs covered**: FR-001 through FR-011, FR-031

- [x] T005 [US1] Implement getProjectsForReview definition in `src/tools/definitions/getProjectsForReview.ts`

  **Pattern**: Follow `src/tools/definitions/listProjects.ts` exactly.
  **Exports**: `schema` (from contract) and `handler(params)`.
  **Handler**: Call `getProjectsForReview(params)` from primitive, return MCP content with `isError: true` for failures.

  **FRs covered**: FR-031

- [x] T006 [US1] Register get_projects_for_review tool in `src/server.ts`

  **Pattern**: Follow existing `server.tool()` calls (e.g., `list_projects`).
  **Changes**:
  - Add import: `import * as getProjectsForReviewTool from './tools/definitions/getProjectsForReview.js';`
  - Add registration: `server.tool('get_projects_for_review', 'Query projects due for GTD periodic review with filtering by date, folder, and status', getProjectsForReviewTool.schema.shape, getProjectsForReviewTool.handler);`

---

## Phase 4: US2 — Mark Reviewed [P2]

**Story Goal**: As a GTD practitioner, mark projects as reviewed so nextReviewDate advances by the configured interval.

**Independent Test**: Call `mark_reviewed` on a project with `reviewInterval: {steps: 1, unit: 'weeks'}` and verify `nextReviewDate` is set to 7 days from today.

**Dependencies**: Phase 2 (T001) must complete first. Independent of US1 and US3.

- [x] T007 [P] [US2] Contract tests for mark-reviewed schemas in `tests/contract/review-tools/mark-reviewed.test.ts`

  **Pattern**: Follow `tests/contract/project-tools/create-project.test.ts` structure.
  **Imports**: `MarkReviewedInputSchema`, `MarkReviewedSuccessSchema`, `MarkReviewedErrorSchema`, `MarkReviewedResponseSchema` from `src/contracts/review-tools/mark-reviewed.js`.

  **Test cases for MarkReviewedInputSchema**:
  - Accepts single-project array: `{ projects: [{ id: "abc" }] }`
  - Accepts multi-project array: `{ projects: [{ id: "a" }, { name: "B" }] }`
  - Rejects empty projects array (min 1)
  - Rejects > 100 projects (max 100)
  - Rejects projects with neither id nor name (ProjectIdentifier refinement)
  - Accepts projects with both id and name

  **Test cases for MarkReviewedSuccessSchema**:
  - Valid response with results array and summary
  - Summary contains `total`, `succeeded`, `failed` (all non-negative integers)
  - Results contain MarkReviewedItemResult objects

  **Test cases for MarkReviewedResponseSchema**:
  - Discriminated union: success=true parses correctly
  - Discriminated union: success=false parses correctly

  **FRs covered**: FR-012, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020

- [x] T008 [P] [US2] Unit tests for markReviewed primitive in `tests/unit/review-tools/markReviewed.test.ts`

  **Pattern**: Follow `tests/unit/project-tools/editProject.test.ts` — mock `executeOmniJS`.
  **Import**: `markReviewed` from `src/tools/primitives/markReviewed.js` (TDD RED).

  **Test cases**:
  - Single project by ID: calculates nextReviewDate correctly [FR-013]
  - Single project by name: resolves and marks reviewed [FR-015]
  - Batch with 3 projects: returns per-item results [FR-018]
  - Project not found → error with code NOT_FOUND [FR-031]
  - Name matches multiple → error with code DISAMBIGUATION_REQUIRED and candidates [FR-016, FR-033]
  - Project has no reviewInterval → error with code NO_REVIEW_INTERVAL [FR-014]
  - Partial batch failure: valid projects succeed, invalid fail [FR-019]
  - Results preserve original array indices [FR-020]
  - Date calculation for interval unit 'days' (e.g., 7 days → dc.day) [FR-013]
  - Date calculation for interval unit 'weeks' (e.g., 2 weeks → dc.day = steps * 7) [FR-013]
  - Date calculation for interval unit 'months' (e.g., 1 month → dc.month) [FR-013]
  - Date calculation for interval unit 'years' (e.g., 1 year → dc.year) [FR-013]
  - OmniJS error returns structured error [FR-031, FR-035]
  - `generateMarkReviewedScript()` produces valid OmniJS with Calendar API calls [FR-034]

  **FRs covered**: FR-012 through FR-020, FR-031, FR-033, FR-034, FR-035

- [x] T009 [P] [US2] Implement markReviewed primitive in `src/tools/primitives/markReviewed.ts`

  **Pattern**: Follow `src/tools/primitives/createProject.ts` structure.
  **Exports**: `markReviewed(params)` and `generateMarkReviewedScript(params)`.
  **Reference OmniJS**: `specs/005-review-system/quickstart.md` lines 192-286 (mark_reviewed pattern).
  **Contract types**: Import `MarkReviewedInput`, `MarkReviewedResponse` from contracts.

  **Implementation details**:
  - Accept `projects` array of `ProjectIdentifier`
  - For each project: lookup by ID or name, handle disambiguation
  - Check `project.reviewInterval` exists (error if null)
  - Calculate nextReviewDate using Calendar API (MUST use `Calendar.current.dateByAddingDateComponents`, NOT ms math)
  - Unit mapping: 'days'→dc.day, 'weeks'→dc.day=steps*7, 'months'→dc.month, 'years'→dc.year
  - Use `Calendar.current.startOfDay(new Date())` for today
  - Set `project.nextReviewDate = newDate` (the "mark reviewed" mechanism)
  - Return per-item results with `previousNextReviewDate` and `newNextReviewDate`
  - Return summary with total/succeeded/failed counts
  - Wrap Calendar API calls in try-catch [FR-034, FR-035]
  - Escape all string inputs for OmniJS injection safety

  **FRs covered**: FR-012 through FR-020, FR-031 through FR-036

- [x] T010 [P] [US2] Implement markReviewed definition in `src/tools/definitions/markReviewed.ts`

  **Pattern**: Follow `src/tools/definitions/listProjects.ts` exactly.
  **Exports**: `schema` and `handler(params)`.

- [x] T011 [US2] Register mark_reviewed tool in `src/server.ts`

  **Changes**:
  - Add import: `import * as markReviewedTool from './tools/definitions/markReviewed.js';`
  - Add registration: `server.tool('mark_reviewed', 'Mark one or more projects as reviewed, advancing nextReviewDate by the configured review interval', markReviewedTool.schema.shape, markReviewedTool.handler);`

---

## Phase 5: US3 — Set Review Interval [P3]

**Story Goal**: As a GTD practitioner, configure how often a project should be reviewed.

**Independent Test**: Call `set_review_interval` with `{steps: 2, unit: 'weeks'}` and verify `project.reviewInterval` updates.

**Dependencies**: Phase 2 (T001) must complete first. Independent of US1 and US2.

- [x] T012 [P] [US3] Contract tests for set-review-interval schemas in `tests/contract/review-tools/set-review-interval.test.ts`

  **Pattern**: Follow `tests/contract/project-tools/edit-project.test.ts` structure.
  **Imports**: `SetReviewIntervalInputSchema`, `SetReviewIntervalSuccessSchema`, `SetReviewIntervalErrorSchema`, `SetReviewIntervalResponseSchema` from `src/contracts/review-tools/set-review-interval.js`.

  **Test cases for SetReviewIntervalInputSchema**:
  - Accepts valid interval: `{ projects: [{ id: "abc" }], interval: { steps: 2, unit: 'weeks' } }`
  - Accepts null interval (disable reviews): `{ interval: null }`
  - Accepts all 4 valid units: 'days', 'weeks', 'months', 'years'
  - Rejects invalid unit: 'hours', 'minutes'
  - Rejects `steps: 0` (min 1)
  - Rejects `steps: -1`
  - Rejects `steps: 366` (max 365)
  - Rejects non-integer steps: `steps: 1.5`
  - Accepts `recalculateNextReview: true` (default false)
  - Rejects empty projects array (min 1)
  - Rejects > 100 projects (max 100)

  **Test cases for SetReviewIntervalSuccessSchema**:
  - Valid response with results array and summary
  - Results contain SetReviewIntervalItemResult objects

  **Test cases for SetReviewIntervalResponseSchema**:
  - Discriminated union works for both success and error

  **FRs covered**: FR-021 through FR-030, FR-030a through FR-030e

- [x] T013 [P] [US3] Unit tests for setReviewInterval primitive in `tests/unit/review-tools/setReviewInterval.test.ts`

  **Pattern**: Follow `tests/unit/project-tools/editProject.test.ts` — mock `executeOmniJS`.
  **Import**: `setReviewInterval` from `src/tools/primitives/setReviewInterval.js` (TDD RED).

  **Test cases**:
  - Set new interval on project with existing interval [FR-021]
  - Set null interval to disable reviews [FR-024]: clears reviewInterval AND nextReviewDate
  - Validate unit is one of: days, weeks, months, years [FR-022]
  - Validate steps is positive integer >= 1 [FR-023]
  - `recalculateNextReview: false` (default): preserves existing nextReviewDate [FR-025]
  - `recalculateNextReview: true`: sets nextReviewDate to today + interval [FR-026]
  - Setting interval on project WITHOUT one: sets initial nextReviewDate to today + interval [FR-027]
  - Returns updated project data with new reviewInterval [FR-028]
  - Project lookup by ID [FR-029]
  - Project lookup by name [FR-029]
  - Disambiguation error with candidates [FR-030]
  - Batch with multiple projects: same interval applied to all [FR-030a, FR-030b]
  - Per-item results in batch [FR-030c]
  - Partial batch failure [FR-030d]
  - Original array indices preserved [FR-030e]
  - Value object semantics: full reassignment of reviewInterval (not property modification)
  - OmniJS error returns structured error [FR-031]
  - `generateSetReviewIntervalScript()` produces valid OmniJS

  **FRs covered**: FR-021 through FR-030e, FR-031

- [x] T014 [P] [US3] Implement setReviewInterval primitive in `src/tools/primitives/setReviewInterval.ts`

  **Pattern**: Follow `src/tools/primitives/editProject.ts` structure.
  **Exports**: `setReviewInterval(params)` and `generateSetReviewIntervalScript(params)`.
  **Reference OmniJS**: `specs/005-review-system/quickstart.md` lines 290-388 (set_review_interval pattern).
  **Contract types**: Import `SetReviewIntervalInput`, `SetReviewIntervalResponse` from contracts.

  **Implementation details**:
  - Accept `projects` array, `interval` (object or null), `recalculateNextReview` (boolean)
  - For each project: lookup by ID or name, handle disambiguation
  - If `interval === null`: set `project.reviewInterval = null` AND `project.nextReviewDate = null`
  - If `interval !== null`:
    - Reassign entire object: `project.reviewInterval = { steps: interval.steps, unit: interval.unit }` (value object semantics!)
    - If `project.nextReviewDate` is null OR `recalculateNextReview === true`: calculate `today + interval` using Calendar API
    - Otherwise: preserve existing `nextReviewDate`
  - Return per-item results with `previousInterval` and `newInterval`
  - Wrap in try-catch with JSON error returns
  - Escape all string inputs

  **FRs covered**: FR-021 through FR-030e, FR-031, FR-034, FR-035, FR-036

- [x] T015 [P] [US3] Implement setReviewInterval definition in `src/tools/definitions/setReviewInterval.ts`

  **Pattern**: Follow `src/tools/definitions/listProjects.ts` exactly.
  **Exports**: `schema` and `handler(params)`.

- [x] T016 [US3] Register set_review_interval tool in `src/server.ts`

  **Changes**:
  - Add import: `import * as setReviewIntervalTool from './tools/definitions/setReviewInterval.js';`
  - Add registration: `server.tool('set_review_interval', 'Configure the review frequency for one or more projects, or disable reviews by setting interval to null', setReviewIntervalTool.schema.shape, setReviewIntervalTool.handler);`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Dependencies**: All user story phases (3, 4, 5) must complete first.

- [x] T017 Integration test for review workflow round-trip in `tests/integration/review-tools/review-workflow.integration.test.ts`

  **Pattern**: Follow `tests/integration/project-tools/createProject.integration.test.ts` structure.
  **Note**: Integration tests require OmniFocus to be running on the test machine.

  **Test scenarios** (SC-007: round-trip verification):
  - Set review interval on a project → mark reviewed → verify nextReviewDate calculation → get projects for review (verify project appears/disappears correctly)
  - Batch mark_reviewed with mixed valid/invalid projects → verify partial success
  - Disable reviews (null interval) → verify project excluded from get_projects_for_review results
  - Date calculation accuracy: set 1-week interval → mark reviewed → verify nextReviewDate = today + 7 days
  - Month boundary edge case: verify Calendar API handles Jan 31 + 1 month → Feb 28 (if testable)
  - SC-001 performance: verify get_projects_for_review completes in < 500ms (manual verification with large database; automated test asserts response structure only)

  **SCs covered**: SC-001 through SC-007

- [x] T018 Run full verification: `pnpm typecheck && pnpm build && pnpm test`

  **Acceptance criteria**:
  - TypeScript compilation passes with zero errors
  - Build produces `dist/` output
  - All existing tests still pass (1708+ existing)
  - All new review-tools tests pass
  - No regressions in other tool tests

- [x] T019 Update CLAUDE.md Phase 5 completion status

  **Changes to CLAUDE.md**:
  - Update "Recent Changes" section with Phase 5 Review System completion
  - Update tool count in project overview (add 3 new tools)
  - Add review tools to key OmniJS APIs list

---

## Dependencies

```text
Phase 2 (T001: Shared schema tests)
├── Phase 3 (T002-T006: US1 get_projects_for_review)
├── Phase 4 (T007-T011: US2 mark_reviewed) [P]
└── Phase 5 (T012-T016: US3 set_review_interval) [P]
    ↓
Phase 6 (T017-T019: Integration, verification, docs)
```

**Critical path**: T001 → T002 → T003 → T004 → T005 → T006 → T017 → T018 → T019

**Parallel paths** (after T001):
- Path A: T002 → T003 → T004 → T005 → T006 (US1)
- Path B: T007 → T008 → T009 → T010 → T011 (US2) [P with C]
- Path C: T012 → T013 → T014 → T015 → T016 (US3) [P with B]

## Parallel Execution Examples

### Per-Story (within a single story)

Tasks within a story are **sequential** (TDD cycle):
```
Contract Test (RED) → Unit Test (RED) → Primitive (GREEN) → Definition → Register
```

### Cross-Story (between stories)

After Phase 2 foundational completes, US2 and US3 can execute in parallel:

```text
Agent 1: T007 → T008 → T009 → T010 → T011
Agent 2: T012 → T013 → T014 → T015 → T016
```

**Server registration** (T006, T011, T016) must be sequential since they modify the same file (`src/server.ts`). If running parallel agents, consolidate server registration after all 3 primitives and definitions are complete.

### Maximum Parallelism (3 agents)

If all 3 stories are independent (they are), all can start simultaneously:

```text
Agent 1: T002 → T003 → T004 → T005 → T006
Agent 2: T007 → T008 → T009 → T010 → T011
Agent 3: T012 → T013 → T014 → T015 → T016
```

Consolidate T006/T011/T016 (server.ts changes) at the end to avoid conflicts.

## FR Traceability

| FR | Task(s) | Phase |
|----|---------|-------|
| FR-001 through FR-011b (incl. FR-004a, FR-008a, FR-008b, FR-011a, FR-011b) | T002, T003, T004 | Phase 3 (US1) |
| FR-012 through FR-020 | T007, T008, T009 | Phase 4 (US2) |
| FR-021 through FR-030e | T012, T013, T014 | Phase 5 (US3) |
| FR-031 through FR-033 | T001, T003, T008, T013 | All phases |
| FR-034 through FR-036 | T009, T014 | Phase 4, 5 |
| SC-001 through SC-007 | T017 | Phase 6 |
