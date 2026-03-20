# SpecKit Workflow: SPEC-009 — Search & Database

**Created**: 2026-03-18
**Purpose**: Track SPEC-009 through all 7 SpecKit phases with review gates.

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ✅ Complete | 16 FRs, 9 stories, 28 scenarios |
| Clarify | `/speckit.clarify` | ✅ Complete | 10 questions resolved (5 search + 5 database) |
| Plan | `/speckit.plan` | ✅ Complete | 10 tools, 30 source files, 21 test files planned |
| Checklist | `/speckit.checklist` | ✅ Complete | 3 domains, 128 items, 18 gaps remediated |
| Tasks | `/speckit.tasks` | ✅ Complete | 83 tasks, 11 phases, 48% parallel |
| Analyze | `/speckit.analyze` | ✅ Complete | 0 CRITICAL, 0 HIGH, 3 MEDIUM remediated |
| Implement | `/speckit.implement` | ✅ Complete | 83/83 tasks, 10 tools, 3020 tests |

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
| Type Safety | Zod schemas for all inputs, no `as Type` | `pnpm typecheck` | ✅ Pass |
| Test-First | TDD Red→Green→Refactor | `pnpm test` | ✅ 2823 tests pass (125 files) |
| OmniJS-First | All operations via OmniJS execution | Code review | ✅ 50 definitions, 50 primitives |
| Simplicity | Single responsibility, no premature abstractions | Code review | ✅ Verified |
| Build | Compiles to dist/ (ESM + CJS) | `pnpm build` | ✅ Pass (ESM + CJS) |
| Lint | Source + tests pass Biome checks | `pnpm lint` | ✅ 360 files clean |
| Branch | Correct worktree branch | `git branch` | ✅ 009-search-database |
| Working Tree | Clean (no unrelated changes) | `git status` | ✅ Clean |

**Constitution Check:** ✅ Verified 2026-03-18 — Constitution v2.0.0 (RATIFIED), all principles satisfied

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-009 |
| **Name** | Search & Database |
| **Branch** | `009-search-database` |
| **Dependencies** | None (Phases 0-5 complete, Tier 1 complete) |
| **Enables** | None directly (SPEC-020 requires all specs complete) |
| **Priority** | P1 |

### Success Criteria Summary

- [ ] 10 MCP tools implemented: 4 search + 6 database
- [ ] Search tools: `search_tasks`, `search_projects`, `search_folders`, `search_tags`
- [ ] Database tools: `cleanup_database`, `undo`, `redo`, `save_database`, `get_database_stats`, `get_inbox_count`
- [ ] Zod contracts in `src/contracts/search-tools/` and `src/contracts/database-tools/`
- [ ] Consistent substring matching (case-insensitive) across all search tools
- [ ] Search results include relevance scoring and limit parameter (default 50)
- [ ] `undo`/`redo` with `canUndo`/`canRedo` pre-checks
- [ ] `get_database_stats` returns comprehensive counts (tasks by status, projects by status, folder count, tag count, inbox count)
- [ ] `get_inbox_count` as lightweight `inbox.length` call
- [ ] Clear destructive-operation warnings in tool descriptions for `undo`/`redo`
- [ ] Full TDD with contract + unit tests
- [ ] OmniJS Script Editor verification (manual step)

---

## Phase 1: Specify

**Output:** `specs/009-search-database/spec.md`

### Specify Prompt

```bash
/speckit.specify

## Feature: Search & Database

### Problem Statement
OmniFocus users need smart search across all item types (tasks, projects, folders, tags)
and essential database operations (cleanup, undo/redo, save, stats, inbox count) through
the MCP server. Currently there is no way to search for items by name/content or perform
database-level operations via AI assistants. These are the most-requested capabilities
for GTD workflows.

### Users
GTD practitioners using AI assistants to search and manage their OmniFocus database.

### User Stories
1. As a GTD practitioner, I want to search tasks by name so I can quickly find specific tasks without browsing the hierarchy
2. As a GTD practitioner, I want to search projects by name so I can locate projects across all folders
3. As a GTD practitioner, I want to search folders by name so I can find organizational structures
4. As a GTD practitioner, I want to search tags by name so I can find specific contexts or labels
5. As a GTD practitioner, I want to clean up the database so inbox items are processed
6. As a GTD practitioner, I want to undo/redo operations so I can recover from mistakes made via AI tools
7. As a GTD practitioner, I want to save the database and trigger sync so changes propagate to other devices
8. As a GTD practitioner, I want database statistics so I can understand my GTD system health (task counts by status, project counts, inbox count)
9. As a GTD practitioner, I want a lightweight inbox count so AI assistants can quickly check if I have unprocessed items

### Constraints
- All search must use OmniJS execution (no direct database access)
- OmniJS provides native Smart Match methods for 3 of 4 types: `projectsMatching(query)`, `foldersMatching(query)`, `tagsMatching(query)` — these mirror Quick Open behavior with built-in relevance ranking
- **No `tasksMatching()` exists** — task search must use `flattenedTasks.filter()` with case-insensitive substring matching
- Design decision: use native `*Matching()` for projects/folders/tags (better relevance); `flattenedTasks.filter()` for tasks (only option). Document the behavioral difference in tool descriptions.
- `flattenedTasks` includes ALL tasks (completed, dropped, inbox items) — search must expose a status filter parameter or filter active-only by default
- `undo`/`redo` are destructive operations — tool descriptions must warn AI assistants. Both **throw errors** when nothing to undo/redo; `canUndo`/`canRedo` pre-check is mandatory.
- `cleanUp()` and `save()` are **top-level Database functions** in OmniJS context (not `document.cleanUp()` or `document.save()`)
- `undo()`/`redo()` and `canUndo`/`canRedo` exist on both Database (top-level) and Document — use top-level in OmniJS scripts
- `canUndo`/`canRedo` are **read-only properties** (not method calls)
- `save()` is synchronous (returns void, not a Promise) and triggers sync if enabled
- Search results must include a configurable limit parameter (default 50)
- Follow existing definitions/primitives/contracts architecture pattern

### Out of Scope
- Full-text search in notes (performance concern for large databases — defer to SPEC-020 optimization)
- Semantic/vector search (no embedding infrastructure)
- Transaction grouping for undo (OmniJS limitation — each operation is a separate undo step)

### Key OmniJS APIs (verified via API research)
- Search (native Smart Match): `projectsMatching(query)`, `foldersMatching(query)`, `tagsMatching(query)` — Quick Open-style relevance ranking
- Search (tasks only): `flattenedTasks.filter()` — no `tasksMatching()` exists; manual substring match required
- Flattened collections: `flattenedTasks`, `flattenedProjects`, `flattenedFolders`, `flattenedTags` — all return ALL items including completed/dropped
- Database ops: `cleanUp()`, `undo()`, `redo()` — top-level Database functions (not `document.*`)
- State checks: `canUndo`, `canRedo` — read-only Boolean properties (not methods)
- Save: `save()` — top-level, synchronous, triggers sync if enabled
- Inbox: `inbox` collection, `inbox.length` for count
- Stats: Count items via `flattenedTasks.length`, filter by `task.taskStatus` (Task.Status.Completed, Task.Status.Dropped, etc.)
```

### Specify Results

| Metric | Value |
|--------|-------|
| Functional Requirements | 16 (FR-001 through FR-016) |
| User Stories | 9 (P1: 2, P2: 4, P3: 3) |
| Acceptance Criteria | 28 scenarios, 8 edge cases |

### Files Generated

- [x] `specs/009-search-database/spec.md`
- [x] `specs/009-search-database/checklists/requirements.md`

---

## Phase 2: Clarify

**When to run:** After Specify — OmniJS search API behavior needs verification.

### Clarify Prompts

#### Pre-Answered (from API research — do not re-ask)

These questions were resolved during brainstorming review (2026-03-18):

- `flattenedTasks` includes ALL tasks (completed, dropped, inbox). **Decision:** expose optional status filter param.
- `projectsMatching()`, `foldersMatching()`, `tagsMatching()` all exist — Smart Match / Quick Open semantics. **No `tasksMatching()`.**
- `canUndo`/`canRedo` are read-only Boolean properties (not methods).
- `undo()`/`redo()` throw errors when nothing to undo/redo. Pre-check mandatory.
- `cleanUp()`, `save()`, `undo()`, `redo()` are top-level Database functions in OmniJS context.
- `save()` is synchronous (void), triggers sync if enabled.
- OmniJS `flattenedTasks` iteration: ~0.8s for 414 tasks in OmniJS (runs in-process, not JXA Apple Events).

#### Session 1: Search Behavior Details

```bash
/speckit.clarify Focus on search behavior details:
- What properties should search match against? Just `name`, or also `note`? (Performance tradeoff for large databases)
- Should `search_tasks` default to active tasks only, or include completed/dropped with a status filter param?
- What fields should search results return? (id, name, status, project/folder? or minimal id+name?)
- How should `*Matching()` results be ordered vs `flattenedTasks.filter()` results — should we add a sort parameter?
- Should search support matching against multiple fields (name AND note) or single field only?
```

#### Session 2: Database Operations Behavior

```bash
/speckit.clarify Focus on database operations edge cases:
- What should `cleanup_database` return? Just success/failure, or also counts of items moved out of inbox?
- What should `undo`/`redo` return after the operation? Just success + canUndo/canRedo state?
- Should `get_database_stats` break down tasks by status (active/completed/dropped) and projects by status?
- Should `get_inbox_count` return just the count, or also include a sample of inbox item names for context?
- Does `cleanUp()` return any information about processed items, or is it void?
```

### Clarify Results

| Session | Focus Area | Questions | Key Outcomes |
|---------|------------|-----------|--------------|
| 1 | Search Behavior | 5 | Name-only search, active default, rich results, no sort param, single field |
| 2 | Database Operations | 5 | cleanUp void, undo/redo returns state, stats by status, inbox count only |

---

## Phase 3: Plan

**Output:** `specs/009-search-database/plan.md`

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
- Follow existing definitions/primitives/contracts architecture (50 tools already established)
- Contracts go in `src/contracts/search-tools/` and `src/contracts/database-tools/`
- Definitions in `src/tools/definitions/`, primitives in `src/tools/primitives/`
- All OmniJS scripts use the IIFE + try-catch + JSON.stringify pattern
- Search tools must return consistent result shapes across all 4 item types
- Database tools (undo/redo) need clear destructive-operation warnings in descriptions
- `get_database_stats` and `get_inbox_count` are read-only, no side effects

## Architecture Notes
- Two distinct contract directories: `search-tools/` (4 tools) and `database-tools/` (6 tools)
- **Search strategy (decided 2026-03-18):** Use native `projectsMatching(query)`, `foldersMatching(query)`, `tagsMatching(query)` for 3 types (Smart Match / Quick Open relevance); `flattenedTasks.filter()` with case-insensitive substring for tasks (no `tasksMatching()` exists). Document behavioral difference in tool descriptions.
- `flattenedTasks` returns ALL tasks including completed/dropped — search_tasks needs optional status filter (default: active only)
- Search tools share a common result schema (SearchResult with id, name, type) but relevance scoring differs (native `*Matching()` returns in relevance order; task filter needs manual ordering)
- Database tools are independent — no shared schemas needed between them
- All database ops (`cleanUp()`, `save()`, `undo()`, `redo()`) are top-level Database functions in OmniJS
- `undo`/`redo` are single-operation tools (no batch) — pre-check `canUndo`/`canRedo` (properties, not methods), return success/failure + post-op canUndo/canRedo state
- `undo()`/`redo()` throw on failure — must wrap in try-catch in OmniJS script
```

### Plan Results

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ✅ | 10 tools, constitution gates 10/10 PASS |
| `research.md` | ✅ | 5 research decisions documented |
| `data-model.md` | ✅ | Search result types, stats schema |
| `quickstart.md` | ✅ | 10 OmniJS patterns documented |
| `contracts/` | ✅ | search-tools.ts, database-tools.ts, index.ts |

---

## Phase 4: Domain Checklists

### Recommended Domains

| Signal in Spec | Recommended Domain |
|---|---|
| 10 tool contracts, Zod schemas, input/output shapes | **api-contracts** |
| Type safety, no `as Type`, Zod 4.x patterns | **type-safety** |
| OmniJS API workarounds, destructive ops, version detection | **api-workaround** |

#### 1. api-contracts Checklist

Why: 10 tools across 2 domains with shared search result schemas and diverse database operation signatures.

```bash
/speckit.checklist api-contracts

Focus on SPEC-009 Search & Database requirements:
- Consistent search result schema across 4 search tools (tasks, projects, folders, tags)
- Input validation for search query (min length, max length, sanitization)
- Limit parameter validation (1-200 range, default 50)
- `undo`/`redo` response includes `canUndo`/`canRedo` state after operation
- `get_database_stats` response schema with counts by status
- Pay special attention to: discriminated union patterns for success/failure responses
```

#### 2. type-safety Checklist

Why: 10 new tools need strict Zod contracts, no type assertions, proper narrowing.

```bash
/speckit.checklist type-safety

Focus on SPEC-009 Search & Database requirements:
- Zod 4.x schemas for all 10 tool inputs and outputs
- No `as Type` assertions anywhere
- Search result items include type discriminator (task/project/folder/tag)
- Database stats response uses proper number types (not string counts)
- Pay special attention to: shared search result schema reuse across 4 tools
```

#### 3. api-workaround Checklist

Why: OmniJS has no universal search API; search must be hand-built with `flattenedX` iteration.

```bash
/speckit.checklist api-workaround

Focus on SPEC-009 Search & Database requirements:
- `flattenedTasks`/`flattenedProjects`/`flattenedFolders`/`flattenedTags` iteration for search
- `canUndo`/`canRedo` pre-checks before calling `undo()`/`redo()`
- `document.save()` sync behavior — does it return a Promise?
- `cleanUp()` behavior — what does it return?
- Pay special attention to: performance of iterating large collections in OmniJS
```

### Checklist Results

| Checklist | Items | Gaps | Spec References |
|-----------|-------|------|-----------------|
| api-contracts | 41 | 10 | FR-005, FR-006, FR-012, FR-014, FR-016 |
| type-safety | 39 | 7 | FR-001–FR-016, CLAUDE.md conventions |
| api-workaround | 48 | 1 | FR-001, FR-009–FR-015 |
| **Total** | **128** | **18** | Remediated: query max length, whitespace trim, performed field, total field, root task filter |

---

## Phase 5: Tasks

**Output:** `specs/009-search-database/tasks.md`

### Tasks Prompt

```bash
/speckit.tasks

## Task Structure
- Small, testable chunks (1-2 hours each)
- Clear acceptance criteria referencing FR-xxx
- Dependency ordering: foundation → search tools → database tools → integration → validation
- Mark parallel-safe tasks explicitly with [P]
- Organize by user story, not by technical layer

## Implementation Phases
1. Foundation (shared search result schema, contracts infrastructure)
2. Search Tools [P] (4 tools — can be built in parallel after foundation)
3. Database Tools [P] (6 tools — can be built in parallel after foundation)
4. Integration testing & polish

## Constraints
- Contracts in `src/contracts/search-tools/` and `src/contracts/database-tools/`
- Definitions in `src/tools/definitions/`
- Primitives in `src/tools/primitives/`
- Tests: `tests/contract/search-tools/`, `tests/contract/database-tools/`, `tests/unit/search-tools/`, `tests/unit/database-tools/`
- TDD: Red→Green→Refactor for every task
```

### Tasks Results

| Metric | Value |
|--------|-------|
| **Total Tasks** | 83 |
| **Phases** | 11 (1 setup, 9 user stories, 1 polish) |
| **Parallel Opportunities** | 40 tasks (48%) marked [P] |
| **User Stories Covered** | 9/9 (all FR-001 through FR-016 traced) |

---

## Phase 6: Analyze

### Analyze Prompt

```bash
/speckit.analyze

Focus on:
1. Constitution alignment — verify coding standards compliance
2. Coverage gaps — ensure all 9 user stories and all FRs have tasks
3. Consistency between task file paths and actual project structure
4. Verify search tools share consistent result schemas
5. Verify database tools have proper destructive-operation warnings
```

### Analysis Results

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| C1 | MEDIUM | Query schema missing `.trim().max(1000)` | Will be addressed during contract implementation (T003/T008/etc.) |
| C2 | MEDIUM | No task for `.trim()` on query input | Covered by contract tasks — Zod transform handles it |
| I1 | MEDIUM | FR-014 "available" grouping unclear | Fixed — added parenthetical listing grouped statuses |
| I2 | LOW | SC-008 said "8 tools" instead of "10" | Fixed — updated to "10 tools" |
| C3 | LOW | data-model.md missing max 1000 | Deferred — implementation will be authoritative |
| C4 | LOW | plan.md "deletes empty items" not in spec | Informational — OmniJS behavior, not our responsibility |

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

1. Verify worktree: `git branch` shows `009-search-database`
2. Verify baseline: `pnpm test` — all 2823 tests pass
3. Verify build: `pnpm build` — clean
4. Verify lint: `pnpm lint` — clean
5. Create spec output dir: `specs/009-search-database/`

### Implementation Notes
- Mirror existing tool patterns (find a similar tool in the codebase and follow its structure)
- Search tools: look at `listTasks.ts` for the `flattenedTasks` iteration pattern
- Database tools: simpler than search — mostly single OmniJS calls
- Register all 10 tools in `src/server.ts`
- Run `pnpm build` after every source change
```

### Implementation Progress

| Phase | Tasks | Completed | Notes |
|-------|-------|-----------|-------|
| 1 - Foundation | 4 | 4 | Shared schemas, contract dirs, indexes |
| 2-5 - Search Tools | 28 | 28 | search_tasks, search_projects, search_folders, search_tags |
| 6-10 - Database Tools | 41 | 41 | stats, inbox, save, cleanup, undo, redo |
| 11 - Integration & Polish | 10 | 10 | Server registration, build, final tests |

---

## Post-Implementation Checklist

- [x] All tasks marked complete in tasks.md (83/83)
- [x] Typecheck passes: `pnpm typecheck` (0 errors)
- [x] Tests pass: `pnpm test` (3020 passed, 146 files)
- [x] Build succeeds: `pnpm build` (ESM + CJS clean)
- [x] Lint passes: `pnpm lint` (416 files clean)
- [x] All 10 tools registered in `src/server.ts`
- [ ] Manual OmniJS Script Editor verification
- [x] PR created: https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/41
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

```
src/
├── server.ts                          # MCP server entry point (register 10 new tools here)
├── contracts/
│   ├── search-tools/                  # NEW: Zod contracts for 4 search tools + shared schemas
│   └── database-tools/                # NEW: Zod contracts for 6 database tools
├── tools/
│   ├── definitions/                   # NEW: 10 tool definition files
│   └── primitives/                    # NEW: 10 primitive files
tests/
├── contract/
│   ├── search-tools/                  # NEW: Contract tests
│   └── database-tools/                # NEW: Contract tests
├── unit/
│   ├── search-tools/                  # NEW: Unit tests
│   └── database-tools/                # NEW: Unit tests
└── integration/
    └── search-database/               # NEW: Integration tests (optional)
specs/
└── 009-search-database/               # Spec artifacts
```
