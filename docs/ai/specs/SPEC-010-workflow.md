# SpecKit Workflow: SPEC-010 — Bulk Operations

**Created**: 2026-03-18
**Purpose**: Track SPEC-010 through all 7 SpecKit phases with review gates.

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ✅ Complete | 17 FRs, 6 stories, 35 scenarios |
| Clarify | `/speckit.clarify` | ✅ Complete | 2 sessions, 10 questions answered; return types, position types, batch_update_tasks design clarified |
| Plan | `/speckit.plan` | ✅ Complete | 8 ADs, 8 RTs, 8 contract files, 10/10 constitution pass |
| Checklist | `/speckit.checklist` | ✅ Complete | 3 domains (150 items), 14 gaps remediated |
| Tasks | `/speckit.tasks` | ✅ Complete | 63 tasks, 8 phases, 21 parallel, 6/6 US covered |
| Analyze | `/speckit.analyze` | ✅ Complete | 0 CRITICAL, 2 HIGH, 3 MEDIUM — all remediated |
| Implement | `/speckit.implement` | 🔄 In Progress | omnifocus-developer agent, TDD |

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

**Before starting any workflow phase**, verify alignment with the project constitution (`.specify/memory/constitution.md` v2.0.0):

| Principle | Requirement | Verification | Status |
|-----------|-------------|--------------|--------|
| I. Type-First Development | All functions typed, Zod contracts | `pnpm typecheck` | ✅ Pass |
| II. Separation of Concerns | definitions/ + primitives/ split | Code review | ✅ 50 definitions, 50 primitives |
| III. Script Execution Safety | OmniJS-only, try-catch + JSON | Script Editor test | ✅ Existing patterns verified |
| IV. Structured Data Contracts | Zod schemas for all inputs | Contract tests | ✅ 8 contract dirs |
| V. Defensive Error Handling | Structured errors, no swallowed exceptions | Unit tests | ✅ 2823 tests pass |
| VI. Build Discipline | `pnpm build` after changes | `pnpm build` | ✅ Pass (ESM + CJS) |
| VII. KISS | Simple, boring solutions | Code review | ✅ Verified |
| VIII. YAGNI | No premature abstractions | Code review | ✅ Verified |
| IX. SOLID | Single responsibility | Code review | ✅ Verified |
| X. TDD | Red-Green-Refactor cycle | Test-first workflow | ✅ 125 test files |

**Constitution Check:** ✅ Verified 2026-03-18 — Constitution v2.0.0 (RATIFIED), all principles satisfied

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-010 |
| **Name** | Bulk Operations |
| **Branch** | `010-bulk-operations` |
| **Dependencies** | None (Phases 0-5 complete) |
| **Enables** | None directly (SPEC-020 requires all specs complete) |
| **Priority** | P2 |
| **Tier** | 3 (parallel with SPEC-012, SPEC-014) |

### Success Criteria Summary

- [ ] 6 MCP tools implemented: `move_tasks`, `duplicate_tasks`, `convert_tasks_to_projects`, `move_sections`, `duplicate_sections`, `batch_update_tasks`
- [ ] Zod contracts in `src/contracts/bulk-tools/`
- [ ] All tools accept arrays of IDs (1-100 items) with per-item success/failure results
- [ ] Position parameter follows established pattern: `{ placement: 'beginning'|'ending'|'before'|'after', relativeTo?: string }`
- [ ] `batch_update_tasks` accepts any combination of updatable properties in a single call
- [ ] `convert_tasks_to_projects` preserves subtasks as project tasks
- [ ] Full TDD with contract + unit tests
- [ ] OmniJS Script Editor verification (manual step)

---

## Phase 1: Specify

**Output:** `specs/010-bulk-operations/spec.md`

### Specify Prompt

```bash
/speckit.specify

## Feature: Bulk Operations

### Problem Statement
OmniFocus users need powerful bulk operations through the MCP server — moving and
duplicating tasks and sections, converting tasks to projects, and batch-updating task
properties. Currently, modifications must be done one item at a time, which is
inefficient for AI assistants performing reorganization, cleanup, or restructuring
workflows. These operations are essential power-user features for GTD system
maintenance.

### Users
GTD practitioners using AI assistants to reorganize, restructure, and maintain their
OmniFocus databases at scale.

### User Stories
1. As a GTD practitioner, I want to move multiple tasks to a new location (project, inbox, or parent task) so I can reorganize my task hierarchy efficiently
2. As a GTD practitioner, I want to duplicate multiple tasks to a new location so I can create templates or copy task structures
3. As a GTD practitioner, I want to convert tasks to projects so I can promote multi-step items discovered during reviews
4. As a GTD practitioner, I want to move sections (folders/projects) in the hierarchy so I can reorganize my Areas of Responsibility
5. As a GTD practitioner, I want to duplicate sections (folders/projects) with all contents so I can create project templates
6. As a GTD practitioner, I want to batch-update multiple task properties in a single operation so I can efficiently flag, date, or tag groups of tasks

### Technical Context from Master Plan
- 6 MCP tools: `move_tasks`, `duplicate_tasks`, `convert_tasks_to_projects`, `move_sections`, `duplicate_sections`, `batch_update_tasks`
- `move_tasks` calls `moveTasks(tasks, position)` — moves multiple tasks to a target location (project, inbox, or parent task) with position control
- `duplicate_tasks` calls `duplicateTasks(tasks, position)` — copies tasks with all properties to a new location
- `convert_tasks_to_projects` calls `convertTasksToProjects(tasks, folder)` — promotes tasks to top-level projects, preserving subtasks as project tasks
- `move_sections` calls `moveSections(sections, position)` — moves folders/projects in the hierarchy
- `duplicate_sections` calls `duplicateSections(sections, position)` — duplicates folders/projects with all contents
- `batch_update_tasks` iterates tasks and sets multiple properties (flagged, dueDate, deferDate, tags, etc.) in a single operation
- All tools accept arrays of IDs (1-100 items) with per-item success/failure results
- Position parameter follows established pattern: `{ placement: 'beginning'|'ending'|'before'|'after', relativeTo?: string }`

### Constraints
- All operations must use OmniJS execution via `executeOmniFocusScript()`
- Follow existing definitions/primitives/contracts architecture (50+ tools already established)
- Contracts go in `src/contracts/bulk-tools/`
- Definitions in `src/tools/definitions/`, primitives in `src/tools/primitives/`
- All OmniJS scripts must use the IIFE + try-catch + JSON.stringify pattern
- Batch operations must return per-item success/failure results (following Phase 5/13 batch pattern)
- `batch_update_tasks` is a "wide" tool — accepts any combination of updatable properties to minimize round-trips
- Conversion from task to project is one-way (OmniJS has no project-to-task conversion)
- Position parameter must be consistent with existing `move_project` and `move_folder` tools
- Use Zod 4.x for all input validation, no `as Type` assertions

### Key OmniJS APIs (from master plan)
- `moveTasks(tasks, position)` — moves array of Task objects to a Position
- `duplicateTasks(tasks, position)` — duplicates array of Task objects to a Position
- `convertTasksToProjects(tasks, folder)` — converts Task array to Project array in a folder
- `moveSections(sections, position)` — moves array of Section objects (folders/projects)
- `duplicateSections(sections, position)` — duplicates array of Section objects
- Position objects: `project.ending`, `project.beginning`, `project.before`, `project.after`
- Also: `folder.ending`, `folder.beginning`, `inbox.ending`, `inbox.beginning`
- Task property setters: `task.flagged`, `task.dueDate`, `task.deferDate`, `task.addTag()`, `task.removeTag()`, `task.note`

### Out of Scope
- Cross-database operations (single OmniFocus database only)
- Undo grouping for bulk operations (OmniJS limitation — each item modification is a separate undo step)
- Project-to-task conversion (not supported by OmniJS)
- Batch operations on more than 100 items (performance safeguard)
```

### Specify Results

| Metric | Value |
|--------|-------|
| Functional Requirements | 17 (FR-001 through FR-017) |
| User Stories | 6 (P1: 1, P2: 2, P3: 2, P4: 1) |
| Acceptance Criteria | 35 scenarios, 10 edge cases |

### Files Generated

- [x] `specs/010-bulk-operations/spec.md`
- [x] `specs/010-bulk-operations/checklists/requirements.md`

---

## Phase 2: Clarify

**When to run:** After Specify — OmniJS bulk API behavior needs verification.

### Clarify Prompts

#### Pre-Answered (from master plan — do not re-ask)

- `moveTasks()`, `duplicateTasks()`, `convertTasksToProjects()`, `moveSections()`, `duplicateSections()` are all established OmniJS APIs
- Position parameter pattern is established by existing `move_project` and `move_folder` tools
- Batch result pattern (per-item success/failure) is established by Phase 5 review tools and Phase 13 status tools
- 100-item limit is a project convention for batch operations

#### Session 1: OmniJS Bulk API Behavior

```bash
/speckit.clarify Focus on OmniJS bulk API behavior:
- What does `moveTasks(tasks, position)` return? The moved tasks array, void, or something else?
- What does `duplicateTasks(tasks, position)` return? The new duplicate Task objects?
- What does `convertTasksToProjects(tasks, folder)` return? The new Project objects?
- How does `moveSections()` differ from `moveTasks()` in terms of what constitutes a "section"?
- What happens when `moveTasks()` or `duplicateTasks()` is called with an invalid position (e.g., moving a task into itself)?
```

#### Session 2: batch_update_tasks Design

```bash
/speckit.clarify Focus on batch_update_tasks implementation:
- Should batch_update_tasks accept tag operations (add/remove/clear) or only simple property assignments?
- What properties should batch_update_tasks support? (flagged, dueDate, deferDate, note, estimatedMinutes, tags?)
- Should batch_update_tasks apply ALL properties to ALL tasks, or support per-task property overrides?
- How should partial failures work — if setting dueDate succeeds but addTag fails for one task, what's the result?
- Should batch_update_tasks support clearing properties (setting to null) in addition to setting values?
```

### Clarify Results

| Session | Focus Area | Questions | Key Outcomes |
|---------|------------|-----------|--------------|
| 1 | OmniJS Bulk APIs | 5 | Return types clarified (void/TaskArray/ProjectArray), position types differ for tasks vs sections, per-item calling pattern confirmed |
| 2 | batch_update_tasks Design | 5 | addTags+removeTags (no clearTags), 10 properties + 4 clear flags, uniform application, atomic per-task partial failure, explicit clear flags |

---

## Phase 3: Plan

**Output:** `specs/010-bulk-operations/plan.md`

### Plan Prompt

```bash
/speckit.plan

## Tech Stack
- Runtime: Node.js 24+ with TypeScript 5.9+ strict mode (ES2024 target)
- Build: tsup 8.5+ (ESM + CJS dual output)
- Testing: Vitest 4.0+ with TDD Red→Green→Refactor
- Validation: Zod 4.2.x for all contracts
- MCP SDK: @modelcontextprotocol/sdk 1.27.x
- Lint: Biome 2.4+
- OmniJS: Pure Omni Automation JavaScript executed via `executeOmniFocusScript()`

## Constraints
- Follow existing definitions/primitives/contracts architecture (50+ tools established)
- Contracts go in `src/contracts/bulk-tools/`
- Definitions in `src/tools/definitions/`, primitives in `src/tools/primitives/`
- All OmniJS scripts use the IIFE + try-catch + JSON.stringify pattern
- Per-item success/failure results for all batch operations (Phase 5/13 pattern)
- Position parameter consistent with existing move_project and move_folder tools
- Use logger utility for all diagnostics (never console.error)

## Architecture Notes
- Mirror existing batch patterns from status-tools (mark_complete, mark_incomplete, drop_items)
- Per-item result shape: `{ id: string, success: boolean, error?: string }`
- Position object construction in OmniJS: `project.ending`, `folder.beginning`, etc.
- `batch_update_tasks` is intentionally "wide" — accepts any combination of updatable properties
- `convert_tasks_to_projects` returns new project IDs mapped from original task IDs
- All 6 tools share common batch infrastructure (ID resolution, result aggregation)
- Consider shared schemas for Position, BatchItemResult, ItemIdentifier (reuse from status-tools if compatible)
```

### Plan Results

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ✅ | 8 architecture decisions, constitution gates 10/10 PASS |
| `research.md` | ✅ | 8 research tasks resolved (RT-01 through RT-08) |
| `data-model.md` | ✅ | 6 shared schemas, 9 error codes |
| `contracts/` | ✅ | 8 files (shared + 6 tools + index) |
| `quickstart.md` | ✅ | OmniJS patterns for all 6 tools |

---

## Phase 4: Domain Checklists

### Recommended Domains

| Signal in Spec/Plan | Recommended Domain | Justification |
|---|---|---|
| 6 tool contracts, batch results, position schemas | **api-contracts** | Complex shared schemas across 6 tools |
| Zod 4.x, no `as Type`, per-item result typing | **type-safety** | Batch result generics, position type narrowing |
| OmniJS bulk APIs, position construction, error handling | **api-workaround** | Multiple OmniJS APIs with unverified edge cases |

#### 1. api-contracts Checklist

Why: 6 tools with shared batch result schemas, position parameter, and a "wide" batch_update_tasks tool with many optional fields.

```bash
/speckit.checklist api-contracts

Focus on Bulk Operations requirements:
- Shared batch result schema across all 6 tools (ItemIdentifier, BatchItemResult, Summary)
- Position parameter schema (placement enum + optional relativeTo ID)
- `batch_update_tasks` input schema with all optional property fields
- `convert_tasks_to_projects` response mapping (taskId → projectId)
- Per-item success/failure with structured error codes
- Pay special attention to: batch_update_tasks "wide" input — how to validate at least one property is provided
```

#### 2. type-safety Checklist

Why: Batch operations with per-item results need careful typing. The "wide" batch_update_tasks tool has complex optional field validation.

```bash
/speckit.checklist type-safety

Focus on Bulk Operations requirements:
- Zod 4.x schemas for all 6 tool inputs and outputs
- No `as Type` assertions anywhere
- Position type with conditional `relativeTo` (required when placement is 'before'|'after')
- batch_update_tasks: at least one property must be provided (Zod refinement)
- BatchItemResult discriminated union for success/failure per item
- Pay special attention to: shared schema reuse from existing status-tools batch patterns
```

#### 3. api-workaround Checklist

Why: OmniJS bulk APIs (`moveTasks`, `duplicateTasks`, `convertTasksToProjects`, `moveSections`, `duplicateSections`) have undocumented edge cases and return types.

```bash
/speckit.checklist api-workaround

Focus on Bulk Operations requirements:
- `moveTasks(tasks, position)` return value and error behavior
- `duplicateTasks(tasks, position)` return value — does it return new Task objects?
- `convertTasksToProjects(tasks, folder)` return value and subtask preservation
- Position object construction patterns (`project.ending`, `folder.beginning`, `inbox.ending`)
- What happens when moving/duplicating to an invalid target (task into itself, project into its own subtask)?
- Pay special attention to: `moveSections()` vs `moveTasks()` — what qualifies as a "section"?
```

### Checklist Results

| Checklist | Items | Gaps | Spec References |
|-----------|-------|------|-----------------|
| api-contracts | 57 | 0 | FR-001–FR-017 |
| type-safety | 38 | 5 (all remediated) | AD-09, AD-10 added; quickstart.md fixed |
| api-workaround | 55 | 9 (all remediated) | AD-11–AD-15 added; 4 edge cases added |
| **Total** | **150** | **14 (all remediated)** | |

---

## Phase 5: Tasks

**Output:** `specs/010-bulk-operations/tasks.md`

### Tasks Prompt

```bash
/speckit.tasks

## Task Structure
- Small, testable chunks (1-2 hours each)
- Clear acceptance criteria referencing FR-xxx
- Dependency ordering: foundation → individual tools → integration → validation
- Mark parallel-safe tasks explicitly with [P]
- Organize by user story, not by technical layer

## Implementation Phases
1. Foundation (shared schemas, contracts infrastructure, position type)
2. Move Tasks (US1) — independently testable [P]
3. Duplicate Tasks (US2) — independently testable [P]
4. Convert Tasks to Projects (US3) — independently testable [P]
5. Move Sections (US4) — independently testable [P]
6. Duplicate Sections (US5) — independently testable [P]
7. Batch Update Tasks (US6) — independently testable [P]
8. Integration testing & polish

## Constraints
- Contracts in `src/contracts/bulk-tools/`
- Definitions in `src/tools/definitions/`
- Primitives in `src/tools/primitives/`
- Tests: `tests/contract/bulk-tools/`, `tests/unit/bulk-tools/`
- TDD: Red→Green→Refactor for every task
- Mirror batch patterns from status-tools (mark_complete, drop_items)
```

### Tasks Results

| Metric | Value |
|--------|-------|
| **Total Tasks** | 63 |
| **Phases** | 8 (1 Foundation, 6 User Stories, 1 Polish) |
| **Parallel Opportunities** | 21 tasks (33%) marked [P] |
| **User Stories Covered** | 6/6 (all FR-001 through FR-017 traced) |

---

## Phase 6: Analyze

### Analyze Prompt

```bash
/speckit.analyze

Focus on:
1. Constitution alignment — verify coding standards compliance
2. Coverage gaps — ensure all 6 user stories and all FRs have tasks
3. Consistency between task file paths and actual project structure
4. Verify batch result schemas are consistent across all 6 tools
5. Verify position parameter handling is consistent with existing move_project/move_folder
6. Verify batch_update_tasks covers all documented updatable properties
```

### Analysis Results

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| F1 | HIGH | plan.md listed `tests/unit/primitives/` but codebase uses `tests/unit/bulk-tools/` | ✅ Fixed path in plan.md |
| R1 | MEDIUM | AD-08 error codes didn't distinguish per-item vs top-level | ✅ Rewrote AD-08 with clear separation |
| C1 | MEDIUM | T021 missing FR-015 property preservation test coverage | ✅ Added explicit FR-015 reference |
| B1 | MEDIUM | T033 missing US3 acceptance scenario references | ✅ Added scenario 7/8 references |
| P1 | MEDIUM | T045 missing SectionPosition placement-required test note | ✅ Added placement validation note |

---

## Phase 7: Implement

### Implement Prompt

```bash
/speckit.implement

## Approach: TDD-First

For each task, follow this cycle:

1. **RED**: Write failing test defining expected behavior
2. **GREEN**: Implement minimum code to make test pass
3. **REFACTOR**: Clean up while tests still pass
4. **VERIFY**: Manual verification of acceptance criteria

### Pre-Implementation Setup

1. Verify worktree: `git branch` shows `010-bulk-operations`
2. Verify baseline: `pnpm test` — all existing tests pass
3. Verify build: `pnpm build` — clean
4. Verify lint: `pnpm lint` — clean
5. Create spec output dir: `specs/010-bulk-operations/`

### Implementation Notes
- Mirror existing batch tool patterns (find mark_complete or drop_items and follow their structure)
- Position parameter: look at move_project primitive for the OmniJS position construction pattern
- batch_update_tasks: iterate tasks, apply each property individually, collect per-item results
- Register all 6 tools in `src/server.ts`
- Run `pnpm build` after every source change
- Use logger utility for all diagnostics
```

### Implementation Progress

| Phase | Tasks | Completed | Notes |
|-------|-------|-----------|-------|
| 1 - Foundation | | | Shared schemas, contracts, position type |
| 2 - Move Tasks | | | |
| 3 - Duplicate Tasks | | | |
| 4 - Convert to Projects | | | |
| 5 - Move Sections | | | |
| 6 - Duplicate Sections | | | |
| 7 - Batch Update Tasks | | | |
| 8 - Integration & Polish | | | Server registration, build, final tests |

---

## Post-Implementation Checklist

- [ ] All tasks marked complete in tasks.md
- [ ] Typecheck passes: `pnpm typecheck` (0 errors)
- [ ] Tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build` (ESM + CJS clean)
- [ ] Lint passes: `pnpm lint`
- [ ] All 6 tools registered in `src/server.ts`
- [ ] Manual OmniJS Script Editor verification
- [ ] PR created targeting `main`
- [ ] Merged to main branch
- [ ] Master plan progress tracking updated

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
src/
├── server.ts                          # MCP server entry point (register 6 new tools here)
├── contracts/
│   └── bulk-tools/                    # NEW: Zod contracts for 6 bulk tools + shared schemas
├── tools/
│   ├── definitions/                   # NEW: 6 tool definition files
│   └── primitives/                    # NEW: 6 primitive files
tests/
├── contract/
│   └── bulk-tools/                    # NEW: Contract tests
├── unit/
│   └── bulk-tools/                    # NEW: Unit tests
└── integration/
    └── bulk-operations/               # NEW: Integration tests (optional)
specs/
└── 010-bulk-operations/               # Spec artifacts
```
