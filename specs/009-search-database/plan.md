# Implementation Plan: Search & Database

**Branch**: `009-search-database` | **Date**: 2026-03-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-search-database/spec.md`

## Summary

Search & Database provides ten MCP tools across two domains: four search tools
for locating tasks, projects, folders, and tags by name, and six database
operations tools for statistics, inbox count, save, cleanup, undo, and redo.

**Primary Requirements:**
- `search_tasks`: Case-insensitive substring matching via `flattenedTasks.filter()` with status filter (FR-001, FR-005, FR-006, FR-007, FR-008, FR-016)
- `search_projects`: Smart Match relevance search via `projectsMatching()` (FR-002, FR-005, FR-007, FR-008, FR-016)
- `search_folders`: Smart Match relevance search via `foldersMatching()` (FR-003, FR-005, FR-007, FR-008, FR-016)
- `search_tags`: Smart Match relevance search via `tagsMatching()` (FR-004, FR-005, FR-007, FR-008, FR-016)
- `get_database_stats`: Aggregate statistics by iterating flattened collections (FR-014)
- `get_inbox_count`: Lightweight inbox count via `inbox.length` (FR-015)
- `save_database`: Persist changes and trigger sync via `save()` (FR-013)
- `cleanup_database`: Process inbox items via `cleanUp()` (FR-009)
- `undo`: Reverse last operation with `canUndo` pre-check (FR-010, FR-012)
- `redo`: Reapply undone operation with `canRedo` pre-check (FR-011, FR-012)

**Technical Approach:**
- All operations use pure OmniJS via `executeOmniJS()`
- Search tools use two strategies: native Smart Match (`*Matching()`) for projects/folders/tags, manual `flattenedTasks.filter()` for tasks
- Database tools call top-level Database functions (`save()`, `cleanUp()`, `undo()`, `redo()`)
- Undo/redo pre-check via `canUndo`/`canRedo` properties before calling methods
- Two separate contract directories: `search-tools/` (4 tools) and `database-tools/` (6 tools)

## Technical Context

**Language/Version**: TypeScript 5.9+ with strict mode (ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.27.x, Zod 4.2.x, tsup 8.5+
**Storage**: N/A (OmniFocus internal database via OmniJS)
**Testing**: Vitest 4.0+ with TDD Red-Green-Refactor
**Target Platform**: macOS (OmniFocus Pro with Omni Automation)
**Project Type**: Single project (established MCP server structure)
**Performance Goals**: <500ms for single search operations; stats may take longer on large databases
**Constraints**: No `tasksMatching()` API exists; task search uses manual filtering. `undo()`/`redo()` throw on empty stack.
**Scale/Scope**: GTD practitioners, typical databases under 10,000 items

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First Development | PASS | Zod schemas for all 10 tools, TypeScript strict mode |
| II. Separation of Concerns | PASS | Definitions in `definitions/`, primitives in `primitives/`, contracts in `contracts/search-tools/` and `contracts/database-tools/` |
| III. Script Execution Safety | PASS | All OmniJS wrapped in IIFE + try-catch with JSON error returns |
| IV. Structured Data Contracts | PASS | Discriminated unions for responses, `totalMatches` for truncation awareness |
| V. Defensive Error Handling | PASS | Undo/redo pre-check prevents exceptions; empty results return success not error |
| VI. Build Discipline | PASS | Standard `pnpm build` workflow |
| VII. KISS | PASS | Follows established patterns, no over-engineering. Simple tools with clear single responsibility |
| VIII. YAGNI | PASS | Only spec'd requirements, no extras. No sort params, no multi-field search |
| IX. SOLID | PASS | Single responsibility per file, definitions/primitives separation, two independent contract directories |
| X. TDD | PASS | Contract tests then unit tests then implementation then manual verification |

**Violations Requiring Justification**: None

## Project Structure

### Documentation (this feature)

```text
specs/009-search-database/
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (API research)
├── plan.md              # This file
├── data-model.md        # Phase 1 output (entity definitions)
├── quickstart.md        # Phase 1 output (OmniJS patterns)
├── contracts/           # Phase 1 output (Zod schema designs)
│   ├── search-tools.ts
│   ├── database-tools.ts
│   └── index.ts
├── checklists/          # Requirements checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── contracts/
│   ├── search-tools/                     # NEW - Search Zod schemas
│   │   ├── shared/
│   │   │   ├── search-result.ts          # SearchTaskResult, SearchProjectResult, etc.
│   │   │   └── index.ts
│   │   ├── search-tasks.ts
│   │   ├── search-projects.ts
│   │   ├── search-folders.ts
│   │   ├── search-tags.ts
│   │   └── index.ts
│   └── database-tools/                   # NEW - Database Zod schemas
│       ├── get-database-stats.ts
│       ├── get-inbox-count.ts
│       ├── save-database.ts
│       ├── cleanup-database.ts
│       ├── undo.ts
│       ├── redo.ts
│       └── index.ts
├── tools/
│   ├── definitions/
│   │   ├── searchTasks.ts                # NEW
│   │   ├── searchProjects.ts             # NEW
│   │   ├── searchFolders.ts              # NEW
│   │   ├── searchTags.ts                 # NEW
│   │   ├── getDatabaseStats.ts           # NEW
│   │   ├── getInboxCount.ts              # NEW
│   │   ├── saveDatabase.ts               # NEW
│   │   ├── cleanupDatabase.ts            # NEW
│   │   ├── undoOperation.ts              # NEW
│   │   └── redoOperation.ts              # NEW
│   └── primitives/
│       ├── searchTasks.ts                # NEW
│       ├── searchProjects.ts             # NEW
│       ├── searchFolders.ts              # NEW
│       ├── searchTags.ts                 # NEW
│       ├── getDatabaseStats.ts           # NEW
│       ├── getInboxCount.ts              # NEW
│       ├── saveDatabase.ts               # NEW
│       ├── cleanupDatabase.ts            # NEW
│       ├── undoOperation.ts              # NEW
│       └── redoOperation.ts              # NEW
└── server.ts                              # Tool registration (10 new tools)

tests/
├── contract/
│   ├── search-tools/                      # NEW
│   │   ├── search-tasks.test.ts
│   │   ├── search-projects.test.ts
│   │   ├── search-folders.test.ts
│   │   ├── search-tags.test.ts
│   │   └── shared-search-result.test.ts
│   └── database-tools/                    # NEW
│       ├── get-database-stats.test.ts
│       ├── get-inbox-count.test.ts
│       ├── save-database.test.ts
│       ├── cleanup-database.test.ts
│       ├── undo.test.ts
│       └── redo.test.ts
├── unit/
│   ├── search-tools/                      # NEW
│   │   ├── searchTasks.test.ts
│   │   ├── searchProjects.test.ts
│   │   ├── searchFolders.test.ts
│   │   └── searchTags.test.ts
│   └── database-tools/                    # NEW
│       ├── getDatabaseStats.test.ts
│       ├── getInboxCount.test.ts
│       ├── saveDatabase.test.ts
│       ├── cleanupDatabase.test.ts
│       ├── undoOperation.test.ts
│       └── redoOperation.test.ts
└── integration/
    └── search-database/                   # NEW
        └── search-database.integration.test.ts
```

**Structure Decision**: Single project layout following established Phase 5/13
patterns. Two separate contract directories (`search-tools/` and `database-tools/`)
because the domains are independent — search tools share common result schemas
while database tools have no shared schemas. Follows the existing `review-tools/`,
`status-tools/`, etc. organization pattern.

## Implementation Strategy

### Key OmniJS Patterns (from research.md)

**Search Strategy — Two Approaches:**

```javascript
// Projects, Folders, Tags: native Smart Match (relevance order)
var matches = projectsMatching(query);  // Quick Open semantics
var matches = foldersMatching(query);
var matches = tagsMatching(query);

// Tasks: manual filter (no tasksMatching() exists)
var matches = flattenedTasks.filter(function(task) {
  return task.name.toLowerCase().includes(query.toLowerCase());
});
```

**Task Status Filter Mapping:**

| Filter Value | Task.Status Values |
|-------------|-------------------|
| `"active"` | Available, Blocked, DueSoon, Next, Overdue |
| `"completed"` | Completed |
| `"dropped"` | Dropped |
| `"all"` | (no filter) |

**Root Task Skip Pattern (CRITICAL for task search and stats):**

```javascript
// Skip root tasks of projects — they represent the project itself
if (task.containingProject !== null) {
  if (task.id.primaryKey === task.containingProject.id.primaryKey) {
    return; // Skip this task
  }
}
```

**Undo/Redo Pre-Check Pattern:**

```javascript
// canUndo/canRedo are properties, not methods
var performed = false;
if (canUndo) {
  undo();
  performed = true;
}
// Post-op state check
return { performed: performed, canUndo: canUndo, canRedo: canRedo };
```

### Search Tools — Shared Result Envelope

All four search tools return the same response envelope with type-specific result items:

```typescript
{
  success: true,
  results: SearchResultItem[],  // Type varies by tool
  totalMatches: number           // Total before limit applied
}
```

This enables AI assistants to know when results were truncated (`totalMatches > results.length`).

### Database Tools — No Shared Schemas

Each database tool is independent. Undo and redo share a response shape
(`performed`, `canUndo`, `canRedo`) but this is defined inline in each contract
rather than shared, following YAGNI.

### Tool Descriptions (for MCP registration)

| Tool | Description |
|------|-------------|
| `search_tasks` | Search tasks by name using case-insensitive substring matching. Returns matching tasks with IDs, names, project context, and status. Defaults to active tasks only; use status filter for completed/dropped. Results are in database order, not relevance-ranked. |
| `search_projects` | Search projects by name using Smart Match (Quick Open relevance ranking). Returns matching projects with IDs, names, folder context, and status. |
| `search_folders` | Search folders by name using Smart Match (Quick Open relevance ranking). Returns matching folders with IDs, names, and parent folder context. |
| `search_tags` | Search tags by name using Smart Match (Quick Open relevance ranking). Returns matching tags with IDs, names, and parent tag context. |
| `get_database_stats` | Get aggregate database statistics: task counts by status, project counts by status, folder/tag totals, and inbox count. Read-only, no side effects. |
| `get_inbox_count` | Get the number of items in the OmniFocus inbox. Lightweight operation for quick inbox status checks. Read-only, no side effects. |
| `save_database` | Save the database to disk and trigger sync if enabled. OmniFocus auto-saves periodically; use this to force immediate save after batch changes. |
| `cleanup_database` | Trigger the OmniFocus Clean Up operation: processes inbox items with assigned projects, performs delayed filtering, and deletes empty items. |
| `undo` | WARNING: DESTRUCTIVE — Reverses the most recent database change. Affects the entire OmniFocus database, not just MCP operations. Pre-checks availability before attempting. |
| `redo` | WARNING: DESTRUCTIVE — Reapplies the most recently undone database change. Affects the entire OmniFocus database, not just MCP operations. Pre-checks availability before attempting. |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Phase Completion Criteria

### Phase 0: Research -- COMPLETE
- [x] API research documented in research.md
- [x] All unknowns resolved (clarify sessions 2026-03-18)
- [x] OmniFocus search API methods documented
- [x] Task.Status enum values mapped to filter parameter
- [x] Database operation methods and properties documented
- [x] Undo/redo pre-check pattern documented
- [x] Root task skip pattern identified

### Phase 1: Design & Contracts -- COMPLETE
- [x] data-model.md with entity definitions for all 10 tools
- [x] quickstart.md with OmniJS patterns for all 10 tools
- [x] Contract schemas designed (search-tools.ts, database-tools.ts)
- [x] Project structure defined (contracts, definitions, primitives, tests)
- [x] Search response envelope defined (results + totalMatches)
- [x] Database operation response formats defined
- [x] Tool descriptions drafted with behavioral documentation
- [x] Agent context updated

**Post-Design Constitution Re-Check** (2026-03-18):

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First | PASS | All contracts use Zod schemas, strict TypeScript |
| II. Separation | PASS | Contracts in contracts/, OmniJS patterns in quickstart.md |
| III. Script Safety | PASS | All OmniJS patterns wrapped in IIFE + try-catch with JSON returns |
| IV. Data Contracts | PASS | Discriminated unions, totalMatches for truncation, empty results as success |
| V. Error Handling | PASS | Undo/redo pre-check, no exceptions on empty results, validation errors for empty queries |
| VI. Build Discipline | PASS | Standard pnpm build workflow |
| VII. KISS | PASS | Simple single-responsibility tools, two search strategies clearly documented |
| VIII. YAGNI | PASS | Only spec'd requirements, no sort params, no multi-field search, no shared schemas for database tools |
| IX. SOLID | PASS | Single responsibility per contract file, independent contract directories |
| X. TDD | READY | Contract tests defined, ready for Phase 2 |

### Phase 2: Tasks (Next -- via /speckit.tasks)
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
