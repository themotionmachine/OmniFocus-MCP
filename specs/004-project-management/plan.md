# Implementation Plan: Project Management Tools

**Branch**: `004-project-management` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-project-management/spec.md`

## Summary

Implement 6 project management tools for OmniFocus MCP Server: `list_projects`,
`get_project`, `create_project`, `edit_project`, `delete_project`, and
`move_project`. These tools provide complete CRUD lifecycle management for
projects, enabling AI assistants to efficiently discover, inspect, create,
modify, delete, and reorganize projects without loading the entire database.
The implementation uses pure OmniJS execution via `executeOmniFocusScript()`,
following the established definitions/primitives architecture from Phase 1-3.

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
**Performance Goals**: <2 seconds for listing up to 1,000 projects (per SC-001)
**Constraints**: OmniFocus v3.0+ required for core functionality; v3.5+ for
`estimatedMinutes`; v3.6+ for `shouldUseFloatingTimeZone`
**Scale/Scope**: Handles databases with 1,000+ projects

## Constitution Check (Pre-Design)

*GATE: Must pass before Phase 0 research.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Type-First Development** | PASS | All tools use Zod schemas; strict TypeScript |
| **II. Separation of Concerns** | PASS | definitions/ + primitives/ pattern maintained |
| **III. Script Execution Safety** | PASS | OmniJS with try-catch, JSON error returns |
| **IV. Structured Data Contracts** | PASS | Zod schemas in `src/contracts/project-tools/` |
| **V. Defensive Error Handling** | PASS | Disambiguation errors, actionable messages |
| **VI. Build Discipline** | PASS | `pnpm build` before testing |
| **VII. KISS** | PASS | Following existing patterns, no new abstractions |
| **VIII. YAGNI** | PASS | Only implementing spec requirements (6 tools) |
| **IX. SOLID** | PASS | Single responsibility per tool |
| **X. TDD** | PASS | Red-Green-Refactor workflow mandated |

**Gate Status**: PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/004-project-management/
├── plan.md              # This file
├── research.md          # Phase 0 output - OmniJS Project API research
├── data-model.md        # Phase 1 output - Project entity model
├── quickstart.md        # Phase 1 output - Development setup
├── contracts/           # Phase 1 output - Zod schema contracts
│   ├── index.ts
│   ├── shared/
│   │   ├── project.ts
│   │   ├── disambiguation.ts
│   │   └── index.ts
│   ├── list-projects.ts
│   ├── get-project.ts
│   ├── create-project.ts
│   ├── edit-project.ts
│   ├── delete-project.ts
│   └── move-project.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── contracts/
│   └── project-tools/   # Zod contracts (copied from specs/004-project-management/contracts/)
│       ├── index.ts
│       ├── shared/
│       │   ├── project.ts
│       │   ├── disambiguation.ts
│       │   └── index.ts
│       ├── list-projects.ts
│       ├── get-project.ts
│       ├── create-project.ts
│       ├── edit-project.ts
│       ├── delete-project.ts
│       └── move-project.ts
├── tools/
│   ├── definitions/
│   │   ├── listProjects.ts
│   │   ├── getProject.ts
│   │   ├── createProject.ts
│   │   ├── editProject.ts
│   │   ├── deleteProject.ts
│   │   └── moveProject.ts
│   └── primitives/
│       ├── listProjects.ts
│       ├── getProject.ts
│       ├── createProject.ts
│       ├── editProject.ts
│       ├── deleteProject.ts
│       └── moveProject.ts
└── server.ts            # Register new tools

tests/
├── contract/
│   └── project-tools/
│       ├── list-projects.test.ts
│       ├── get-project.test.ts
│       ├── create-project.test.ts
│       ├── edit-project.test.ts
│       ├── delete-project.test.ts
│       ├── move-project.test.ts
│       └── shared-*.test.ts
└── unit/
    └── project-tools/
        ├── listProjects.test.ts
        ├── getProject.test.ts
        ├── createProject.test.ts
        ├── editProject.test.ts
        ├── deleteProject.test.ts
        └── moveProject.test.ts
```

**Structure Decision**: Single project layout, matching existing Phase 1-3
patterns. Contracts in both `specs/` (design artifacts) and `src/contracts/`
(runtime code).

## Complexity Tracking

No constitution violations. All tools follow established patterns from Phase 1,
Phase 2, and Phase 3 implementations.

---

## Phase 0: Outline & Research

### Research Tasks

| Unknown | Research Task | Source |
|---------|---------------|--------|
| Project API properties | Document all writable/read-only properties | omni-automation.com |
| `Project.Status` enum | Confirm 4 status values (Active, OnHold, Done, Dropped) | omni-automation.com |
| `reviewInterval` structure | Document ReviewInterval class (steps, unit) | omni-automation.com |
| `new Project()` constructor | Confirm constructor signature and positioning | omni-automation.com |
| `deleteObject(project)` | Confirm cascade delete behavior for child tasks | omni-automation.com |
| `moveSections()` | Confirm API for moving projects between folders | omni-automation.com |
| `Project.byIdentifier()` | Confirm lookup pattern for projects | omni-automation.com |
| `flattenedProjects.byName()` | Confirm name-based lookup with disambiguation | omni-automation.com |
| Project type switching | Confirm auto-clear behavior for sequential/singleActions | omni-automation.com |

### Research Status: COMPLETE

OmniJS Project API documentation extracted and documented in [research.md](./research.md):

- <https://omni-automation.com/omnifocus/project.html> - Project class reference
- <https://omni-automation.com/omnifocus/database.html> - Database operations

---

## Phase 1: Design & Contracts (COMPLETE)

### Project Entity Model

Documented in [data-model.md](./data-model.md):

- All properties (writable vs read-only) with Zod schemas
- Relationships (parentFolder, tags, tasks, nextTask)
- Status enumeration (4 values: Active, OnHold, Done, Dropped)
- ReviewInterval structure (steps, unit)
- ProjectSummary and ProjectFull interface definitions
- ProjectType derivation (parallel, sequential, single-actions)
- Cross-layer traceability (Zod ↔ OmniJS ↔ TypeScript)

### API Contracts

All contracts implemented in [contracts/](./contracts/) following the task-tools pattern:

#### 1. `list_projects` Contract

- **Input**: Filters (folder, status, reviewStatus, flagged, dates, limit, includeCompleted)
- **Success**: `{ success: true, projects: ProjectSummary[] }`
- **Error**: `{ success: false, error: string }`

#### 2. `get_project` Contract

- **Input**: `{ id?: string, name?: string }` (one required)
- **Success**: `{ success: true, project: ProjectFull }`
- **Error**: Standard error or disambiguation error

#### 3. `create_project` Contract

- **Input**: `{ name: string, folderId?: string, folderName?: string, position?, ...properties }`
- **Success**: `{ success: true, id: string, name: string }`
- **Error**: Standard error or folder not found

#### 4. `edit_project` Contract

- **Input**: `{ id?: string, name?: string, ...properties }`
- **Success**: `{ success: true, id: string, name: string }`
- **Error**: Standard error, disambiguation, or validation error

#### 5. `delete_project` Contract

- **Input**: `{ id?: string, name?: string }` (one required)
- **Success**: `{ success: true, id: string, name: string }`
- **Error**: Standard error or disambiguation error

#### 6. `move_project` Contract

- **Input**: `{ id?: string, name?: string, targetFolderId?: string, targetFolderName?: string, position? }`
- **Success**: `{ success: true, id: string, name: string, parentFolderId: string | null, parentFolderName: string | null }`
- **Error**: Standard error, disambiguation, or target not found

### Shared Types

- `ProjectSummarySchema` - Minimal project fields for list results
- `ProjectFullSchema` - Complete project with all properties
- `ProjectStatusSchema` - Enum for 4 status values
- `ReviewIntervalSchema` - Steps and unit for review scheduling
- `DisambiguationErrorSchema` - Reuse pattern from task-tools

---

## Design Decisions

### 1. Filter Architecture for `list_projects`

**Decision**: Generate filter conditions inline in OmniJS script (like `listTasks.ts`)

**Rationale**:

- Existing pattern proven in `listTasks` primitive
- Filters applied server-side before JSON serialization
- Avoids transferring entire database to Node.js

### 2. Review Status Filter Logic

**Decision**: Implement 3 modes: `"due"`, `"upcoming"`, `"any"`

**Rationale**:

- Spec FR-004 defines precise semantics
- `due`: nextReviewDate <= today
- `upcoming`: nextReviewDate within 7 days (but not past due)
- `any`: No review filtering
- Projects without review intervals excluded from review filters

### 3. Project Type Auto-Clear

**Decision**: Auto-clear conflicting property when setting sequential or containsSingletonActions

**Rationale**:

- Clarification recorded in spec (Session 2025-12-12)
- Official Omni Automation pattern: explicitly clear conflicting property first
- No validation error; silent correction
- Pattern: `if (sequential) { project.containsSingletonActions = false; }`

### 4. Disambiguation Pattern

**Decision**: Reuse disambiguation error schema from task-tools

**Rationale**:

- Consistent error structure across all tools
- AI assistants can handle uniformly
- `{ success: false, code: "DISAMBIGUATION_REQUIRED", matchingIds: [...] }`

### 5. Position Parameter for create_project and move_project

**Decision**: Support `"beginning"`, `"ending"` (default), and relative positioning

**Rationale**:

- Spec FR-023 and FR-047 require position control
- Matches OmniFocus `new Project(name, folder)` positioning capabilities
- `beforeProject` and `afterProject` enable precise placement

### 6. Folder Filter Behavior

**Decision**: Include nested subfolders recursively when filtering by folder

**Rationale**:

- Spec FR-002 explicitly requires nested subfolder inclusion
- Matches user mental model (folder = container hierarchy)
- Top-level projects (no parent) excluded from folder filters

---

## Implementation Order

The tools should be implemented in dependency order:

1. **Contracts** (copy from `specs/` to `src/contracts/`) - Contracts already exist
   in `specs/004-project-management/contracts/`; implementation copies them to
   `src/contracts/project-tools/` for runtime use
2. **`list_projects`** - Foundational for discovery, most complex filters
3. **`get_project`** - Inspect single project, simpler than list
4. **`create_project`** - Write operation with positioning
5. **`edit_project`** - Update properties with auto-clear logic
6. **`delete_project`** - Cascade delete with validation
7. **`move_project`** - Reorganization with target validation

Each tool follows TDD Red-Green-Refactor:

1. Contract tests (PASS - tests validate existing schema structure)
2. Unit tests for primitive (FAIL - tests implementation before code exists)
3. Implement primitive (GREEN)
4. Implement definition (integration)
5. Manual OmniFocus verification

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Review interval complexity | Medium | Medium | Research exact ReviewInterval API structure |
| Folder disambiguation | Low | Medium | Follow existing folder lookup patterns |
| Project type switching | Low | Low | Auto-clear pattern documented in clarification |
| Cascade delete safety | Low | High | Clear documentation; match OmniFocus behavior |
| Position parameter complexity | Low | Medium | Research exact positioning API |

---

## Completion Status

### Phase 0: Research - COMPLETE

- [x] research.md - OmniJS Project API documentation (2025-12-12)

### Phase 1: Design - COMPLETE

- [x] data-model.md - Project entity model with Zod schemas (2025-12-12)
- [x] contracts/ - All 6 tool contracts with shared types (2025-12-12)
  - shared/project.ts - Core project schemas
  - shared/disambiguation.ts - Disambiguation error schema
  - list-projects.ts, get-project.ts, create-project.ts
  - edit-project.ts, delete-project.ts, move-project.ts
  - index.ts - Main exports
- [x] quickstart.md - Development setup and TDD workflow (2025-12-12)

### Phase 2: Implementation - PENDING

Ready for `/speckit.tasks` to generate implementation task breakdown.

## Next Steps

1. Run `/speckit.tasks` to generate implementation task breakdown
2. Create feature branch `004-project-management`
3. Copy contracts to `src/contracts/project-tools/`
4. Implement tools in TDD order (list → get → create → edit → delete → move)
5. Register tools in `src/server.ts`
6. Update README and CLAUDE.md
