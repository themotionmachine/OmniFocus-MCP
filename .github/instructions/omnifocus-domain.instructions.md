---
applyTo: "src/omnifocustypes.ts,src/tools/**/*.ts"
---

# OmniFocus Domain Model Instructions

When working with OmniFocus domain types and data structures:

## Core Domain Types

Reference `src/omnifocustypes.ts` for canonical type definitions.

### Task

```typescript
interface TaskMinimal {
  id: string;
  name: string;
  note?: string;
  completed: boolean;
  dropped: boolean;
  dueDate?: Date;
  deferDate?: Date;
  flagged: boolean;
  estimatedMinutes?: number;
  parentTaskId?: string;
  projectId?: string;
  containingSectionId?: string;
  tags?: TagMinimal[];
}
```

**Status values**: `'available' | 'completed' | 'dropped'`

### Project

```typescript
interface ProjectMinimal {
  id: string;
  name: string;
  note?: string;
  status: 'active' | 'on-hold' | 'completed' | 'dropped';
  completed: boolean;
  dropped: boolean;
  sequential: boolean;
  dueDate?: Date;
  deferDate?: Date;
  folderId?: string;
  tags?: TagMinimal[];
  rootTask?: TaskMinimal;
}
```

### Folder

```typescript
interface FolderMinimal {
  id: string;
  name: string;
  status: 'active' | 'dropped';
}
```

### Tag

```typescript
interface TagMinimal {
  id: string;
  name: string;
  status: 'active' | 'on-hold' | 'dropped';
}
```

## Status Enums

Use TypeScript enums for type safety:

```typescript
enum TaskStatus {
  Available = 'available',
  Completed = 'completed',
  Dropped = 'dropped'
}

enum ProjectStatus {
  Active = 'active',
  OnHold = 'on-hold',
  Completed = 'completed',
  Dropped = 'dropped'
}
```

## Hierarchy Relationships

### Parent-Child Task Relationships

```typescript
// Referencing existing parent by ID
{
  name: 'Child task',
  parentTaskId: 'existing-parent-id'
}

// Referencing existing parent by name
{
  name: 'Child task',
  parentTaskName: 'Parent task name'
}

// Referencing parent in same batch operation
{
  tempId: 'child-1',
  name: 'Child task',
  parentTempId: 'parent-1'  // References another item in the batch
}
```

### Project-Task Relationships

- Projects have a `rootTask` which is the parent of all tasks in the project
- Tasks can reference projects via `projectId`
- Tasks in projects can have subtasks via `parentTaskId`

### Folder-Project Relationships

- Projects belong to folders via `folderId`
- The root folder has ID `null` or is omitted
- Folders can be nested (folder has `parentFolderId`)

## Dates

All dates should be:
- **From API**: ISO 8601 strings (`"2024-12-31T23:59:59Z"`)
- **In JXA**: JavaScript Date objects (`new Date("2024-12-31T23:59:59Z")`)
- **In TypeScript**: Date objects or ISO strings depending on context

```typescript
// Tool parameter
dueDate: z.string().datetime().optional()

// JXA generation
const dueDateObj = params.dueDate ? `new Date("${params.dueDate}")` : 'null';
```

## Batch Operations

### Temporary IDs

Used for within-batch parent-child references:

```typescript
const items = [
  {
    tempId: 'parent-1',
    name: 'Parent task',
    projectId: 'existing-project-id'
  },
  {
    tempId: 'child-1',
    name: 'Child task',
    parentTempId: 'parent-1',  // References parent in same batch
    hierarchyLevel: 1
  },
  {
    tempId: 'child-2',
    name: 'Another child',
    parentTempId: 'parent-1',
    hierarchyLevel: 1
  }
];
```

### Dependency Ordering

- Items are processed in topological order (parents before children)
- Cycle detection prevents infinite loops
- Failed items don't stop the batch (check individual results)
- `hierarchyLevel` provides ordering hints (0 for root, 1 for child, etc.)

## Field Semantics

### Completion vs Dropped
- `completed: true` - Task/project was finished successfully
- `dropped: true` - Task/project was abandoned
- Both can be true simultaneously (dropped, then marked complete)

### Sequential Projects
- `sequential: true` - Only the first available task is actionable
- `sequential: false` - All incomplete tasks are actionable (parallel)

### Defer Dates
- `deferDate` - Task/project is hidden until this date
- Should be before `dueDate` if both are set
- Null means no defer date (available immediately)

### Flagged Tasks
- `flagged: true` - Task is marked for special attention
- Appears in "Flagged" perspective
- Independent of completion status

### Estimated Minutes
- `estimatedMinutes` - Time estimate in minutes
- Used for time-based perspectives and planning
- Null means no estimate

## Naming Conventions

**IDs**: Always use the term `id` (e.g., `taskId`, `projectId`, `folderId`, `tagId`)

**Names**: Use `name` for primary display text (not `title`)

**Notes**: Use `note` for description/details (not `description` or `notes`)

**References**: Use consistent suffixes:
- `projectId` - Reference to existing project
- `parentTaskId` - Reference to existing parent task
- `parentTaskName` - Lookup parent by name
- `parentTempId` - Reference to item in same batch

## Validation Rules

When creating or updating items:

1. **Required fields**: `name` is always required
2. **ID format**: OmniFocus IDs are alphanumeric strings
3. **Date validation**: `deferDate` should be before `dueDate`
4. **Status constraints**: Can't set `completed: true` and `dropped: true` simultaneously in some contexts
5. **Hierarchy**: Can't create circular parent-child relationships
6. **Project membership**: Tasks can only have one project
7. **Tag limits**: Tags must exist before assignment

## Common Query Patterns

```typescript
// Active tasks due soon
{
  completed: false,
  dropped: false,
  dueDateBefore: '2024-12-31T23:59:59Z'
}

// Flagged tasks in a project
{
  projectId: 'abc123',
  flagged: true,
  completed: false
}

// Tasks without tags
{
  hasTags: false
}

// Sequential project next actions
{
  projectId: 'abc123',
  sequential: true,
  completed: false,
  limit: 1
}
```
