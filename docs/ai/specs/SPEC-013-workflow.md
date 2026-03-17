# SpecKit Workflow: SPEC-013 — Task Status & Completion

**Created**: 2026-03-17
**Purpose**: Track SPEC-013 through all 7 SpecKit phases with review gates.

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ⏳ Pending | |
| Clarify | `/speckit.clarify` | ⏳ Pending | Optional but recommended |
| Plan | `/speckit.plan` | ⏳ Pending | |
| Checklist | `/speckit.checklist` | ⏳ Pending | Run for each domain |
| Tasks | `/speckit.tasks` | ⏳ Pending | |
| Analyze | `/speckit.analyze` | ⏳ Pending | |
| Implement | `/speckit.implement` | ⏳ Pending | |

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

| Principle | Requirement | Verification |
|-----------|-------------|--------------|
| Type Safety | Zod schemas for all inputs, no `as Type` | `pnpm typecheck` |
| Test-First | TDD Red→Green→Refactor | `pnpm test` |
| OmniJS-First | All operations via OmniJS execution | Code review |
| Simplicity | Single responsibility, no premature abstractions | Code review |

**Constitution Check:** ⏳

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

- [ ] 6 MCP tools implemented: `mark_complete`, `mark_incomplete`, `drop_items`, `set_project_type`, `get_next_task`, `set_floating_timezone`
- [ ] Zod contracts in `src/contracts/status-tools/` for all 6 tools
- [ ] `mark_complete` supports optional completion date via `task.markComplete(date?)`
- [ ] `mark_incomplete` reopens completed/dropped items
- [ ] `drop_items` uses OmniJS v3.8+ `drop(allOccurrences)` with version detection
- [ ] `set_project_type` handles mutual exclusion (containsSingletonActions wins over sequential)
- [ ] `get_next_task` reads `project.nextTask` for sequential projects
- [ ] `set_floating_timezone` controls `shouldUseFloatingTimeZone` on tasks/projects
- [ ] Batch support for `mark_complete`, `mark_incomplete`, `drop_items` (1-100 items)
- [ ] Per-item success/failure results with structured error codes
- [ ] Full TDD with contract + unit tests
- [ ] OmniJS Script Editor verification

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
| Functional Requirements | |
| User Stories | 6 |
| Acceptance Criteria | |

### Files Generated

- [ ] `specs/013-task-status/spec.md`

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
| 1 | OmniJS API | | |
| 2 | Edge Cases | | |

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
| `plan.md` | ⏳ | |
| `research.md` | ⏳ | OmniJS status/drop API research |
| `data-model.md` | ⏳ | Status entities |
| `contracts/` | ⏳ | 6 tool contracts |
| `quickstart.md` | ⏳ | |

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
| api-workaround | | | |
| type-safety | | | |
| requirements | | | |

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
| **Total Tasks** | |
| **Phases** | |
| **Parallel Opportunities** | |
| **User Stories Covered** | |

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
| | | | |

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
| 1 - Foundation | | | |
| 2 - Mark Complete | | | |
| 3 - Mark Incomplete | | | |
| 4 - Drop Items | | | |
| 5 - Set Project Type | | | |
| 6 - Get Next Task | | | |
| 7 - Set Floating Timezone | | | |
| 8 - Integration | | | |

---

## Post-Implementation Checklist

- [ ] All tasks marked complete in tasks.md
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (all existing + new)
- [ ] `pnpm build` succeeds
- [ ] OmniJS scripts verified in Script Editor
- [ ] Manual OmniFocus verification
- [ ] PR created targeting `main`
- [ ] CLAUDE.md updated with phase status

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

```
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
