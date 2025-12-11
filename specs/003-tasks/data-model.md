# Data Model: Enhanced Task Management Tools

**Feature**: Phase 3 - Enhanced Task Management
**Created**: 2025-12-11
**Status**: Complete

## Overview

This document defines the data model for the 4 enhanced task management tools:
`list_tasks`, `get_task`, `set_planned_date`, and `append_note`.

## Entity: Task

The Task entity represents a unit of work in OmniFocus. Tasks can exist in the
inbox (no project) or within projects, and can be organized hierarchically as
subtasks.

### Task Summary (List View)

Minimal representation for list results. Used by `list_tasks`.

```typescript
interface TaskSummary {
  // Identity
  id: string;                    // Unique identifier (primaryKey)
  name: string;                  // Task title

  // Status
  taskStatus: TaskStatus;        // Current status enumeration
  flagged: boolean;              // Flagged indicator

  // Dates
  deferDate: string | null;      // ISO 8601, when available
  dueDate: string | null;        // ISO 8601, deadline
  plannedDate: string | null;    // ISO 8601, v4.7+ only

  // Relationships (minimal)
  projectId: string | null;      // Containing project ID (null if inbox)
  projectName: string | null;    // Containing project name (null if inbox)
  tagIds: string[];              // Associated tag IDs
  tagNames: string[];            // Associated tag names
}
```

### Task Full (Detail View)

Complete representation with all properties. Used by `get_task`.

```typescript
interface TaskFull {
  // Identity
  id: string;                    // Unique identifier (primaryKey)
  name: string;                  // Task title
  note: string;                  // Note content

  // Status
  taskStatus: TaskStatus;        // Current status enumeration
  completed: boolean;            // Completion status
  flagged: boolean;              // Flagged indicator
  effectiveFlagged: boolean;     // Computed flagged (considers containers)

  // Dates (writable)
  deferDate: string | null;      // ISO 8601, when available
  dueDate: string | null;        // ISO 8601, deadline
  plannedDate: string | null;    // ISO 8601, v4.7+ (when to work on it)

  // Dates (computed/read-only)
  effectiveDeferDate: string | null;    // ISO 8601, computed
  effectiveDueDate: string | null;      // ISO 8601, computed
  effectivePlannedDate: string | null;  // ISO 8601, v4.7.1+ computed
  completionDate: string | null;        // ISO 8601, when completed
  dropDate: string | null;              // ISO 8601, when dropped
  added: string | null;                 // ISO 8601, creation date
  modified: string | null;              // ISO 8601, last modified

  // Time Estimation
  estimatedMinutes: number | null;      // Time estimate (macOS v3.5+)

  // Hierarchy Configuration
  sequential: boolean;           // Children form dependency chain
  completedByChildren: boolean;  // Auto-complete when children done
  shouldUseFloatingTimeZone: boolean;  // v3.6+ floating timezone

  // Hierarchy Status
  hasChildren: boolean;          // Has child tasks
  inInbox: boolean;              // Direct child of inbox

  // Relationships
  containingProject: {           // Host project (null if inbox)
    id: string;
    name: string;
  } | null;
  parent: {                      // Parent task (null if root task)
    id: string;
    name: string;
  } | null;
  tags: Array<{                  // Associated tags
    id: string;
    name: string;
  }>;
}
```

## Enumeration: TaskStatus

The status of a task, computed by OmniFocus based on various factors.

```typescript
type TaskStatus =
  | 'Available'   // Task is available to work on
  | 'Blocked'     // Not available (deferred, sequential, on-hold tag)
  | 'Completed'   // Task is completed
  | 'Dropped'     // Task is dropped/abandoned
  | 'DueSoon'     // Task is due soon (within configured threshold)
  | 'Next'        // First available task in sequential project
  | 'Overdue';    // Task is past due date
```

### Status Determination

| Status | Conditions |
|--------|------------|
| Available | No blocking conditions, ready to work on |
| Blocked | Future defer date, preceding sequential task, or on-hold tag |
| Completed | `completed === true` |
| Dropped | `active === false` after being dropped |
| DueSoon | Due date within configured "due soon" threshold |
| Next | First available task in sequential project/task |
| Overdue | Due date has passed |

**Note**: `DueSoon`, `Next`, and `Overdue` are refinements of `Available` status.

## Response Schemas

### Success Response

```typescript
interface SuccessResponse {
  success: true;
  // Tool-specific data
}
```

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: string;  // Human-readable error message
}
```

### Disambiguation Error

When a name-based lookup matches multiple tasks.

```typescript
interface DisambiguationError {
  success: false;
  error: string;  // e.g., "Ambiguous task name 'Call Mom'. Found 2 matches."
  code: 'DISAMBIGUATION_REQUIRED';
  matchingIds: string[];  // All matching task IDs
}
```

## Tool-Specific Schemas

### list_tasks

**Input**:

```typescript
interface ListTasksInput {
  // Container filters
  projectId?: string;           // Filter by project ID
  projectName?: string;         // Filter by project name
  folderId?: string;            // Filter by folder ID (includes nested projects)
  folderName?: string;          // Filter by folder name

  // Tag filters
  tagIds?: string[];            // Filter by tag IDs
  tagNames?: string[];          // Filter by tag names
  tagFilterMode?: 'any' | 'all'; // OR logic (default) vs AND logic

  // Status filters
  status?: TaskStatus[];        // Filter by status values
  flagged?: boolean;            // Filter by flagged status
  includeCompleted?: boolean;   // Include completed/dropped (default: false)

  // Date filters (ISO 8601)
  dueBefore?: string;           // Due date upper bound
  dueAfter?: string;            // Due date lower bound
  deferBefore?: string;         // Defer date upper bound
  deferAfter?: string;          // Defer date lower bound
  plannedBefore?: string;       // Planned date upper bound (v4.7+)
  plannedAfter?: string;        // Planned date lower bound (v4.7+)
  completedBefore?: string;     // Completion date upper bound
  completedAfter?: string;      // Completion date lower bound

  // Result options
  limit?: number;               // Max results (default: 100, max: 1000)
  flatten?: boolean;            // Flat list vs hierarchy (default: true)
}
```

**Output**:

```typescript
interface ListTasksResponse {
  success: true;
  tasks: TaskSummary[];
}
```

### get_task

**Input**:

```typescript
interface GetTaskInput {
  id?: string;    // Task ID (takes precedence)
  name?: string;  // Task name (used if no ID)
}
// At least one of id or name is required
```

**Output** (success):

```typescript
interface GetTaskSuccessResponse {
  success: true;
  task: TaskFull;
}
```

**Output** (disambiguation):

```typescript
interface GetTaskDisambiguationResponse {
  success: false;
  error: string;
  code: 'DISAMBIGUATION_REQUIRED';
  matchingIds: string[];
}
```

### set_planned_date

**Input**:

```typescript
interface SetPlannedDateInput {
  id?: string;           // Task ID (takes precedence)
  name?: string;         // Task name (used if no ID)
  plannedDate: string | null;  // ISO 8601 date or null to clear
}
// At least one of id or name is required
```

**Output** (success):

```typescript
interface SetPlannedDateSuccessResponse {
  success: true;
  id: string;
  name: string;
}
```

### append_note

**Input**:

```typescript
interface AppendNoteInput {
  id?: string;    // Task ID (takes precedence)
  name?: string;  // Task name (used if no ID)
  text: string;   // Text to append
}
// At least one of id or name is required
```

**Output** (success):

```typescript
interface AppendNoteSuccessResponse {
  success: true;
  id: string;
  name: string;
}
```

## Validation Rules

### Task Identification

- At least one of `id` or `name` must be provided
- If both provided, `id` takes precedence
- Name lookups use exact match
- Multiple name matches trigger disambiguation error

### Date Formats

- All dates use ISO 8601 format (e.g., `"2025-01-15T09:00:00Z"`)
- OmniFocus interprets dates in local timezone
- Invalid date format returns validation error

### Status Values

- Case-sensitive: `'Available'` not `'available'`
- Must be one of the 7 defined values
- Multiple statuses use OR logic

### Tag Filter Mode

- `'any'` (default): Task has ANY of the specified tags (OR)
- `'all'`: Task has ALL of the specified tags (AND)

### Limits

- `limit` minimum: 1 (validated by Zod - `limit: 0` is a validation error)
- `limit` default: 100
- `limit` maximum: 1000
- Values > 1000 are capped to 1000 (silent clamp, no error)
- Limit is applied AFTER all filters (post-filter limit)

### Empty Array Handling

Empty arrays are treated as "no filter" (NOT "no matches"):

- `tagIds: []` - No tag filter applied (returns tasks regardless of tags)
- `tagNames: []` - No tag filter applied
- `status: []` - No status filter applied (returns all statuses)

### Null Date Handling

Tasks with `null` dates are EXCLUDED from date filter results:

- `dueBefore`/`dueAfter` filters exclude tasks with `dueDate: null`
- `deferBefore`/`deferAfter` filters exclude tasks with `deferDate: null`
- `plannedBefore`/`plannedAfter` filters exclude tasks with `plannedDate: null`
- `completedBefore`/`completedAfter` filters exclude tasks with `completionDate: null`

### Date Boundary Inclusivity

All date boundaries are **inclusive**:

- `dueAfter: "2024-01-01"` includes tasks due on or after 2024-01-01
- `dueBefore: "2024-12-31"` includes tasks due on or before 2024-12-31
- Combined range: `dueAfter` + `dueBefore` creates inclusive range `[after, before]`

### Filter Interaction Matrix

| Filter A | Filter B | Behavior |
|----------|----------|----------|
| `projectId` | `projectName` | `projectId` takes precedence |
| `folderId` | `folderName` | `folderId` takes precedence |
| `projectId` | `folderId` | Both apply (AND) - task in project AND project in folder |
| `tagIds` | `tagNames` | Combined into single tag set |
| `status` | `includeCompleted: false` | `includeCompleted` applied after status filter |
| `dueBefore` | `dueAfter` | Creates inclusive date range (AND) |
| All filters | (multiple) | Combine with AND logic |

### Result Ordering

Results are returned in OmniFocus natural order (database iteration order). Sort
order customization is explicitly out of scope (see spec.md §Out of Scope).

### Truncation Indication

When `limit` is reached, no explicit truncation indicator is returned. Clients
should check if `tasks.length === limit` to determine if more results may exist.

## Version-Specific Features

| Feature | Property | Min Version | Platform | Fallback |
|---------|----------|-------------|----------|----------|
| Planned date | `plannedDate` | v4.7+ | All | Return `null` |
| Effective planned | `effectivePlannedDate` | v4.7.1+ | All | Return `null` |
| Effective completed | `effectiveCompletedDate` | v3.8+ | All | Return `null` |
| Effective drop | `effectiveDropDate` | v3.8+ | All | Return `null` |
| Time estimate | `estimatedMinutes` | v3.5+ | macOS only | `null` |
| Floating timezone | `shouldUseFloatingTimeZone` | v3.6+ | All | `false` |
| plannedBefore/After filters | (list_tasks) | v4.7+ | All | Ignore filter silently |

### Platform Detection

The MCP server runs on macOS only. Platform restrictions affect:

- `estimatedMinutes`: Available on macOS only. iOS/iPadOS returns `null`.
  - Detection: Not required (MCP server only runs on macOS)
  - Note: If future cross-platform support is added, use `Device.current.type`

### Inheritance Behavior

**effectivePlannedDate** (v4.7.1+):
- Computed from the task's own `plannedDate` if set
- Otherwise inherited from the containing project's `plannedDate`
- If neither task nor project has a planned date, returns `null`
- Inheritance chain: Task → Project (not inherited from parent task)

## State Transitions

### Task Completion

```text
Available/DueSoon/Next/Overdue → Completed
  ↳ via: markComplete() or task.completed = true
```

### Task Dropping

```text
Available/Blocked → Dropped
  ↳ via: drop() or task.active = false
```

### Reverting Completion

```text
Completed → Available/Blocked (based on conditions)
  ↳ via: markIncomplete()
```

## Relationships

### Task ↔ Project

- A task belongs to at most one project (`containingProject`)
- Inbox tasks have `containingProject: null`
- A project's root task is accessed via `project.task`

### Task ↔ Task (Hierarchy)

- Tasks can contain subtasks (`children`)
- A subtask has one parent (`parent`)
- Root tasks have `parent: null`
- `flattenedTasks` provides all descendants

### Task ↔ Tag (Many-to-Many)

- A task can have multiple tags
- A tag can be assigned to multiple tasks
- Tags are ordered within a task

## Type System Conventions

### Optional vs Nullable Fields

The schema uses distinct patterns for input and output fields:

| Pattern | Usage | Meaning |
|---------|-------|---------|
| `z.optional()` | Input parameters | Field may be omitted entirely |
| `z.nullable()` | Output fields | Field is always present but value may be null |
| `z.string().optional()` | Filter inputs | If omitted, filter is not applied |
| `z.string().nullable()` | Response dates | Field present; null means "not set" |

**Example**:
- Input: `{ dueBefore?: string }` - omit to skip due date filtering
- Output: `{ dueDate: string | null }` - always returned; null if no due date set

### Empty Array Handling

For array parameters in inputs:
- **Omitted**: Filter not applied (equivalent to "any")
- **Empty array `[]`**: Filter applies with empty set (matches nothing for "all" mode)
- **Non-empty array**: Filter applies normally

Example with `tagIds`:
```typescript
// Omitted - no tag filtering
{ status: ['Available'] }

// Empty array with 'all' mode - matches nothing (task must have all of zero tags)
{ tagIds: [], tagFilterMode: 'all' }

// Non-empty - matches tasks with these tags
{ tagIds: ['tag1', 'tag2'], tagFilterMode: 'any' }
```

## Cross-Layer Traceability

### Zod Schema ↔ OmniJS Property Mapping

| Zod Field | OmniJS Property | Transform |
|-----------|-----------------|-----------|
| `id` | `task.id.primaryKey` | Direct (string) |
| `name` | `task.name` | Direct |
| `note` | `task.note` | Direct |
| `taskStatus` | `task.taskStatus` | statusMap[value] (see below) |
| `flagged` | `task.flagged` | Direct |
| `deferDate` | `task.deferDate` | `date?.toISOString() ?? null` |
| `dueDate` | `task.dueDate` | `date?.toISOString() ?? null` |
| `plannedDate` | `task.plannedDate` | `date?.toISOString() ?? null` (v4.7+) |
| `completionDate` | `task.completionDate` | `date?.toISOString() ?? null` |
| `containingProject` | `task.containingProject` | `{id: p.id.primaryKey, name: p.name}` |
| `parent` | `task.parent` | `{id: t.id.primaryKey, name: t.name}` |
| `tags` | `task.tags` | `tags.map(t => ({id: t.id.primaryKey, name: t.name}))` |

### TaskStatus Bidirectional Mapping

```javascript
// OmniJS → JSON String (output)
var statusMap = {};
statusMap[Task.Status.Available] = 'Available';
statusMap[Task.Status.Blocked] = 'Blocked';
statusMap[Task.Status.Completed] = 'Completed';
statusMap[Task.Status.Dropped] = 'Dropped';
statusMap[Task.Status.DueSoon] = 'DueSoon';
statusMap[Task.Status.Next] = 'Next';
statusMap[Task.Status.Overdue] = 'Overdue';

// JSON String → OmniJS (input/filter)
var reverseStatusMap = {
  'Available': Task.Status.Available,
  'Blocked': Task.Status.Blocked,
  'Completed': Task.Status.Completed,
  'Dropped': Task.Status.Dropped,
  'DueSoon': Task.Status.DueSoon,
  'Next': Task.Status.Next,
  'Overdue': Task.Status.Overdue
};
```

### Zod Schema ↔ TypeScript Type Mapping

All TypeScript types are derived from Zod schemas using `z.infer<typeof Schema>`:

| Zod Schema | TypeScript Type | Location |
|------------|-----------------|----------|
| `TaskStatusSchema` | `TaskStatus` | contracts/shared/task.ts |
| `TaskSummarySchema` | `TaskSummary` | contracts/shared/task.ts |
| `TaskFullSchema` | `TaskFull` | contracts/shared/task.ts |
| `EntityReferenceSchema` | `EntityReference` | contracts/shared/task.ts |
| `TagReferenceSchema` | `TagReference` | contracts/shared/task.ts |
| `ListTasksInputSchema` | `ListTasksInput` | contracts/list-tasks.ts |
| `ListTasksResponseSchema` | `ListTasksResponse` | contracts/list-tasks.ts |
| `GetTaskInputSchema` | `GetTaskInput` | contracts/get-task.ts |
| `GetTaskResponseSchema` | `GetTaskResponse` | contracts/get-task.ts |
| `SetPlannedDateInputSchema` | `SetPlannedDateInput` | contracts/set-planned-date.ts |
| `SetPlannedDateResponseSchema` | `SetPlannedDateResponse` | contracts/set-planned-date.ts |
| `AppendNoteInputSchema` | `AppendNoteInput` | contracts/append-note.ts |
| `AppendNoteResponseSchema` | `AppendNoteResponse` | contracts/append-note.ts |
| `DisambiguationErrorSchema` | `DisambiguationError` | contracts/shared/disambiguation.ts |

### Contract Location Mapping

Contracts exist in two locations with identical content:

| Spec Location | Runtime Location | Sync Method |
|---------------|------------------|-------------|
| `specs/003-tasks/contracts/` | `src/contracts/task-tools/` | Manual copy during implementation |

The spec location is the source of truth. During implementation, contracts are
copied to src/contracts/ for runtime use.
