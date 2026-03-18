# Phase 13: Task Status & Completion - API Research

**Research Date**: 2026-03-17
**Sources**: omni-automation.com (OF-API.html, task.html, project.html), discourse.omnigroup.com, Process Inbox plugin
**Research Method**: Tavily deep search targeting official Omni Automation documentation

## Summary

Comprehensive research on OmniFocus Omni Automation API for task/project
lifecycle operations. Key findings validate the spec and reveal critical
implementation details for mark/drop/incomplete operations.

---

## Key API Findings

### 1. Task Lifecycle Methods

| Method | Signature | Returns | Notes |
|--------|-----------|---------|-------|
| `markComplete` | `markComplete(date: Date or null)` | `Task` | Clones repeating tasks; returns completed task |
| `markIncomplete` | `markIncomplete()` | void | Only works on **completed** items, NOT dropped |
| `drop` | `drop(allOccurrences: Boolean)` | void | v3.8+; `true` = stop repeating, `false` = repeat normally |

### 2. Project Lifecycle Methods

| Method | Signature | Returns | Notes |
|--------|-----------|---------|-------|
| `markComplete` | `markComplete(date: Date or null)` | `Task` | Completes project + all active child tasks |
| `markIncomplete` | `markIncomplete()` | void | Only works on completed projects |
| ~~`drop`~~ | N/A | N/A | Projects have NO drop() method |

**Project Drop Mechanism:**
```javascript
// Use status assignment instead
project.status = Project.Status.Dropped;
// Or equivalently:
project.task.active = false;
```

### 3. Reopening Dropped Items

`markIncomplete()` does NOT work on dropped items — it only works on completed
items. For dropped items:

```javascript
// Reopen a dropped task
task.active = true;

// Reopen a dropped project
project.status = Project.Status.Active;
// Or: project.task.active = true;
```

**Decision**: The `mark_incomplete` tool must internally detect the item's
current state and use the appropriate mechanism:
- Completed → `markIncomplete()`
- Dropped → `active = true` (task) or `status = Active` (project)

### 4. Task Status Detection

```javascript
// For tasks: check taskStatus
var status = task.taskStatus;
// Task.Status.Available, .Blocked, .Completed, .Dropped, .DueSoon, .Next, .Overdue

// For completion detection:
var isCompleted = task.completed;          // Boolean
var isDropped = task.dropDate !== null;     // Has a drop date

// For projects: check status
var status = project.status;
// Project.Status.Active, .OnHold, .Done, .Dropped
```

### 5. markComplete Date Parameter

```javascript
// Complete with current date
task.markComplete(null);

// Complete with specific date (e.g., backdate to yesterday)
var yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
task.markComplete(yesterday);

// For repeating tasks — clones the task
var completedClone = task.markComplete(null);
// Original task continues repeating; clone is the completed instance
```

**MCP Tool Input**: Accepts ISO 8601 string, converted to OmniJS `Date` object:
```javascript
var completionDate = ${completionDate} ? new Date("${completionDate}") : null;
task.markComplete(completionDate);
```

### 6. Drop Method (v3.8+)

```javascript
// Drop task, stop all future occurrences (default for our tool)
task.drop(true);

// Drop current occurrence only, task repeats normally
task.drop(false);
```

**Version Detection:**
```javascript
// Check if OmniFocus supports drop() (v3.8+)
if (!app.userVersion.atLeast(new Version("3.8"))) {
  return JSON.stringify({
    success: false,
    error: "drop_items requires OmniFocus 3.8 or later. Current version: " +
           app.userVersion.versionString
  });
}
```

**Fallback for older versions** (not needed, but documented):
```javascript
// Setting active = false also drops, but doesn't handle allOccurrences
task.active = false;  // Equivalent to drop(true) for non-repeating tasks
```

### 7. project.nextTask

```javascript
// Returns Task or null (read-only)
var next = project.nextTask;

// Returns null when:
// 1. No available tasks (all completed/dropped/blocked)
// 2. Project contains singleton actions (containsSingletonActions = true)
```

**Distinguishing null cases:**
```javascript
if (project.containsSingletonActions) {
  // Single-actions project — no sequential ordering
  return JSON.stringify({
    success: true,
    hasNext: false,
    reason: "SINGLE_ACTIONS_PROJECT"
  });
}

var next = project.nextTask;
if (next === null) {
  return JSON.stringify({
    success: true,
    hasNext: false,
    reason: "NO_AVAILABLE_TASKS"
  });
}
```

### 8. Project Type Properties

```javascript
// Sequential project
project.sequential = true;
project.containsSingletonActions = false;  // auto-clear

// Single-actions list
project.containsSingletonActions = true;
project.sequential = false;  // auto-clear

// Parallel (default)
project.sequential = false;
project.containsSingletonActions = false;

// Mutual exclusion: containsSingletonActions wins if both set to true
// (matching Phase 4 edit_project pattern)
```

### 9. Floating Timezone

```javascript
// Enable floating timezone
task.shouldUseFloatingTimeZone = true;
project.shouldUseFloatingTimeZone = true;

// Disable floating timezone
task.shouldUseFloatingTimeZone = false;
project.shouldUseFloatingTimeZone = false;

// Note: If no due/defer dates assigned, reverts to database default
```

### 10. Version Detection API

```javascript
// Preferred (returns Version object with comparison methods)
app.userVersion                       // e.g., [object Version: 4.5.0]
app.userVersion.versionString         // e.g., "4.5.0"
app.userVersion.atLeast(new Version("3.8"))  // Boolean

// Deprecated
app.version  // Returns buildVersion string, not user-visible version
```

---

## Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Use `task.drop(allOccurrences)` for tasks | v3.8 API method, handles repeating tasks properly | `task.active = false` — doesn't control repeat behavior |
| Use `project.status = Dropped` for projects | Projects lack `drop()` method | `project.task.active = false` — equivalent but less explicit |
| Detect item state in `mark_incomplete` | `markIncomplete()` only works on completed, not dropped | Separate tools for uncomplete/undrop — more API surface for same user intent |
| Default `allOccurrences = true` | GTD "drop" = abandon permanently | `false` default — risks unintended recurrence of abandoned work |
| ISO 8601 input, OmniJS Date internally | Consistent with existing tools (set_planned_date, review dates) | Accept Date objects — not possible over MCP JSON-RPC |
| Version check via `app.userVersion.atLeast()` | Official API, returns semantic Version object | String comparison — fragile, version format may change |
| Distinguish single-actions `null` from empty `null` | Different user-actionable guidance for each case | Single error message — loses information about cause |
| Version check scoped to `drop_items` only | All other APIs (`markComplete`, `markIncomplete`, `nextTask`, `shouldUseFloatingTimeZone`, `sequential`, `containsSingletonActions`) are standard with no version constraints — confirmed via official task.html and project.html docs | Apply version check to all tools — unnecessary, adds latency and complexity |
| `allOccurrences` is task-only, ignored for projects | Projects use `project.status = Project.Status.Dropped` (no `drop()` method) — `allOccurrences` has no meaning for project drops | Error when `allOccurrences` provided for project — overly strict, user may not know item type |
