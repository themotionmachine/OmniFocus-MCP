# Query OmniFocus Tool - Complete Reference Guide

## Complete Field Reference

### Task Fields

All available fields you can request for tasks:

| Field | Type | Description | Example Value |
|-------|------|-------------|---------------|
| `id` | string | Unique identifier | "abc123def456" |
| `name` | string | Task name/title | "Review quarterly report" |
| `note` | string | Task notes/description | "Check financial section" |
| `flagged` | boolean | Whether task is flagged | true |
| `taskStatus` | string | Current status | "Next", "Available", "Blocked" |
| `dueDate` | string | Due date in ISO format | "2024-12-25T00:00:00Z" |
| `deferDate` | string | Defer/start date in ISO format | "2024-12-20T00:00:00Z" |
| `completionDate` | string | When task was completed | "2024-12-24T14:30:00Z" |
| `estimatedMinutes` | number | Time estimate in minutes | 30 |
| `tagNames` | string[] | Array of tag names | ["work", "urgent"] |
| `tags` | string[] | Array of tag IDs | ["tag1id", "tag2id"] |
| `projectName` | string | Name of containing project | "Q4 Goals" |
| `projectId` | string | ID of containing project | "proj123" |
| `parentId` | string | ID of parent task (for subtasks) | "task456" |
| `childIds` | string[] | IDs of child tasks | ["task789", "task012"] |
| `hasChildren` | boolean | Whether task has subtasks | true |
| `sequential` | boolean | Whether subtasks are sequential | false |
| `completedByChildren` | boolean | Auto-complete when children done | true |
| `inInbox` | boolean | Whether task is in inbox | false |
| `modificationDate` | string | Last modified date | "2024-12-20T10:00:00Z" |
| `creationDate` | string | When task was created | "2024-12-01T09:00:00Z" |

### Project Fields

All available fields you can request for projects:

| Field | Type | Description | Example Value |
|-------|------|-------------|---------------|
| `id` | string | Unique identifier | "proj123" |
| `name` | string | Project name | "Website Redesign" |
| `status` | string | Project status | "Active", "OnHold" |
| `note` | string | Project notes | "Phase 1 focus on UX" |
| `folderName` | string | Containing folder name | "Work" |
| `folderID` | string | Containing folder ID | "fold456" |
| `sequential` | boolean | Tasks must be done in order | true |
| `dueDate` | string | Project due date | "2024-12-31T00:00:00Z" |
| `deferDate` | string | Project defer date | "2024-12-01T00:00:00Z" |
| `effectiveDueDate` | string | Inherited or set due date | "2024-12-31T00:00:00Z" |
| `effectiveDeferDate` | string | Inherited or set defer date | "2024-12-01T00:00:00Z" |
| `completedByChildren` | boolean | Auto-complete when tasks done | false |
| `containsSingletonActions` | boolean | Has single action list | true |
| `taskCount` | number | Number of tasks in project | 15 |
| `tasks` | string[] | Array of task IDs | ["task1", "task2"] |
| `modificationDate` | string | Last modified date | "2024-12-20T10:00:00Z" |
| `creationDate` | string | When project was created | "2024-11-01T09:00:00Z" |

### Folder Fields

All available fields you can request for folders:

| Field | Type | Description | Example Value |
|-------|------|-------------|---------------|
| `id` | string | Unique identifier | "fold123" |
| `name` | string | Folder name | "Personal" |
| `path` | string | Full folder path | "Life/Personal" |
| `parentFolderID` | string | Parent folder ID | "fold000" |
| `status` | string | Folder status | "Active", "Dropped" |
| `projectCount` | number | Number of projects | 8 |
| `projects` | string[] | Array of project IDs | ["proj1", "proj2"] |
| `subfolders` | string[] | Array of subfolder IDs | ["fold456", "fold789"] |

## Filter Behavior Details

### `projectName` Filter

- **Behavior**: Case-insensitive partial/substring matching
- **Special value**: Use `"inbox"` to get inbox tasks

```json
{
  "projectName": "review"  // Matches "Weekly Review", "Review Documents", etc.
}
```

### `deferredUntil` Filter

- **Behavior**: Returns tasks that are currently deferred but will become available within N days
- **Example**: `"deferredUntil": 7` returns tasks deferred now but available within the next 7 days

```json
{
  "deferredUntil": 3  // Tasks becoming available in next 3 days
}
```

### `dueWithin` Filter

- **Behavior**: Returns tasks due from now until N days in the future (inclusive)
- **Example**: `"dueWithin": 7` returns tasks due today through 7 days from now

```json
{
  "dueWithin": 1  // Tasks due today or tomorrow
}
```

### `tags` Filter

- **Behavior**: Exact match, case-sensitive
- **Logic**: OR - task must have at least ONE of the specified tags

```json
{
  "tags": ["Work", "work"]  // Different - case matters!
}
```

### `status` Filter

- **Behavior**: Exact match against OmniFocus status values
- **Logic**: OR - item must have ONE of the specified statuses

```json
{
  "status": ["Next", "Available"]  // Tasks that are either next or available
}
```

### `hasNote` Filter

- **Behavior**: Checks if note field exists and is non-empty (after trimming whitespace)

```json
{
  "hasNote": true   // Tasks with non-empty notes
  "hasNote": false  // Tasks with no notes or only whitespace
}
```

## Complete Status Values

### Task Status Values

| Status | Description | When it appears |
|--------|-------------|-----------------|
| `Next` | Next action in sequential list | First available task in sequential project/group |
| `Available` | Ready to work on | Task with no blockers, not sequential or is current in sequence |
| `Blocked` | Waiting on something | Task in sequential list waiting for previous task |
| `DueSoon` | Due within 24 hours | Task due soon (configurable in OF preferences) |
| `Overdue` | Past due date | Task whose due date has passed |
| `Completed` | Marked complete | Task that has been completed |
| `Dropped` | Cancelled/dropped | Task that was dropped (not completed) |

### Project Status Values

| Status | Description |
|--------|-------------|
| `Active` | Normal active project |
| `OnHold` | Paused/on hold project |
| `Done` | Completed project |
| `Dropped` | Cancelled/dropped project |

### Folder Status Values

| Status | Description |
|--------|-------------|
| `Active` | Normal active folder |
| `Dropped` | Dropped/hidden folder |

## Filter Combination Logic

All filters use **AND** logic - an item must match ALL specified filters:

```json
{
  "entity": "tasks",
  "filters": {
    "flagged": true,        // AND
    "status": ["Next"],     // AND
    "tags": ["urgent"]      // AND
  }
}
// Returns: Flagged tasks that are Next actions with "urgent" tag
```

Within array filters (`status`, `tags`), **OR** logic applies:

```json
{
  "status": ["Next", "Available"],  // Next OR Available
  "tags": ["home", "errands"]       // has "home" OR "errands"
}
```

## Sort Fields

Common fields you can sort by:

- `name` - Alphabetical by item name
- `dueDate` - By due date (null dates sort last)
- `deferDate` - By defer date (null dates sort last)
- `modificationDate` - By last modified time
- `creationDate` - By creation time
- `estimatedMinutes` - By time estimate (shortest first with 'asc')
- `taskStatus` - Groups by status

## Performance Tips

### Request only needed fields

```json
{
  "entity": "tasks",
  "fields": ["name", "dueDate", "flagged"],  // Only get 3 fields instead of all
  "limit": 50
}
```

### Use summary for counts

```json
{
  "entity": "tasks",
  "filters": {"projectName": "Big Project"},
  "summary": true  // Returns just count, not full task details
}
```

### Combine related queries

Instead of multiple queries, get everything at once:

```json
{
  "entity": "tasks",
  "filters": {
    "status": ["Next", "Available", "DueSoon", "Overdue"],
    "flagged": true
  },
  "fields": ["name", "dueDate", "projectName", "taskStatus"],
  "sortBy": "dueDate"
}
```

## Common Gotchas

1. **Tag names must be exact** - "Work" ≠ "work"
2. **Project names are partial matches** - "Review" matches "Weekly Review"
3. **Null dates sort last** - Tasks without due dates appear at the end when sorting by dueDate
4. **Inbox is a special project name** - Use `"projectName": "inbox"` for inbox tasks
5. **Status values are case-sensitive** - Use exact values like "Next", not "next"
6. **Fields that don't exist return undefined** - Requesting invalid fields won't error but returns undefined
