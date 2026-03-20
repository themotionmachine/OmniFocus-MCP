# Research: TaskPaper Import/Export

**Branch**: `012-taskpaper` | **Date**: 2026-03-20

## Research Tasks & Findings

### R-001: OmniJS `byParsingTransportText` Behavior

**Decision**: Use `Task.byParsingTransportText(text, null)` for import.

**Rationale**: The OmniJS API creates tasks immediately upon parsing -- there is no dry-run mode. The `singleTask` parameter uses `null` per official Omni Automation documentation conventions (not `false`). When given invalid or unparseable text, it returns an empty array rather than throwing.

**Alternatives considered**:
- `document.makeFileWrapper()` -- async/Promise-based, exports entire database, cannot be used with synchronous `executeOmniJS`
- Manual parsing + `new Task()` calls -- unnecessarily complex, loses OmniFocus's built-in transport text parser

### R-002: Export Serialization Strategy

**Decision**: Custom OmniJS serializer that reads task properties and builds transport text strings manually with recursive subtask traversal.

**Rationale**: OmniJS provides no built-in `Task.toTransportText()` or equivalent method. The custom serializer emits: task name, `@tags`, `@due(date)`, `@defer(date)`, `@flagged`, `@estimate(duration)`, `@done(date)` for completed items, `//` notes. Structural parameters (`@autodone`, `@parallel`) and repetition parameters (`@repeat-method`, `@repeat-rule`) are omitted per KISS principle.

**Alternatives considered**:
- `document.makeFileWrapper()` -- async, exports entire document not scoped items
- OmniFocus "Copy as TaskPaper" menu -- requires UI automation, not scriptable

### R-003: Validate Transport Text Implementation

**Decision**: Pure TypeScript regex/string parser with no OmniJS dependency.

**Rationale**: Since `byParsingTransportText` creates tasks immediately with no dry run, a pure TypeScript parser provides preview capability without touching OmniFocus. This makes it testable without OmniFocus running, fast (no osascript overhead), and safe (zero side effects).

**Alternatives considered**:
- OmniJS-based validation -- would require creating then deleting tasks (destructive)
- Calling `byParsingTransportText` and then undo -- no reliable programmatic undo for batch creates

### R-004: Target Project Placement Strategy

**Decision**: Two-phase approach: (1) `byParsingTransportText(text, null)` creates in inbox, (2) `moveTasks(createdTasks, targetProject)` relocates to target project.

**Rationale**: The `byParsingTransportText` API does not accept a target project parameter. The two-phase approach reuses the existing `moveTasks` OmniJS function already used in the bulk-tools domain. Project is resolved by identifier using `Project.byIdentifier()`.

**Alternatives considered**:
- Prepending `::ProjectName` to transport text -- fragile text manipulation, depends on exact project name matching
- Creating tasks directly with `new Task()` -- loses transport text parsing benefits

### R-005: Recursive ID Collection

**Decision**: After `byParsingTransportText` returns top-level tasks, recursively walk each task's `children` (using `flattenedChildren` or manual recursion) to collect ALL created item identifiers.

**Rationale**: `byParsingTransportText` returns only top-level Task objects. Callers need all IDs including subtasks for subsequent operations. A recursive walk function collects identifiers at all nesting depths.

**Alternatives considered**:
- Return only top-level IDs -- insufficient for callers who need to reference subtasks
- Use `flattenedTasks` global filter by creation date -- race-condition-prone in concurrent usage

### R-006: Status Filter for Export

**Decision**: Export accepts `status` filter parameter with enum `['active', 'completed', 'dropped', 'all']`, defaulting to `'active'`. Follows existing `TaskStatusFilterSchema` pattern from search-tasks.

**Rationale**: Active-by-default is safest for the common use case. Completed tasks emit `@done(date)` in output. The pattern is already established in the codebase.

**Alternatives considered**:
- Always export all statuses -- clutters output with completed/dropped items by default
- Separate boolean flags -- more complex API surface than a single enum

### R-007: Transport Text Token Set

**Decision**: The canonical transport text token set recognized by the validator:
- Task name (plain text on a line)
- `!` (flagged)
- `::ProjectName` (project assignment, import-only directive)
- `@tag` (tag assignment)
- `#date` (ISO 8601 preferred for dates)
- `$duration` (estimated duration)
- `//note` (note text)
- Tab indentation for subtask hierarchy
- `@autodone`, `@parallel`, `@repeat-method`, `@repeat-rule` (recognized to avoid false warnings)
- `@defer(date)`, `@due(date)`, `@done(date)`, `@estimate(duration)`, `@flagged` (metadata parameters)

**Rationale**: The validator must recognize the full set of officially-supported TaskPaper parameters to avoid false-positive warnings per SC-003.

### R-008: Existing Codebase Patterns

**Decision**: Follow search-tools/database-tools architecture patterns.

**Rationale**: The codebase has well-established patterns:
- Contracts: `src/contracts/{domain}-tools/` with per-tool schema files, shared/ directory, and index.ts barrel export
- Definitions: `src/tools/definitions/{toolName}.ts` -- Zod input schema, MCP handler, response formatting
- Primitives: `src/tools/primitives/{toolName}.ts` -- OmniJS script generation + execution (or pure TS for validate)
- Tests: `tests/contract/{domain}-tools/` and `tests/unit/{domain}-tools/`
- All schemas use `z.discriminatedUnion('success', [...])` for response types
- Shared schemas exported from `shared/index.ts`

**Alternatives considered**: None -- consistency with existing codebase is mandatory per constitution.
