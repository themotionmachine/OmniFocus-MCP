# Implementation Plan: Enhanced Task Management Tools

**Branch**: `003-tasks` | **Date**: 2025-12-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-tasks/spec.md`

## Summary

Implement 4 enhanced task management tools for OmniFocus MCP Server: `list_tasks`,
`get_task`, `set_planned_date`, and `append_note`. These tools enable AI assistants
to efficiently query, inspect, schedule, and update tasks without loading the
entire database. The implementation uses pure OmniJS execution via
`executeOmniFocusScript()`, following the established definitions/primitives
architecture from Phase 1 (Folders) and Phase 2 (Tags).

## Technical Context

**Language/Version**: TypeScript 5.9+ with strict mode (`ES2024` target)
**Primary Dependencies**:

- `@modelcontextprotocol/sdk@1.24.3` - MCP server framework
- `zod@4.1.x` - Schema validation
- `tsup@8.5.x` - Build tool

**Storage**: N/A (interfaces with OmniFocus via OmniJS execution)
**Testing**: Vitest 4.0+ with V8 coverage
**Target Platform**: macOS (OmniFocus is macOS-only, runs via Node.js 24+)
**Project Type**: Single (MCP server)
**Performance Goals**: <2 seconds for listing up to 10,000 tasks (per SC-001)
**Constraints**: OmniFocus v4.7+ required for `plannedDate`/`set_planned_date`
**Scale/Scope**: Handles databases with 10,000+ tasks

## Constitution Check (Pre-Design)

*GATE: Must pass before Phase 0 research.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Type-First Development** | PASS | All tools use Zod schemas; strict TypeScript |
| **II. Separation of Concerns** | PASS | definitions/ + primitives/ pattern maintained |
| **III. Script Execution Safety** | PASS | OmniJS with try-catch, JSON error returns |
| **IV. Structured Data Contracts** | PASS | Zod schemas in `src/contracts/task-tools/` |
| **V. Defensive Error Handling** | PASS | Disambiguation errors, actionable messages |
| **VI. Build Discipline** | PASS | `pnpm build` before testing |
| **VII. KISS** | PASS | Following existing patterns, no new abstractions |
| **VIII. YAGNI** | PASS | Only implementing spec requirements |
| **IX. SOLID** | PASS | Single responsibility per tool |
| **X. TDD** | PASS | Red-Green-Refactor workflow mandated |

**Gate Status**: PASSED - Proceed to Phase 0

## Constitution Check (Post-Design)

*Re-evaluated after Phase 1 design artifacts completed.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Type-First Development** | PASS | Zod schemas define all inputs; TaskStatusSchema uses enum; interfaces minimal |
| **II. Separation of Concerns** | PASS | Contracts separate from implementation; primitives generate pure OmniJS |
| **III. Script Execution Safety** | PASS | All OmniJS patterns documented with try-catch; date handling via .getTime() |
| **IV. Structured Data Contracts** | PASS | ISO 8601 dates; disambiguation errors; actionable context in errors |
| **V. Defensive Error Handling** | PASS | DisambiguationErrorSchema pattern; version check errors for plannedDate |
| **VI. Build Discipline** | PASS | quickstart.md documents build requirements; no new OmniJS files to copy |
| **VII. KISS** | PASS | Following existing queryOmnifocus/listTags patterns exactly |
| **VIII. YAGNI** | PASS | Only 4 tools from spec; no premature abstractions |
| **IX. SOLID** | PASS | Each tool single responsibility; open for extension via new pairs |
| **X. TDD** | PASS | quickstart.md documents Red-Green-Refactor; test-first task ordering |

**Post-Design Gate Status**: PASSED - Ready for `/speckit.tasks`

## Project Structure

### Documentation (this feature)

```text
specs/003-tasks/
├── plan.md              # This file
├── research.md          # Phase 0 output - OmniJS Task API research
├── data-model.md        # Phase 1 output - Task entity model
├── quickstart.md        # Phase 1 output - Development setup
├── contracts/           # Phase 1 output - Zod schema contracts
│   ├── index.ts
│   ├── shared/
│   │   ├── task.ts
│   │   └── disambiguation.ts
│   ├── list-tasks.ts
│   ├── get-task.ts
│   ├── set-planned-date.ts
│   └── append-note.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── contracts/
│   └── task-tools/      # Zod contracts (copied from specs/003-tasks/contracts/)
│       ├── index.ts
│       ├── shared/
│       │   ├── task.ts
│       │   └── disambiguation.ts
│       ├── list-tasks.ts
│       ├── get-task.ts
│       ├── set-planned-date.ts
│       └── append-note.ts
├── tools/
│   ├── definitions/
│   │   ├── listTasks.ts
│   │   ├── getTask.ts
│   │   ├── setPlannedDate.ts
│   │   └── appendNote.ts
│   └── primitives/
│       ├── listTasks.ts
│       ├── getTask.ts
│       ├── setPlannedDate.ts
│       └── appendNote.ts
└── server.ts            # Register new tools

tests/
├── contract/
│   └── task-tools/
│       ├── list-tasks.test.ts
│       ├── get-task.test.ts
│       ├── set-planned-date.test.ts
│       ├── append-note.test.ts
│       └── shared-*.test.ts
└── unit/
    └── task-tools/
        ├── listTasks.test.ts
        ├── getTask.test.ts
        ├── setPlannedDate.test.ts
        └── appendNote.test.ts
```

**Structure Decision**: Single project layout (Option 1), matching existing
Phase 1/Phase 2 patterns. Contracts in both `specs/` (design artifacts) and
`src/contracts/` (runtime code).

## Complexity Tracking

No constitution violations. All tools follow established patterns from Phase 1
and Phase 2 implementations.

---

## Phase 0: Outline & Research

### Research Tasks

| Unknown | Research Task | Source |
|---------|---------------|--------|
| Task API properties | Document all writable/read-only properties | omni-automation.com |
| `plannedDate` version req | Confirm v4.7+ requirement and API | omni-automation.com |
| `effectivePlannedDate` | Confirm v4.7.1+ and behavior | omni-automation.com |
| `taskStatus` values | Document all 7 status values | omni-automation.com |
| `appendStringToNote()` | Confirm method signature and behavior | omni-automation.com |
| Version checking | Document `app.userVersion.atLeast()` pattern | omni-automation.com |
| Filter performance | Understand iteration patterns for large datasets | Existing codebase |

### Research Status: ✅ COMPLETE

Research agent extracted OmniJS Task API documentation from:

- <https://omni-automation.com/omnifocus/task.html>
- <https://omni-automation.com/omnifocus/OF-API.html>
- <https://omni-automation.com/omnifocus/finding-items.html>

**Output**: See [research.md](./research.md)

**Key Findings**:

- `plannedDate` is **writable** in v4.7+ (despite `r/o` label in docs, requires database migration)
- `effectivePlannedDate` is read-only (computed from task or inherited from project)
- `Task.Status` has 7 values: Available, Blocked, Completed, Dropped, DueSoon, Next, Overdue
- `appendStringToNote(text)` appends with automatic newline separator
- Version checking via `app.userVersion.atLeast(new Version("4.7"))`

---

## Phase 1: Design & Contracts ✅ COMPLETE

### Task Entity Model

**Output**: See [data-model.md](./data-model.md)

Documented Task entity model with:

- All properties (writable vs read-only) with Zod schemas
- Relationships (containingProject, parent, tags)
- Status enumeration (7 values)
- Version-specific features (plannedDate v4.7+, effectivePlannedDate v4.7.1+)
- TaskSummary and TaskFull interface definitions

### API Contracts

For each tool, generate Zod schemas following the tag-tools pattern:

#### 1. `list_tasks` Contract

- **Input**: Filters (project, folder, tags, status, dates, flagged, limit)
- **Success**: `{ success: true, tasks: TaskSummary[] }`
- **Error**: `{ success: false, error: string }`

#### 2. `get_task` Contract

- **Input**: `{ id?: string, name?: string }` (one required)
- **Success**: `{ success: true, task: TaskFull }`
- **Error**: Standard error or disambiguation error

#### 3. `set_planned_date` Contract

- **Input**: `{ id?: string, name?: string, plannedDate: string | null }`
- **Success**: `{ success: true, id: string, name: string }`
- **Error**: Standard error, disambiguation, or version mismatch

#### 4. `append_note` Contract

- **Input**: `{ id?: string, name?: string, text: string }`
- **Success**: `{ success: true, id: string, name: string }`
- **Error**: Standard error or disambiguation error

### Shared Types

- `TaskSummarySchema` - Minimal task fields for list results
- `TaskFullSchema` - Complete task with all properties
- `TaskStatusSchema` - Enum for 7 status values
- `DisambiguationErrorSchema` - Reuse from tag-tools pattern

---

## Design Decisions

### 1. Filter Architecture for `list_tasks`

**Decision**: Generate filter conditions inline in OmniJS script (like `queryOmnifocus.ts`)

**Rationale**:

- Existing pattern proven in `queryOmnifocus` primitive
- Filters applied server-side before JSON serialization
- Avoids transferring entire database to Node.js

### 2. Tag Filter Mode

**Decision**: Add `tagFilterMode` parameter with `"any"` (default) and `"all"` options

**Rationale**:

- Spec FR-004 requires both OR and AND logic
- Default to `"any"` for consistency with existing `queryOmnifocus`
- User explicitly selects `"all"` when AND logic needed

### 3. Version Checking for `set_planned_date`

**Decision**: Check version inside OmniJS script using `app.userVersion.atLeast()`

**Rationale**:

- Version check must happen at runtime in OmniFocus context
- Return clear error message if version too old
- Pattern: `if (!app.userVersion.atLeast(new Version("4.7"))) { return error }`

### 4. Disambiguation Pattern

**Decision**: Reuse disambiguation error schema from tag-tools

**Rationale**:

- Consistent error structure across all tools
- AI assistants can handle uniformly
- `{ success: false, code: "DISAMBIGUATION_REQUIRED", matchingIds: [...] }`

### 5. Note Append Separator

**Decision**: Add newline between existing content and appended text

**Rationale**:

- Spec FR-033 explicitly requires newline separator
- No leading newline for empty notes (FR-032)
- OmniJS `appendStringToNote()` handles this natively

---

## Implementation Order

The tools should be implemented in dependency order:

1. **Contracts** (all 4) - Foundation for all tools
2. **`list_tasks`** - Most complex, foundational for testing
3. **`get_task`** - Depends on understanding task properties
4. **`set_planned_date`** - Simpler write operation
5. **`append_note`** - Simplest write operation

Each tool follows TDD Red-Green-Refactor:

1. Contract tests (FAIL)
2. Unit tests for primitive (FAIL)
3. Implement primitive (GREEN)
4. Implement definition (integration)
5. Manual OmniFocus verification

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OmniFocus version mismatch | Medium | Medium | Clear error message for plannedDate |
| Large database performance | Low | Medium | Implement limit parameter, test with 10K tasks |
| Tag filter complexity | Low | Low | Leverage existing queryOmnifocus patterns |
| Disambiguation edge cases | Low | Low | Follow tag-tools proven pattern |

---

## Completion Status

### Phase 0: Research ✅ COMPLETE

- [research.md](./research.md) - Comprehensive OmniJS Task API documentation

### Phase 1: Design ✅ COMPLETE

- [data-model.md](./data-model.md) - Task entity model with Zod schemas
- [contracts/](./contracts/) - All 4 tool contracts with shared types
- [quickstart.md](./quickstart.md) - Development setup and TDD workflow

## Next Steps

1. Run `/speckit.tasks` to generate implementation task breakdown
2. Review generated tasks.md for TDD compliance
3. Execute `/speckit.implement` to begin Red-Green-Refactor cycle
