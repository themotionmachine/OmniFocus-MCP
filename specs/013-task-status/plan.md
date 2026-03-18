# Implementation Plan: Task Status & Completion

**Branch**: `worktree-013-task-status` | **Date**: 2026-03-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-task-status/spec.md`

## Summary

Task Status & Completion provides six MCP tools for managing OmniFocus
task/project lifecycle operations. Three batch tools handle the core GTD
workflow (complete, incomplete, drop) and three single-item tools handle
project configuration and querying.

**Primary Requirements:**
- `mark_complete`: Complete tasks/projects with optional date, batch 1-100 (FR-001, FR-004)
- `mark_incomplete`: Reopen completed/dropped items, batch 1-100 (FR-002, FR-004)
- `drop_items`: Drop tasks/projects with allOccurrences control, batch 1-100 (FR-003, FR-004)
- `set_project_type`: Set sequential/parallel/single-actions (FR-007)
- `get_next_task`: Query next available task in a project (FR-008)
- `set_floating_timezone`: Enable/disable floating timezone (FR-009)

**Technical Approach:**
- All operations use pure OmniJS via `executeOmniFocusScript()`
- Batch tools follow Phase 5 review-system pattern (per-item results, partial failures)
- `mark_incomplete` detects item state internally (completed vs dropped)
- `drop_items` requires v3.8+ with version detection; projects use status assignment
- `set_project_type` follows Phase 4 mutual exclusion pattern

## Technical Context

**Language/Version**: TypeScript 5.9+ with strict mode (ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.27.x, Zod 4.x, tsup 8.5+
**Storage**: N/A (OmniFocus internal database via OmniJS)
**Testing**: Vitest 4.0+ with V8 coverage
**Target Platform**: macOS (OmniFocus Pro with Omni Automation)
**Project Type**: Single project (established MCP server structure)
**Performance Goals**: <500ms for single-item operations; batch scales linearly
**Constraints**: OmniFocus 3.8+ required for `task.drop()` method; version detection provided
**Scale/Scope**: GTD practitioners, batch operations up to 100 items

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First Development | ✅ PASS | Zod schemas for all 6 tools, TypeScript strict mode |
| II. Separation of Concerns | ✅ PASS | Definitions in `definitions/`, primitives in `primitives/`, contracts in `contracts/status-tools/` |
| III. Script Execution Safety | ✅ PASS | All OmniJS wrapped in try-catch with JSON error returns |
| IV. Structured Data Contracts | ✅ PASS | Discriminated unions for responses, per-item batch results |
| V. Defensive Error Handling | ✅ PASS | Partial failures don't fail batch, version detection, disambiguation |
| VI. Build Discipline | ✅ PASS | Standard `pnpm build` workflow |
| VII. KISS | ✅ PASS | Follows established patterns from Phase 4/5, no over-engineering |
| VIII. YAGNI | ✅ PASS | Only spec'd requirements, no extras |
| IX. SOLID | ✅ PASS | Single responsibility per file, definitions/primitives separation |
| X. TDD | ✅ PASS | Contract tests → Unit tests → Implementation → Manual verification |

**Violations Requiring Justification**: None

## Project Structure

### Documentation (this feature)

```text
specs/013-task-status/
├── spec.md              # Feature specification ✅
├── research.md          # Phase 0 output (API research) ✅
├── plan.md              # This file ✅
├── data-model.md        # Phase 1 output (entity definitions) ✅
├── quickstart.md        # Phase 1 output (OmniJS patterns) ✅
├── checklists/          # Requirements checklist ✅
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── contracts/
│   └── status-tools/                  # NEW - Zod schemas
│       ├── shared/
│       │   ├── item-identifier.ts     # ItemIdentifierSchema (task or project)
│       │   ├── batch.ts               # StatusBatchItemResultSchema, SummarySchema
│       │   └── index.ts
│       ├── mark-complete.ts
│       ├── mark-incomplete.ts
│       ├── drop-items.ts
│       ├── set-project-type.ts
│       ├── get-next-task.ts
│       ├── set-floating-timezone.ts
│       └── index.ts
├── tools/
│   ├── definitions/
│   │   ├── markComplete.ts            # NEW
│   │   ├── markIncomplete.ts          # NEW
│   │   ├── dropItems.ts              # NEW
│   │   ├── setProjectType.ts         # NEW
│   │   ├── getNextTask.ts            # NEW
│   │   └── setFloatingTimezone.ts    # NEW
│   └── primitives/
│       ├── markComplete.ts            # NEW
│       ├── markIncomplete.ts          # NEW
│       ├── dropItems.ts              # NEW
│       ├── setProjectType.ts         # NEW
│       ├── getNextTask.ts            # NEW
│       └── setFloatingTimezone.ts    # NEW
└── server.ts                          # Tool registration (6 new tools)

tests/
├── contract/
│   └── status-tools/                  # NEW
│       ├── mark-complete.test.ts
│       ├── mark-incomplete.test.ts
│       ├── drop-items.test.ts
│       ├── set-project-type.test.ts
│       ├── get-next-task.test.ts
│       ├── set-floating-timezone.test.ts
│       └── shared-schemas.test.ts
├── unit/
│   └── status-tools/                  # NEW
│       ├── markComplete.test.ts
│       ├── markIncomplete.test.ts
│       ├── dropItems.test.ts
│       ├── setProjectType.test.ts
│       ├── getNextTask.test.ts
│       └── setFloatingTimezone.test.ts
└── integration/
    └── status-tools/                  # NEW
        └── status-workflow.integration.test.ts
```

**Structure Decision**: Single project layout following established Phase 4/5
patterns. Contracts in `src/contracts/status-tools/`, following `review-tools/`
and `project-tools/` organization with `shared/` subdirectory for reusable
schemas.

## Implementation Strategy

### Key OmniJS Patterns (from research.md)

**State Detection for mark_incomplete (CRITICAL):**
```javascript
// Must detect item state to choose correct mechanism
if (isProject) {
  if (item.status === Project.Status.Done) {
    item.markIncomplete();        // Completed → reopen
  } else if (item.status === Project.Status.Dropped) {
    item.status = Project.Status.Active;  // Dropped → activate
  }
  // Already active → no-op success
} else {
  if (item.completed) {
    item.markIncomplete();        // Completed → reopen
  } else if (item.dropDate !== null) {
    item.active = true;           // Dropped → activate
  }
  // Already active → no-op success
}
```

**Drop Mechanism Difference:**
```javascript
// Tasks: use drop() method (v3.8+)
task.drop(allOccurrences);  // Boolean controls repeat behavior

// Projects: use status assignment (no drop() method)
project.status = Project.Status.Dropped;
```

**Version Detection:**
```javascript
if (!app.userVersion.atLeast(new Version("3.8"))) {
  return JSON.stringify({
    success: false,
    error: "drop_items requires OmniFocus 3.8+. Current: " +
           app.userVersion.versionString
  });
}
```

**Item Lookup Pattern (tasks AND projects):**
```javascript
// By ID: try Task first, then Project
var item = Task.byIdentifier(id);
var isProject = false;
if (!item) {
  item = Project.byIdentifier(id);
  isProject = !!item;
}

// By name: search both collections, disambiguate if multiple
var taskMatches = flattenedTasks.filter(t => t.name === name);
var projMatches = flattenedProjects.filter(p => p.name === name);
var allMatches = taskMatches.concat(projMatches);
```

### Reusable Schemas

The following schemas from existing tools will inform patterns (but NOT be imported
directly, since status-tools operate on both tasks AND projects):

- `DisambiguationErrorSchema` from `task-tools/shared/` — pattern to follow
- `ProjectIdentifierSchema` from `review-tools/shared/` — extended to `ItemIdentifierSchema`
- `ReviewBatchItemResultSchema` from `review-tools/shared/` — pattern for `StatusBatchItemResultSchema`

### Batch Operation Pattern

Following established pattern from Phase 5 `review-tools/`:
- Per-item results at original array indices
- Partial failures don't fail entire batch
- Disambiguation errors include `candidates` array with `type` field
- Summary with `total`, `succeeded`, `failed` counters
- No-op results for idempotent operations (`ALREADY_COMPLETED`, `ALREADY_DROPPED`, `ALREADY_ACTIVE`)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Phase Completion Criteria

### Phase 0: Research ✅ COMPLETE
- [x] API research documented in research.md
- [x] All unknowns resolved (clarify session 2026-03-17)
- [x] OmniFocus API constraints identified
- [x] Version detection pattern documented
- [x] State detection for mark_incomplete documented
- [x] Task vs project mechanism differences documented

### Phase 1: Design & Contracts ✅ COMPLETE
- [x] data-model.md with entity definitions
- [x] quickstart.md with OmniJS patterns for all 6 tools
- [x] Project structure defined (contracts, definitions, primitives, tests)
- [x] Batch response format defined (matches Phase 5 pattern)
- [x] Single-item response format defined
- [x] Error codes defined (NOT_FOUND, DISAMBIGUATION_REQUIRED, VERSION_NOT_SUPPORTED, ALREADY_*)

**Post-Design Constitution Re-Check** (2026-03-17):

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First | ✅ PASS | All contracts use Zod schemas, strict TypeScript |
| II. Separation | ✅ PASS | Contracts in contracts/, OmniJS patterns in quickstart.md |
| III. Script Safety | ✅ PASS | All OmniJS patterns wrapped in try-catch with JSON returns |
| IV. Data Contracts | ✅ PASS | Discriminated unions, per-item batch results, no-op codes |
| V. Error Handling | ✅ PASS | Error codes for NOT_FOUND, DISAMBIGUATION_REQUIRED, VERSION_NOT_SUPPORTED |
| VI. Build Discipline | ✅ PASS | Standard pnpm build workflow |
| VII. KISS | ✅ PASS | Reuses established patterns from Phase 4/5 |
| VIII. YAGNI | ✅ PASS | Only spec'd requirements, no extras |
| IX. SOLID | ✅ PASS | Single responsibility per contract file |
| X. TDD | ✅ READY | Contract tests defined, ready for Phase 2 |

### Phase 2: Tasks (Next — via /speckit.tasks)
- [ ] TDD task ordering per Constitution X
- [ ] Contract tests defined
- [ ] Unit tests defined
- [ ] Implementation tasks defined
- [ ] Integration tests defined
- [ ] Parallel opportunities identified

### Phase 3: Implementation (via /speckit.implement)
- [ ] Contract tests pass
- [ ] Unit tests pass
- [ ] Primitives implemented
- [ ] Definitions implemented
- [ ] Tools registered in server.ts
- [ ] Integration tests scaffolded
- [ ] Full suite passes
- [ ] CLAUDE.md updated
