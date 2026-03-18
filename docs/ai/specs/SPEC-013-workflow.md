# SpecKit Workflow: SPEC-013 — Task Status & Completion

**Created**: 2026-03-17
**Purpose**: Track SPEC-013 through all 7 SpecKit phases with review gates.

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ✅ Complete | 6 stories, 12 FRs, 8 SCs |
| Clarify | `/speckit.clarify` | ✅ Complete | 6 API questions resolved via docs, 0 user questions needed |
| Plan | `/speckit.plan` | ✅ Complete | 4 artifacts: plan.md, research.md, data-model.md, quickstart.md |
| Checklist | `/speckit.checklist` | ✅ Complete | api-workaround (36 items, 0 gaps); type-safety (40 items, 0 gaps); requirements (42 items, 0 gaps) |
| Tasks | `/speckit.tasks` | ✅ Complete | 55 tasks, 9 phases, 6 US parallel after foundation |
| Analyze | `/speckit.analyze` | ✅ Complete | 0 CRITICAL, 0 HIGH; 5 findings (2 MEDIUM, 3 LOW) all remediated |
| Implement | `/speckit.implement` | ✅ Complete | 55/55 tasks, 367 new tests, 6 tools registered |

**Status Legend:** ⏳ Pending | 🔄 In Progress | ✅ Complete | ⚠️ Blocked

### Phase Gates

| Gate | Checkpoint | Approval Criteria |
|------|------------|-------------------|
| G1 | After Specify | All user stories clear, no `[NEEDS CLARIFICATION]` markers |
| G2 | After Clarify | Ambiguities resolved, decisions documented |
| G3 | After Plan | Architecture approved, constitution gates pass |
| G4 | After Checklist | All `[Gap]` markers addressed |
| G5 | After Tasks | Task coverage verified, dependencies ordered |
| G6 | After Analyze | No `CRITICAL` issues |
| G7 | After Implement | Tests pass, manual verification complete |

---

## Prerequisites

### Constitution Validation

| Principle | Requirement | Verification | Status |
|-----------|-------------|--------------|--------|
| Type Safety | Zod schemas for all inputs, no `as Type` | `pnpm typecheck` | ✅ Clean |
| Test-First | TDD Red→Green→Refactor | `pnpm test` | ✅ 1924 tests / 90 files |
| OmniJS-First | All operations via OmniJS execution | Code review | ✅ Verified |
| Simplicity | Single responsibility, no premature abstractions | Code review | ✅ Verified |
| Build | Compiles to dist/ (ESM + CJS) | `pnpm build` | ✅ Clean |
| Lint | Source + tests pass Biome checks | `pnpm biome check ./src ./tests` | ✅ 254 files, 0 errors |
| Branch | Correct worktree branch | `git branch` | ✅ `worktree-013-task-status` |
| Working Tree | Clean (no unrelated changes) | `git status` | ✅ Clean (only workflow edits) |

**Constitution Check:** ✅ Passed (2026-03-17)

**Baseline Snapshot:**

- Typecheck: clean
- Tests: 1924 passing / 90 files
- Build: clean (ESM 273KB + CJS 280KB)
- Lint (src/tests): 254 files, 0 errors
- Note: `.claude/settings.local.json` has 1 Biome formatting nit (not source code, not blocking)
- Spec output dir: `specs/013-task-status/` created (Phase 1 complete)

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-013 |
| **Name** | Task Status & Completion |
| **Branch** | `worktree-013-task-status` |
| **Dependencies** | None (Phases 0-5 complete) |
| **Enables** | None |
| **Priority** | P1 |

### Success Criteria Summary

- [x] 6 MCP tools implemented: `mark_complete`, `mark_incomplete`, `drop_items`, `set_project_type`, `get_next_task`, `set_floating_timezone`
- [x] Zod contracts in `src/contracts/status-tools/` for all 6 tools
- [x] `mark_complete` supports optional completion date via `task.markComplete(date?)`
- [x] `mark_incomplete` reopens completed/dropped items
- [x] `drop_items` uses OmniJS v3.8+ `drop(allOccurrences)` with version detection
- [x] `set_project_type` handles mutual exclusion (containsSingletonActions wins over sequential)
- [x] `get_next_task` reads `project.nextTask` for sequential projects
- [x] `set_floating_timezone` controls `shouldUseFloatingTimeZone` on tasks/projects
- [x] Batch support for `mark_complete`, `mark_incomplete`, `drop_items` (1-100 items)
- [x] Per-item success/failure results with structured error codes
- [x] Full TDD with contract + unit tests
- [ ] OmniJS Script Editor verification (deferred — manual step)

---

## Phase 1: Specify

**Output:** `specs/013-task-status/spec.md`

### Specify Prompt

```bash
/speckit.specify

## Feature: Task Status & Completion

### Problem Statement
OmniFocus users need explicit task/project lifecycle operations through the MCP server.
Currently there is no way to complete, drop, reopen, or configure project types via AI assistants.
While edit_project handles some project properties, dedicated status lifecycle tools are needed
for clean GTD workflow management.

### Users
GTD practitioners using AI assistants to manage OmniFocus task lifecycles.

### User Stories
1. As a GTD practitioner, I want to mark tasks complete (optionally with a specific completion date) so I can close out work
2. As a GTD practitioner, I want to mark tasks incomplete so I can reopen completed/dropped items
3. As a GTD practitioner, I want to drop tasks/projects so they are preserved but removed from active views (distinct from delete)
4. As a GTD practitioner, I want to set project type (sequential, parallel, single actions) so tasks are ordered correctly
5. As a GTD practitioner, I want to get the next available task in a sequential project for focused execution
6. As a GTD practitioner, I want to set floating timezone on tasks/projects so dates follow my device timezone when traveling

### Technical Context from Master Plan
- 6 MCP tools: mark_complete, mark_incomplete, drop_items, set_project_type, get_next_task, set_floating_timezone
- mark_complete: task.markComplete(date?) or project.markComplete() — optional completion date
- mark_incomplete: task.markIncomplete() — reopens completed/dropped items
- drop_items: OmniJS v3.8+ drop(allOccurrences) — distinct from delete, marks as dropped
- set_project_type: sequential/containsSingletonActions flags — mutual exclusion (containsSingletonActions wins, matching Phase 4 pattern)
- get_next_task: project.nextTask — next available task in sequential project
- set_floating_timezone: shouldUseFloatingTimeZone — controls timezone behavior
- Batch support for mark_complete, mark_incomplete, drop_items (1-100 items, Phase 5 batch pattern)
- Per-item success/failure results with structured error codes

### Constraints
- Follow definitions/primitives separation pattern from existing tools
- All OmniJS scripts must use try-catch with JSON.stringify returns
- Zod 4.x for all input validation
- drop_items requires v3.8+ API — version detection with clear error for older OmniFocus
- set_project_type follows Phase 4 mutual exclusion pattern

### Out of Scope
- Task status querying (already handled by list_tasks status filter from Phase 3)
- Project status changes (already handled by edit_project from Phase 4)
```

### Specify Results

| Metric | Value |
|--------|-------|
| Functional Requirements | 12 (FR-001 through FR-012) |
| User Stories | 6 (P1: 1, P2: 2, P3: 2, P4: 1) |
| Acceptance Criteria | 24 acceptance scenarios |
| Edge Cases | 6 identified |
| Success Criteria | 8 measurable outcomes |
| Assumptions | 7 documented |
| Checklist | 16/16 passing |

### Files Generated

- [x] `specs/013-task-status/spec.md`
- [x] `specs/013-task-status/checklists/requirements.md`

---

## Phase 2: Clarify (Optional but Recommended)

### Clarify Prompts

#### Session 1: OmniJS API Focus

```bash
/speckit.clarify Focus on OmniJS API: drop(allOccurrences) behavior and v3.8+ version detection, markComplete(date) parameter format, markIncomplete() on dropped vs completed items, project.nextTask return value when no tasks available
```

#### Session 2: Edge Cases Focus

```bash
/speckit.clarify Focus on edge cases: dropping already-dropped items, marking complete an already-complete task, set_project_type on a project with active tasks (does changing to sequential reorder?), get_next_task on parallel/single-action projects, floating timezone on tasks with no dates
```

### Clarify Results

| Session | Focus Area | Questions | Key Outcomes |
|---------|------------|-----------|--------------|
| 1 | OmniJS API | 6 resolved via docs | `drop(allOccurrences)` param, `markComplete(Date)` format, `markIncomplete()` only for completed (not dropped), `project.nextTask` returns null, version detection via `app.userVersion`, projects lack `drop()` method |
| 2 | Edge Cases | Folded into Session 1 | Single-actions `nextTask` distinction, dropped vs completed `markIncomplete` mechanism, allOccurrences default=true |

---

## Phase 3: Plan

**Output:** `specs/013-task-status/plan.md`

### Plan Prompt

```bash
/speckit.plan

## Tech Stack
- Runtime: Node.js 24+
- Language: TypeScript 5.9+ (strict mode, ES2024 target)
- Build: tsup 8.5+
- Test: Vitest 4.0+
- Lint: Biome 2.3+
- MCP SDK: @modelcontextprotocol/sdk 1.27.x
- Validation: Zod 4.x

## Constraints
- Follow existing tool pattern: definitions/ for MCP handlers, primitives/ for business logic
- OmniJS scripts via executeOmniFocusScript() with temp files
- Contracts in src/contracts/status-tools/
- Use logger utility for all diagnostics (never console.error)
- drop_items requires OmniJS v3.8+ — include version detection

## Architecture Notes
- Mirror existing patterns from review-tools (005) for batch operations
- Batch pattern: 1-100 items per call, per-item success/failure results
- set_project_type mutual exclusion follows Phase 4 edit_project pattern
- Version detection for drop API — fail gracefully with actionable error message
```

### Plan Results

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ✅ | Architecture, project structure, constitution checks, implementation strategy |
| `research.md` | ✅ | 10 API findings, 7 decisions with rationale |
| `data-model.md` | ✅ | 8 entity definitions, state transitions, validation rules, OmniJS mapping |
| `contracts/` | ✅ (design) | 6 tool contracts designed in data-model.md, Zod schemas in Phase 2 |
| `quickstart.md` | ✅ | OmniJS patterns for all 6 tools + shared lookup helper |

---

## Phase 4: Domain Checklists

### Recommended Domains

| Signal | Domain | Justification |
|--------|--------|---------------|
| OmniJS v3.8+ API, drop() workaround | **api-workaround** | Version detection, drop vs delete semantics |
| Zod contracts, batch validation | **type-safety** | 6 contracts, batch schemas, mutual exclusion |
| Requirements coverage | **requirements** | Ensure all 6 user stories + batch support covered |

### Checklist Prompts

#### 1. API Workaround Checklist

```bash
/speckit.checklist api-workaround

Focus on Task Status & Completion requirements:
- drop(allOccurrences) v3.8+ API and version detection
- markComplete(date?) optional date parameter format
- markIncomplete() on dropped vs completed items
- project.nextTask return value when no tasks available
- Pay special attention to: version detection for drop API — must fail gracefully
```

#### 2. Type Safety Checklist

```bash
/speckit.checklist type-safety

Focus on Task Status & Completion requirements:
- Zod schemas for all 6 tools (input + output)
- Batch input validation (1-100 items)
- Per-item result types with success/failure discriminant
- set_project_type mutual exclusion validation
- Pay special attention to: optional completion date format in mark_complete
```

#### 3. Requirements Checklist

```bash
/speckit.checklist requirements

Focus on Task Status & Completion requirements:
- All 6 user stories have functional requirements
- Batch operations for mark_complete, mark_incomplete, drop_items
- Edge cases: already-complete, already-dropped, no next task
- Pay special attention to: floating timezone scope (tasks AND projects)
```

### Checklist Results

| Checklist | Items | Gaps | Spec References |
|-----------|-------|------|-----------------|
| api-workaround | 36 | 0 (3 remediated: 2 via Tavily, 1 via codebase disambiguation pattern) | Spec §Clarifications, §Assumptions, Data-model §DropItemsInput/§Single-Item Response, Research §Decisions |
| type-safety | 40 | 0 (4 remediated: 3 via codebase pattern, 1 via disambiguation format) | Data-model §MarkCompleteInput, §Validation Rules, §Batch Response, §Single-Item Response |
| requirements | 42 | 0 (2 remediated: Out of Scope section added, array index guarantee added) | Spec §US1-US6, §FR-001-012, §SC-001-008, §Assumptions, §Edge Cases, §Out of Scope |

---

## Phase 5: Tasks

**Output:** `specs/013-task-status/tasks.md`

### Tasks Prompt

```bash
/speckit.tasks

## Task Structure
- Small, testable chunks (1-2 hours each)
- Clear acceptance criteria referencing FR-xxx
- Dependency ordering: contracts → primitives → definitions → integration
- Mark parallel-safe tasks explicitly with [P]
- Organize by user story

## Implementation Phases
1. Foundation (shared schemas, contracts, batch utilities)
2. Mark Complete (US1) — independently testable
3. Mark Incomplete (US2) — independently testable
4. Drop Items (US3) — independently testable, requires version detection
5. Set Project Type (US4) — independently testable
6. Get Next Task (US5) — independently testable
7. Set Floating Timezone (US6) — independently testable
8. Server registration & integration

## Constraints
- Contracts in src/contracts/status-tools/
- Primitives in src/tools/primitives/
- Definitions in src/tools/definitions/
- Tests in tests/unit/status-tools/ and tests/contracts/status-tools/
```

### Tasks Results

| Metric | Value |
|--------|-------|
| **Total Tasks** | 55 (post-analysis: +2 from remediations) |
| **Phases** | 9 (Setup, Foundation, US1-US6, Integration) |
| **Parallel Opportunities** | 6 user stories can run simultaneously after Foundation |
| **User Stories Covered** | 6/6 (US1-US6) mapping to all 12 FRs |
| **Tasks per User Story** | 7 each (2 RED + 4 GREEN + 1 REFACTOR) |
| **Foundation Tasks** | 6 (directory setup + 5 shared schemas incl. disambiguation) |
| **Integration Tasks** | 7 (barrel export + integration scaffold + 4 verification + CLAUDE.md) |
| **MVP Scope** | US1 Mark Complete (Phases 1-3, 13 tasks) |

---

## Phase 6: Analyze

### Analyze Prompt

```bash
/speckit.analyze

Focus on:
1. Constitution alignment — Zod validation, TDD, OmniJS-first
2. Coverage gaps — all 6 user stories and FRs have tasks
3. File path consistency with project structure
4. Verify batch operations follow Phase 5 review-system pattern
5. Verify version detection for drop API is covered
```

### Analysis Results

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| C1 | MEDIUM | Plan references `tests/integration/status-tools/` but no task created it | Added T050 integration scaffold + T001 directory; follows `review-workflow.integration.test.ts` pattern |
| C2 | MEDIUM | FR-011 (repeating task clone) not explicitly in any test task | Amended T013: added repeating task clone verification to Script Editor step |
| C3 | LOW | Duplicate-in-batch edge case (spec §Edge Cases §5) had no explicit test | Amended T008: added duplicate identifiers test case |
| C4 | LOW | T002 had unnecessary `[P]` marker (sole RED task in Phase 2) | Removed `[P]` from T002 |
| C5 | LOW | Single-item tools needed DisambiguationErrorSchema but no task specified creating it | Added T005: `shared/disambiguation.ts` following per-domain codebase pattern |

**Constitution Alignment**: All 10 principles PASS — 0 violations
**FR Coverage**: 12/12 (100%) — FR-011 now explicitly covered via T013
**Batch Pattern**: Fully consistent with Phase 5 review-tools
**Version Detection**: Fully covered (test T022, impl T024, verify T027)

---

## Phase 7: Implement

### Implement Prompt

```bash
/speckit.implement

## Approach: TDD-First

For each task:
1. RED: Write failing test
2. GREEN: Minimum code to pass
3. REFACTOR: Clean up
4. VERIFY: pnpm build && pnpm test

### Pre-Implementation
1. pnpm install
2. pnpm build (verify clean)
3. pnpm test (verify baseline)
4. Branch: worktree-013-task-status

### Implementation Notes
- Mirror review-tools pattern for batch contract structure
- Test OmniJS scripts in Script Editor before integrating
- Use logger utility, never console.error
- All text files end with newline
- Version detection for drop API — test with mock version responses
```

### Implementation Progress

| Phase | Tasks | Completed | Notes |
|-------|-------|-----------|-------|
| 1 - Setup | T001 | 1/1 | Directory structure created |
| 2 - Foundation | T002-T006 | 5/5 | 27 contract tests, 4 shared schemas |
| 3 - Mark Complete | T007-T013 | 7/7 | 68 tests (39 contract + 29 unit) |
| 4 - Mark Incomplete | T014-T020 | 7/7 | 50 tests (25 contract + 25 unit) |
| 5 - Drop Items | T021-T027 | 7/7 | 65 tests (34 contract + 31 unit) |
| 6 - Set Project Type | T028-T034 | 7/7 | 62 tests (42 contract + 20 unit) |
| 7 - Get Next Task | T035-T041 | 7/7 | 47 tests (28 contract + 19 unit) |
| 8 - Set Floating Timezone | T042-T048 | 7/7 | 48 tests (29 contract + 19 unit) |
| 9 - Integration | T049-T055 | 7/7 | Barrel export, integration scaffold, all verifications pass |

**Total: 55/55 tasks complete. 367 new tests. 2291 total tests across 103 files.**

---

## Post-Implementation Checklist

- [x] All tasks marked complete in tasks.md (55/55)
- [x] `pnpm lint` passes (298 files, 0 errors)
- [x] `pnpm typecheck` passes (clean)
- [x] `pnpm test` passes (2291 tests, 103 files)
- [x] `pnpm build` succeeds (ESM 310KB + CJS 318KB)
- [ ] OmniJS scripts verified in Script Editor (deferred — manual step)
- [ ] Manual OmniFocus verification (deferred — manual step)
- [ ] PR created targeting `main`
- [x] CLAUDE.md updated with Phase 13 status-tools summary

---

## Lessons Learned

### What Worked Well

-

### Challenges Encountered

-

### Patterns to Reuse

-

---

## Project Structure Reference

```text
omnifocus-mcp/
├── src/
│   ├── server.ts                    # MCP server entry point
│   ├── contracts/status-tools/      # Zod contracts (NEW)
│   ├── tools/
│   │   ├── definitions/             # MCP tool handlers
│   │   └── primitives/              # Business logic
│   └── utils/
│       ├── omnifocusScripts/        # Pre-built OmniJS scripts
│       └── logger.ts                # MCP-compliant logger
├── tests/
│   ├── unit/status-tools/           # Unit tests (NEW)
│   └── contracts/status-tools/      # Contract tests (NEW)
└── specs/013-task-status/           # Spec artifacts (NEW)
```
