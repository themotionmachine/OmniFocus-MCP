# Data Model: Bulk Operations

**Branch**: `010-bulk-operations` | **Date**: 2026-03-18

## Entities

### ItemIdentifier (reuse from status-tools)

Identifies a task or project by ID (preferred) or name (fallback with disambiguation).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | optional | Item ID (direct lookup) |
| name | string | optional | Item name (fallback, may need disambiguation) |

**Constraint**: At least one of `id` or `name` must be non-empty.

**Resolution Order**: `id` takes precedence. Name lookup searches both tasks and projects. Multiple matches trigger `DISAMBIGUATION_REQUIRED`.

### TaskPosition

Specifies where to place tasks. Supports project, parent task, and inbox targets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| target | object | yes | Target location (one of: project, task, inbox) |
| target.projectId | string | conditional | Target project ID |
| target.projectName | string | conditional | Target project name |
| target.taskId | string | conditional | Target parent task ID (for subtask placement) |
| target.taskName | string | conditional | Target parent task name |
| target.inbox | boolean | conditional | `true` to target inbox |
| placement | enum | no | `beginning`, `ending` (default: `ending`) |
| relativeTo | string | optional | Sibling task ID for `before`/`after` placement |

**Target Resolution**: Exactly one target type must be specified. Project targets use `project.ending`/`project.beginning`. Task targets create subtasks. Inbox uses `inbox.ending`/`inbox.beginning`.

**Placement Options**:
| Placement | relativeTo | OmniJS Expression |
|-----------|-----------|-------------------|
| `beginning` | omitted | `project.beginning` / `inbox.beginning` / `task.beginning` |
| `ending` | omitted | `project.ending` / `inbox.ending` / `task.ending` |
| `before` | sibling ID | `siblingTask.before` |
| `after` | sibling ID | `siblingTask.after` |

### SectionPosition (reuse folder-tools PositionSchema)

Specifies where to place sections (folders and/or projects). Supports folder targets and library root only.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| placement | enum | yes | `before`, `after`, `beginning`, `ending` |
| relativeTo | string | conditional | Folder or section ID. Required for `before`/`after`. Optional for `beginning`/`ending` (omit for library root) |

**Mapping**: This is the existing `PositionSchema` from `src/contracts/folder-tools/shared/position.ts`. No new schema needed.

### PropertyUpdateSet

Properties to apply uniformly to all tasks in a `batch_update_tasks` operation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| flagged | boolean | no | Set flagged status |
| dueDate | string (ISO 8601) | no | Set due date |
| clearDueDate | boolean | no | Clear due date (mutually exclusive with dueDate) |
| deferDate | string (ISO 8601) | no | Set defer date |
| clearDeferDate | boolean | no | Clear defer date (mutually exclusive with deferDate) |
| estimatedMinutes | number | no | Set estimated minutes |
| clearEstimatedMinutes | boolean | no | Clear estimated minutes |
| plannedDate | string (ISO 8601) | no | Set planned date (v4.7+) |
| clearPlannedDate | boolean | no | Clear planned date (v4.7+) |
| addTags | string[] | no | Tag names or IDs to add |
| removeTags | string[] | no | Tag names or IDs to remove |
| note | string | no | Text to append to existing note |

**Constraint**: At least one property must be specified (FR-013).

**Processing Order**: Tag removals before additions (FR-014). All other properties have no ordering dependency.

**Mutual Exclusions**:
- `dueDate` and `clearDueDate` cannot both be specified
- `deferDate` and `clearDeferDate` cannot both be specified
- `estimatedMinutes` and `clearEstimatedMinutes` cannot both be specified
- `plannedDate` and `clearPlannedDate` cannot both be specified

**Version Gating**: `plannedDate` and `clearPlannedDate` require OmniFocus v4.7+. If specified on older versions, per-item results return `VERSION_NOT_SUPPORTED`.

### BulkBatchItemResult

Per-item result for bulk operations. Extends the status-tools pattern with fields for new item IDs (from duplicate/convert operations).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| itemId | string | yes | Resolved item ID (or input if lookup failed) |
| itemName | string | yes | Item name (empty string if lookup failed) |
| itemType | enum | yes | `task`, `project`, `folder` |
| success | boolean | yes | Whether the operation succeeded |
| error | string | no | Error message (when success=false) |
| code | string | no | Error/status code |
| candidates | array | no | Disambiguation candidates (id + name + type) |
| newId | string | no | New item ID (for duplicate/convert results) |
| newName | string | no | New item name (for duplicate/convert results) |

### Summary

Aggregate counts for batch operation results. Reused from status-tools pattern.

| Field | Type | Description |
|-------|------|-------------|
| total | number | Total items in request |
| succeeded | number | Items that succeeded |
| failed | number | Items that failed |

**Invariant**: `total === succeeded + failed` (enforced by implementation, not schema).

## Tool Response Shapes

All 6 tools follow the same discriminated union pattern:

### Success Response (top-level)
```json
{
  "success": true,
  "results": [ /* BulkBatchItemResult[] */ ],
  "summary": { "total": N, "succeeded": N, "failed": N }
}
```

### Error Response (top-level, catastrophic only)
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

**Note**: Individual item failures are reported in `results[]`, not as top-level errors. Top-level errors are reserved for catastrophic failures (e.g., OmniFocus unreachable) and pre-validation failures (e.g., TARGET_NOT_FOUND, VALIDATION_ERROR).

## Tool Input/Output Summary

### move_tasks (FR-001)
- **Input**: `items` (1-100 ItemIdentifier[]), `position` (TaskPosition)
- **Output**: Per-item results. No `newId` (items are relocated, not created).
- **OmniJS**: Calls `moveTasks([task], position)` per item in loop.

### duplicate_tasks (FR-002)
- **Input**: `items` (1-100 ItemIdentifier[]), `position` (TaskPosition)
- **Output**: Per-item results with `newId` and `newName` for each duplicate.
- **OmniJS**: Calls `duplicateTasks([task], position)` per item. Returns `TaskArray` with the new copy. Script resets completion status via `markIncomplete()`.

### batch_update_tasks (FR-006)
- **Input**: `items` (1-100 ItemIdentifier[]), `properties` (PropertyUpdateSet)
- **Output**: Per-item results. No `newId`.
- **OmniJS**: Iterates items, applies property changes per-task in try-catch. Tag removals before additions.

### convert_tasks_to_projects (FR-003)
- **Input**: `items` (1-100 ItemIdentifier[]), `targetFolderId` (optional), `targetFolderName` (optional)
- **Output**: Per-item results with `newId` and `newName` for each new project.
- **OmniJS**: Calls `convertTasksToProjects([task], position)` per item. Returns `Array of Project`.

### move_sections (FR-004)
- **Input**: `items` (1-100 ItemIdentifier[]), `position` (SectionPosition)
- **Output**: Per-item results. No `newId`.
- **OmniJS**: Calls `moveSections([section], position)` per item in loop.

### duplicate_sections (FR-005)
- **Input**: `items` (1-100 ItemIdentifier[]), `position` (SectionPosition)
- **Output**: Per-item results with `newId` and `newName` for each duplicate.
- **OmniJS**: Calls `duplicateSections([section], position)` per item. Returns `SectionArray` with the new copy.

## Error Codes

| Code | Scope | Description |
|------|-------|-------------|
| `NOT_FOUND` | Per-item | Item not found by ID or name |
| `DISAMBIGUATION_REQUIRED` | Per-item | Name matches multiple items (includes `candidates`) |
| `TARGET_NOT_FOUND` | Top-level | Target location (project/folder/inbox) not found |
| `OPERATION_FAILED` | Per-item | OmniJS threw an exception during the operation |
| `TAG_NOT_FOUND` | Per-item | Tag in addTags/removeTags not found (batch_update_tasks) |
| `RELATIVE_TARGET_NOT_FOUND` | Per-item | relativeTo sibling not found |
| `ALREADY_A_PROJECT` | Per-item | Task is already a project root (convert_tasks_to_projects) |
| `VERSION_NOT_SUPPORTED` | Per-item | OmniFocus version too old (plannedDate in batch_update_tasks) |
| `VALIDATION_ERROR` | Top-level | Request validation failure (empty items, >100, empty properties) |

## State Transitions

### Task Move
```
Task in Location A --> moveTasks([task], locationB) --> Task in Location B
```
- Properties preserved (name, note, tags, dates, flagged, subtasks)
- Original location loses the task

### Task Duplicate
```
Task in Location A --> duplicateTasks([task], locationB) --> Original unchanged + New copy in Location B
```
- Copy inherits all properties
- Copy is always active/incomplete (FR-011)
- Copy has a new unique ID

### Task Convert to Project
```
Task (with subtasks) --> convertTasksToProjects([task], folder) --> New Project (subtasks become project tasks)
```
- Original task is consumed (removed)
- New project inherits name, note
- Subtasks become project child tasks
- Tags/dates transfer where applicable

### Batch Update
```
Task with properties P --> batch_update_tasks --> Task with modified properties P'
```
- Only specified properties change
- Unspecified properties remain untouched
- Tag removals processed before additions
- Atomic per-task (no rollback on partial property failure)
