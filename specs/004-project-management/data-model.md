# Data Model: Project Management Tools

**Feature**: Phase 4 - Project Management
**Created**: 2025-12-12
**Status**: Complete

## Overview

This document defines the data model for the 6 project management tools:
`list_projects`, `get_project`, `create_project`, `edit_project`,
`delete_project`, and `move_project`.

## Entity: Project

The Project entity represents a container for tasks in OmniFocus. Projects can
exist at the root level or within folders, and contain hierarchical task lists.
Projects are the primary organizational unit in OmniFocus's GTD-based workflow.

### Project Summary (List View)

Minimal representation for list results. Used by `list_projects`.

**Subset Constraint**: ProjectSummary MUST be a proper subset of ProjectFull.
All shared fields MUST have identical types. Type differences are NOT allowed.

**Field Count**: ProjectSummary has **12 fields**; ProjectFull has **30 fields**.

**Exclusion Rationale - reviewInterval**: ProjectSummary includes `nextReviewDate` but
excludes `reviewInterval` because:

- Summary is optimized for list filtering (nextReviewDate enables 'due'/'upcoming' filters)
- reviewInterval is configuration detail, not state information
- nextReviewDate is the actionable value (when review is needed, not the schedule definition)
- Use `get_project` to retrieve the full reviewInterval structure if needed

```typescript
interface ProjectSummary {
  // Identity
  id: string;                    // Unique identifier (primaryKey)
  name: string;                  // Project title

  // Status
  status: ProjectStatus;         // Active, OnHold, Done, Dropped
  flagged: boolean;              // Flagged indicator

  // Project Type (derived)
  projectType: ProjectType;      // 'parallel' | 'sequential' | 'single-actions'

  // Dates
  deferDate: string | null;      // ISO 8601, when available
  dueDate: string | null;        // ISO 8601, deadline
  nextReviewDate: string | null; // ISO 8601, when next review due

  // Relationships (minimal)
  parentFolderId: string | null;   // Containing folder ID (null if root)
  parentFolderName: string | null; // Containing folder name

  // Statistics
  taskCount: number;             // Number of direct child tasks
  remainingCount: number;        // Number of incomplete tasks
}
```

### Denormalized Field Derivation (ProjectSummary)

| ProjectSummary Field | Derived From (ProjectFull) | Derivation Rule |
|---------------------|---------------------------|-----------------|
| `parentFolderId` | `parentFolder` | `parentFolder?.id ?? null` |
| `parentFolderName` | `parentFolder` | `parentFolder?.name ?? null` |

### Statistics Field Derivation

| Field | OmniJS Property | Description |
|-------|-----------------|-------------|
| `taskCount` | `project.flattenedTasks.length` | Count of all tasks (direct + nested) |
| `remainingCount` | `project.flattenedTasks.filter(t => !t.completed).length` | Count of incomplete tasks |

### Project Full (Detail View)

Complete representation with all properties. Used by `get_project`.

```typescript
interface ProjectFull {
  // Identity
  id: string;                    // Unique identifier (primaryKey)
  name: string;                  // Project title
  note: string;                  // Note content (via root task)

  // Status
  status: ProjectStatus;         // Active, OnHold, Done, Dropped
  completed: boolean;            // Completion status
  flagged: boolean;              // Flagged indicator
  effectiveFlagged: boolean;     // Computed flagged (considers containers)

  // Project Type
  sequential: boolean;           // Children form dependency chain
  containsSingletonActions: boolean; // Single-actions list type
  projectType: ProjectType;      // 'parallel' | 'sequential' | 'single-actions' (derived)

  // Completion Behavior
  completedByChildren: boolean;  // Auto-complete when last child completes
  defaultSingletonActionHolder: boolean; // Receives inbox items on cleanup

  // Dates (writable)
  deferDate: string | null;      // ISO 8601, when available
  dueDate: string | null;        // ISO 8601, deadline

  // Dates (computed/read-only)
  effectiveDeferDate: string | null;    // ISO 8601, computed
  effectiveDueDate: string | null;      // ISO 8601, computed
  completionDate: string | null;        // ISO 8601, when completed
  dropDate: string | null;              // ISO 8601, when dropped

  // Time Estimation
  estimatedMinutes: number | null;      // Time estimate (macOS v3.5+)

  // Review Settings
  reviewInterval: ReviewInterval | null; // Review schedule
  lastReviewDate: string | null;         // ISO 8601, when last reviewed
  nextReviewDate: string | null;         // ISO 8601, when next review due

  // Repetition
  repetitionRule: string | null;         // Repetition rule (serialized)

  // Timezone
  shouldUseFloatingTimeZone: boolean;    // v3.6+ floating timezone

  // Hierarchy Status
  hasChildren: boolean;          // Has child tasks

  // Next Action
  nextTask: {                    // Next available task (null for single-actions)
    id: string;
    name: string;
  } | null;

  // Relationships
  parentFolder: {                // Container folder (null if root)
    id: string;
    name: string;
  } | null;
  tags: Array<{                  // Associated tags
    id: string;
    name: string;
  }>;

  // Statistics
  taskCount: number;             // Number of direct child tasks
  remainingCount: number;        // Number of incomplete tasks
}
```

## Enumeration: ProjectStatus

The status of a project, explicitly set by the user.

```typescript
type ProjectStatus =
  | 'Active'   // Project is active and available
  | 'OnHold'   // Project is paused
  | 'Done'     // Project is completed
  | 'Dropped'; // Project is dropped/abandoned
```

### Status Determination

| Status | Conditions |
|--------|------------|
| Active | Default status, project is available |
| OnHold | User explicitly paused the project |
| Done | User marked complete or `completedByChildren` triggered |
| Dropped | User explicitly dropped the project |

**Note**: Unlike TaskStatus, ProjectStatus is a user-set value, not computed.

## Enumeration: ProjectType

The organizational type of a project, derived from `sequential` and
`containsSingletonActions` properties.

```typescript
type ProjectType =
  | 'parallel'       // All tasks available (default)
  | 'sequential'     // Tasks form dependency chain
  | 'single-actions'; // No next task, individual actions
```

### Type Derivation

| sequential | containsSingletonActions | ProjectType |
|------------|-------------------------|-------------|
| false | false | 'parallel' |
| true | false | 'sequential' |
| false | true | 'single-actions' |
| true | true | Invalid (auto-cleared) |

**Note**: If both are true, the implementation auto-clears the conflicting
property. This is OmniFocus's native behavior.

## Value Object: ReviewInterval

Review scheduling configuration for a project.

```typescript
interface ReviewInterval {
  steps: number;  // Count of units (e.g., 14), minimum: 1 (positive integer)
  unit: ReviewUnit; // Unit type
}

// Validation constraints:
// - steps: z.number().int().min(1) - must be positive integer >= 1
// - unit: z.enum(['days', 'weeks', 'months', 'years'])

type ReviewUnit = 'days' | 'weeks' | 'months' | 'years';
```

### Review Interval Semantics

- **Value Object**: Changing properties doesn't affect the project directly
- Must create new object and re-assign to `project.reviewInterval`
- Null means "no review schedule"

### Example Values

| steps | unit | Human Readable |
|-------|------|----------------|
| 7 | 'days' | "Every 7 days" |
| 2 | 'weeks' | "Every 2 weeks" |
| 1 | 'months' | "Monthly" |
| 4 | 'weeks' | "Every 4 weeks" |

### Review Date Properties (Read-Only)

These properties are **computed by OmniFocus** and cannot be set via API:

| Property | Type | Description | Settable via API |
|----------|------|-------------|------------------|
| `nextReviewDate` | string \| null | When next review is due (ISO 8601) | NO - computed |
| `lastReviewDate` | string \| null | When project was last reviewed (ISO 8601) | NO - OmniFocus-managed |

**nextReviewDate Computation**:

- **Formula**: `lastReviewDate + reviewInterval` (or `creationDate + reviewInterval` if never reviewed)
- **Trigger**: OmniFocus recalculates when reviewInterval changes or project is marked reviewed
- **Clearing**: Setting `reviewInterval = null` sets `nextReviewDate = null`

**lastReviewDate Behavior**:

- Updated **only** by OmniFocus when user marks project as reviewed (via UI or Review perspective)
- API can **read** but CANNOT **write** this property
- Preserved when reviewInterval is cleared (historical record)

**Relationship Between Properties**:

```text
User sets reviewInterval → OmniFocus calculates nextReviewDate
User marks reviewed → OmniFocus updates lastReviewDate → recalculates nextReviewDate
User clears reviewInterval → nextReviewDate becomes null (lastReviewDate preserved)
```

### Edge Case: reviewInterval Present but nextReviewDate Null

This state is **transient and rare**:

- **Cause**: Database sync timing, initialization delays
- **Filter Behavior**: Projects in this state are EXCLUDED from 'due' and 'upcoming' filters
- **Resolution**: OmniFocus will populate nextReviewDate on next sync/refresh

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

When a name-based lookup matches multiple projects.

```typescript
interface DisambiguationError {
  success: false;
  error: string;  // e.g., "Multiple projects found with name 'Renovation'. Found 2 matches."
  code: 'DISAMBIGUATION_REQUIRED';
  matchingIds: string[];  // All matching project IDs
}
```

## Tool-Specific Schemas

### list_projects

**Input**:

```typescript
interface ListProjectsInput {
  // Container filter
  folderId?: string;           // Filter by folder ID (includes nested)
  folderName?: string;         // Filter by folder name

  // Status filters
  status?: ProjectStatus[];    // Filter by status values (OR logic)
  reviewStatus?: ReviewStatusFilter; // Filter by review status
  flagged?: boolean;           // Filter by flagged status
  includeCompleted?: boolean;  // Include Done/Dropped (default: false)

  // Date filters (ISO 8601)
  dueBefore?: string;          // Due date upper bound
  dueAfter?: string;           // Due date lower bound
  deferBefore?: string;        // Defer date upper bound
  deferAfter?: string;         // Defer date lower bound

  // Result options
  limit?: number;              // Max results (default: 100, max: 1000)
}

type ReviewStatusFilter = 'due' | 'upcoming' | 'any';
```

**Output**:

```typescript
interface ListProjectsResponse {
  success: true;
  projects: ProjectSummary[];
}
```

### get_project

**Input**:

```typescript
interface GetProjectInput {
  id?: string;    // Project ID (takes precedence)
  name?: string;  // Project name (used if no ID)
}
// At least one of id or name is required
```

**Output** (success):

```typescript
interface GetProjectSuccessResponse {
  success: true;
  project: ProjectFull;
}
```

**Output** (disambiguation):

```typescript
interface GetProjectDisambiguationResponse {
  success: false;
  error: string;
  code: 'DISAMBIGUATION_REQUIRED';
  matchingIds: string[];
}
```

### create_project

**Input**:

```typescript
interface CreateProjectInput {
  // Required
  name: string;                // Project name

  // Container
  folderId?: string;           // Target folder ID
  folderName?: string;         // Target folder name (used if no folderId)

  // Position
  position?: 'beginning' | 'ending'; // Position in folder (default: 'ending')
  beforeProject?: string;      // Place before project (ID or name)
  afterProject?: string;       // Place after project (ID or name)

  // Project Type
  sequential?: boolean;        // Sequential project (auto-clears containsSingletonActions)
  containsSingletonActions?: boolean; // Single-actions list (auto-clears sequential)

  // Properties
  note?: string;               // Note content
  status?: ProjectStatus;      // Initial status (default: 'Active')
  flagged?: boolean;           // Flagged status
  completedByChildren?: boolean; // Auto-complete behavior
  defaultSingletonActionHolder?: boolean; // Cleanup behavior

  // Dates (ISO 8601)
  deferDate?: string | null;   // Defer date
  dueDate?: string | null;     // Due date

  // Review
  reviewInterval?: ReviewInterval | null; // Review schedule

  // Timezone
  shouldUseFloatingTimeZone?: boolean; // v3.6+

  // Time Estimation
  estimatedMinutes?: number | null;    // v3.5+ macOS only
}
```

**Output** (success):

```typescript
interface CreateProjectSuccessResponse {
  success: true;
  id: string;
  name: string;
}
```

### edit_project

**Input**:

```typescript
interface EditProjectInput {
  // Identification (at least one required)
  id?: string;                 // Project ID (takes precedence)
  name?: string;               // Project name

  // Properties to update (all optional)
  newName?: string;            // New project name
  note?: string;               // Note content
  status?: ProjectStatus;      // Project status
  sequential?: boolean;        // Sequential project (auto-clears containsSingletonActions)
  containsSingletonActions?: boolean; // Single-actions list (auto-clears sequential)
  completedByChildren?: boolean; // Auto-complete behavior
  defaultSingletonActionHolder?: boolean; // Cleanup behavior
  flagged?: boolean;           // Flagged status
  deferDate?: string | null;   // Defer date (null to clear)
  dueDate?: string | null;     // Due date (null to clear)
  reviewInterval?: ReviewInterval | null; // Review schedule (null to clear)
  shouldUseFloatingTimeZone?: boolean; // v3.6+
  estimatedMinutes?: number | null; // v3.5+ macOS only
}
```

**Output** (success):

```typescript
interface EditProjectSuccessResponse {
  success: true;
  id: string;
  name: string;
}
```

### delete_project

**Input**:

```typescript
interface DeleteProjectInput {
  id?: string;    // Project ID (takes precedence)
  name?: string;  // Project name (used if no ID)
}
// At least one of id or name is required
```

**Output** (success):

```typescript
interface DeleteProjectSuccessResponse {
  success: true;
  id: string;
  name: string;
  message: string; // Confirmation with cascade info
}
```

**Cascade Behavior**: Deleting a project removes all child tasks automatically.
This is OmniFocus's native behavior and cannot be prevented.

### move_project

**Input**:

```typescript
interface MoveProjectInput {
  // Identification (at least one required)
  id?: string;                 // Project ID (takes precedence)
  name?: string;               // Project name

  // Target (mutually exclusive with root: true)
  targetFolderId?: string;     // Target folder ID
  targetFolderName?: string;   // Target folder name

  // Root level
  root?: boolean;              // Move to root level (no folder)

  // Position
  position?: 'beginning' | 'ending'; // Position in target (default: 'ending')
  beforeProject?: string;      // Place before project (ID or name)
  afterProject?: string;       // Place after project (ID or name)
}
```

**Output** (success):

```typescript
interface MoveProjectSuccessResponse {
  success: true;
  id: string;
  name: string;
  parentFolderId: string | null;
  parentFolderName: string | null;
}
```

## Validation Rules

### Project Identification

- At least one of `id` or `name` must be provided
- If both provided, `id` takes precedence
- Name lookups use exact match
- Multiple name matches trigger disambiguation error

### Date Formats

- All dates use ISO 8601 format (e.g., `"2025-01-15T09:00:00Z"`)
- OmniFocus interprets dates in local timezone
- Invalid date format returns validation error

### Status Values

- Case-sensitive: `'Active'` not `'active'`
- Must be one of the 4 defined values
- Multiple statuses use OR logic in filters

### Review Status Filter

- `'due'`: `nextReviewDate <= today`
- `'upcoming'`: `nextReviewDate` within 7 days but not past due
- `'any'`: No review filtering (default)
- Projects without review intervals excluded from review filters

### Limits

- `limit` minimum: 1 (validated by Zod)
- `limit` default: 100
- `limit` maximum: 1000
- Values > 1000 are capped to 1000

### Project Type Auto-Clear

**This pattern is unique to Phase 4** - no similar mutual exclusion exists in
Phase 1 (folders), Phase 2 (tags), or Phase 3 (tasks).

#### Behavior Specification

Auto-clear is **silent** - no error response, no warning. Success response contains
only `success: true`, `id`, `name`. This is **application logic**, not Zod schema
validation. The schemas intentionally do NOT prevent both=true; auto-clear handles
it at runtime.

#### Precedence Rule

When both `sequential: true` AND `containsSingletonActions: true` are provided in
the same request, **`containsSingletonActions` takes precedence** (last processed wins).

Implementation order (process `sequential` first, then `containsSingletonActions`):

```javascript
// MUST process in this order for consistent precedence
if (params.sequential === true) {
  project.containsSingletonActions = false;
  project.sequential = true;
}
if (params.containsSingletonActions === true) {
  project.sequential = false;  // Auto-clears the previous setting
  project.containsSingletonActions = true;
}
```

#### Setting to False

Setting a property to `false` does NOT trigger auto-clear of the other property:

```javascript
// Setting to false - no auto-clear
if (params.sequential === false) {
  project.sequential = false;
  // containsSingletonActions is NOT auto-set
}
if (params.containsSingletonActions === false) {
  project.containsSingletonActions = false;
  // sequential is NOT auto-set
}
```

#### Omitting Parameters (edit_project)

- **Both omitted**: Preserves existing project type
- **One provided**: Only that property changes; auto-clear only if setting `true`
  conflicts with existing state

#### OmniFocus Native Behavior

OmniFocus itself does NOT auto-clear - the implementation MUST add this logic
explicitly. Setting both to `true` via OmniJS results in undefined behavior.

See spec.md §Project Type Mutual Exclusion for the complete scenario matrix.

### Filter Interaction Matrix

| Filter A | Filter B | Behavior |
|----------|----------|----------|
| `folderId` | `folderName` | `folderId` takes precedence |
| `status` | `includeCompleted: false` | `includeCompleted` applied after status |
| `dueBefore` | `dueAfter` | Creates inclusive date range (AND) |
| `reviewStatus: 'due'` | No `reviewInterval` | Projects without intervals excluded |
| All filters | (multiple) | Combine with AND logic |

### Result Ordering

Results are returned in OmniFocus natural order (database iteration order).

## Version-Specific Features

| Feature | Property | Min Version | Platform | Fallback |
|---------|----------|-------------|----------|----------|
| Review interval | `reviewInterval` | v3.0+ | All | Available |
| Project status | `status` | v3.0+ | All | Available |
| Time estimate | `estimatedMinutes` | v3.5+ | macOS only | `null` |
| Floating timezone | `shouldUseFloatingTimeZone` | v3.6+ | All | `false` |

## State Transitions

### Project Completion

```text
Active → Done
  ↳ via: markComplete() or status = Project.Status.Done
  ↳ OR: completedByChildren triggers when last child completes
```

### Project Dropping

```text
Active/OnHold → Dropped
  ↳ via: status = Project.Status.Dropped
```

### Reverting Completion

```text
Done → Active (or previous status)
  ↳ via: status = Project.Status.Active
```

### On Hold

```text
Active → OnHold
  ↳ via: status = Project.Status.OnHold
```

## Relationships

### Project ↔ Folder

- A project belongs to at most one folder (`parentFolder`)
- Root projects have `parentFolder: null`
- Folder filter includes nested subfolders recursively

### Project ↔ Task

- A project contains tasks (`tasks`, `flattenedTasks`)
- `nextTask` points to the first available task (null for single-actions)
- Root task (`project.task`) holds project-level properties

### Project ↔ Tag (Many-to-Many)

- A project can have multiple tags
- Tags are applied via the root task

## Type System Conventions

### Optional vs Nullable Fields

| Pattern | Usage | Meaning |
|---------|-------|---------|
| `z.optional()` | Input parameters | Field may be omitted entirely |
| `z.nullable()` | Output fields | Field is always present but value may be null |
| `z.string().optional()` | Filter inputs | If omitted, filter is not applied |
| `z.string().nullable()` | Response dates | Field present; null means "not set" |

### Empty Array Handling

For array parameters in inputs:
- **Omitted**: Filter not applied (equivalent to "any")
- **Empty array `[]`**: Filter applies with empty set (matches nothing for "all" mode)
- **Non-empty array**: Filter applies normally

## Cross-Layer Traceability

### Zod Schema ↔ OmniJS Property Mapping (Complete)

**ProjectFull has 30 fields. All are mapped below:**

| # | Zod Field | OmniJS Property | Transform |
|---|-----------|-----------------|-----------|
| 1 | `id` | `project.id.primaryKey` | Direct (string) |
| 2 | `name` | `project.name` | Direct |
| 3 | `note` | `project.task.note` | Via root task |
| 4 | `status` | `project.status` | getStatusString() (see below) |
| 5 | `completed` | `project.completed` | Direct (boolean) |
| 6 | `flagged` | `project.flagged` | Direct (boolean) |
| 7 | `effectiveFlagged` | `project.effectiveFlagged` | Direct (boolean) |
| 8 | `sequential` | `project.sequential` | Direct (boolean) |
| 9 | `containsSingletonActions` | `project.containsSingletonActions` | Direct (boolean) |
| 10 | `projectType` | Derived | getProjectType() (see Type Derivation) |
| 11 | `completedByChildren` | `project.completedByChildren` | Direct (boolean) |
| 12 | `defaultSingletonActionHolder` | `project.defaultSingletonActionHolder` | Direct (boolean) |
| 13 | `deferDate` | `project.deferDate` | `date?.toISOString() ?? null` |
| 14 | `dueDate` | `project.dueDate` | `date?.toISOString() ?? null` |
| 15 | `effectiveDeferDate` | `project.effectiveDeferDate` | `date?.toISOString() ?? null` |
| 16 | `effectiveDueDate` | `project.effectiveDueDate` | `date?.toISOString() ?? null` |
| 17 | `completionDate` | `project.completionDate` | `date?.toISOString() ?? null` |
| 18 | `dropDate` | `project.dropDate` | `date?.toISOString() ?? null` |
| 19 | `estimatedMinutes` | `project.estimatedMinutes` | Direct (number or null) |
| 20 | `reviewInterval` | `project.reviewInterval` | `{steps, unit}` object or null |
| 21 | `lastReviewDate` | `project.lastReviewDate` | `date?.toISOString() ?? null` |
| 22 | `nextReviewDate` | `project.nextReviewDate` | `date?.toISOString() ?? null` |
| 23 | `repetitionRule` | `project.repetitionRule` | Serialized string or null |
| 24 | `shouldUseFloatingTimeZone` | `project.shouldUseFloatingTimeZone` | Direct (boolean) |
| 25 | `hasChildren` | `project.hasChildren` | Direct (boolean) |
| 26 | `nextTask` | `project.nextTask` | `{id: t.id.primaryKey, name: t.name}` or null |
| 27 | `parentFolder` | `project.parentFolder` | `{id: f.id.primaryKey, name: f.name}` or null |
| 28 | `tags` | `project.tags` | `tags.map(t => ({id: t.id.primaryKey, name: t.name}))` |
| 29 | `taskCount` | `project.flattenedTasks.length` | Count of all tasks |
| 30 | `remainingCount` | `project.flattenedTasks.filter(t => !t.completed).length` | Count of incomplete tasks |

### ProjectStatus Bidirectional Mapping

```javascript
// OmniJS → JSON String (output)
var statusMap = {};
statusMap[Project.Status.Active] = 'Active';
statusMap[Project.Status.OnHold] = 'OnHold';
statusMap[Project.Status.Done] = 'Done';
statusMap[Project.Status.Dropped] = 'Dropped';

function getStatusString(project) {
  var str = statusMap[project.status];
  if (!str) {
    throw new Error('Unknown project status: ' + project.status);
  }
  return str;
}

// JSON String → OmniJS (input/filter)
var reverseStatusMap = {
  'Active': Project.Status.Active,
  'OnHold': Project.Status.OnHold,
  'Done': Project.Status.Done,
  'Dropped': Project.Status.Dropped
};

function getStatusEnum(statusStr) {
  var val = reverseStatusMap[statusStr];
  if (val === undefined) {
    throw new Error('Invalid status: ' + statusStr + '. Expected one of: Active, OnHold, Done, Dropped');
  }
  return val;
}
```

**Unknown Status Handling**: Implementation MUST throw an error for unknown/unexpected
status values rather than silently defaulting. This ensures data integrity and
exposes API inconsistencies early.

### Zod Schema ↔ TypeScript Type Mapping

All TypeScript types are derived from Zod schemas using `z.infer<typeof Schema>`:

| Zod Schema | TypeScript Type | Location |
|------------|-----------------|----------|
| `ProjectStatusSchema` | `ProjectStatus` | contracts/shared/project.ts |
| `ProjectTypeSchema` | `ProjectType` | contracts/shared/project.ts |
| `ReviewIntervalSchema` | `ReviewInterval` | contracts/shared/project.ts |
| `ProjectSummarySchema` | `ProjectSummary` | contracts/shared/project.ts |
| `ProjectFullSchema` | `ProjectFull` | contracts/shared/project.ts |
| `EntityReferenceSchema` | `EntityReference` | contracts/shared/project.ts |
| `ListProjectsInputSchema` | `ListProjectsInput` | contracts/list-projects.ts |
| `ListProjectsResponseSchema` | `ListProjectsResponse` | contracts/list-projects.ts |
| `GetProjectInputSchema` | `GetProjectInput` | contracts/get-project.ts |
| `GetProjectResponseSchema` | `GetProjectResponse` | contracts/get-project.ts |
| `CreateProjectInputSchema` | `CreateProjectInput` | contracts/create-project.ts |
| `CreateProjectResponseSchema` | `CreateProjectResponse` | contracts/create-project.ts |
| `EditProjectInputSchema` | `EditProjectInput` | contracts/edit-project.ts |
| `EditProjectResponseSchema` | `EditProjectResponse` | contracts/edit-project.ts |
| `DeleteProjectInputSchema` | `DeleteProjectInput` | contracts/delete-project.ts |
| `DeleteProjectResponseSchema` | `DeleteProjectResponse` | contracts/delete-project.ts |
| `MoveProjectInputSchema` | `MoveProjectInput` | contracts/move-project.ts |
| `MoveProjectResponseSchema` | `MoveProjectResponse` | contracts/move-project.ts |
| `DisambiguationErrorSchema` | `DisambiguationError` | contracts/shared/disambiguation.ts |

### Contract Location Mapping

Contracts exist in two locations with identical content:

| Spec Location | Runtime Location | Sync Method |
|---------------|------------------|-------------|
| `specs/004-project-management/contracts/` | `src/contracts/project-tools/` | Manual copy during implementation |

The spec location is the source of truth. During implementation, contracts are
copied to src/contracts/ for runtime use.
