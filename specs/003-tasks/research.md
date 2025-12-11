# Phase 0 Research: OmniJS Task API

**Feature**: Enhanced Task Management Tools
**Created**: 2025-12-11
**Status**: Complete

## Research Summary

### Decision: OmniJS Task API is Comprehensive

**Rationale**: The OmniFocus Omni Automation JavaScript API provides all necessary
functionality for the 4 enhanced task tools. Key capabilities confirmed:

- `Task.byIdentifier()` for finding tasks by ID
- `flattenedTasks` collection with JavaScript `filter()` for querying
- `Task.Status` enumeration for all 7 status values
- `appendStringToNote()` method for note appending
- `plannedDate` property (v4.7+) for scheduling
- `app.userVersion.atLeast()` for version checking

**Alternatives considered**: None - OmniJS is the required execution model per
Constitution v2.0.0.

---

## Task Properties Reference

### Writable Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | String | Task title |
| `note` | String | Task notes/description |
| `flagged` | Boolean | Flagged status indicator |
| `deferDate` | Date or null | Not actionable until this date |
| `dueDate` | Date or null | Target completion date |
| `completedByChildren` | Boolean | Auto-completes when last child finishes |
| `sequential` | Boolean | Children form dependency chain |
| `estimatedMinutes` | Number or null | Time estimate in minutes (v3.5+ macOS only) |
| `shouldUseFloatingTimeZone` | Boolean | Use floating timezone for dates (v3.6+) |
| `assignedContainer` | Project, Task, Inbox, or null | Tentative assignment for inbox tasks |
| `repetitionRule` | Task.RepetitionRule or null | Repeat configuration |
| `plannedDate` | Date or null | **v4.7+** - When user plans to work on task (see note below) |

### Read-Only Properties

| Property | Type | Version | Description |
|----------|------|---------|-------------|
| `id.primaryKey` | String | - | Unique identifier |
| `added` | Date or null | - | Creation date |
| `modified` | Date or null | - | Last modification date |
| `completed` | Boolean | - | Completion status |
| `completionDate` | Date or null | - | When task was completed |
| `dropDate` | Date or null | - | When task was dropped |
| `taskStatus` | Task.Status | - | Current status enumeration |
| `effectiveDeferDate` | Date or null | - | Computed defer considering containers |
| `effectiveDueDate` | Date or null | - | Computed due date considering containers |
| `effectiveFlagged` | Boolean | - | Computed flagged status |
| `effectiveCompletedDate` | Date or null | v3.8+ | Computed completion date |
| `effectiveDropDate` | Date or null | v3.8+ | Computed drop date |
| `effectivePlannedDate` | Date or null | **v4.7.1+** | Computed effective planned date |
| `parent` | Task or null | - | Containing parent task |
| `children` | TaskArray | - | All direct child tasks |
| `flattenedTasks` | TaskArray | - | All descendants flattened |
| `hasChildren` | Boolean | - | True if task has children |
| `containingProject` | Project or null | - | Host project (null if inbox) |
| `inInbox` | Boolean | - | Direct child of inbox |
| `tags` | TagArray | - | Associated tags |

### plannedDate Clarification

The official documentation lists `plannedDate` as `r/o` (read-only), but also states:

> "Note: getting and **setting** this value requires that the database has been
> migrated to support planned dates."

**Decision**: Treat `plannedDate` as **writable** in v4.7+ with the following caveats:

1. Requires OmniFocus v4.7 or later
2. Database must have been migrated to support planned dates
3. If migration hasn't occurred, setting the value may fail silently or throw

**Implementation**: Use version checking and wrap in try-catch with clear error
messaging.

---

## Task.Status Enumeration

| Value | Constant | Description |
|-------|----------|-------------|
| Available | `Task.Status.Available` | Task is available to work on |
| Blocked | `Task.Status.Blocked` | Not available due to future defer date, preceding sequential task, or on-hold tag |
| Completed | `Task.Status.Completed` | Task is already completed |
| Dropped | `Task.Status.Dropped` | Task will not be worked on |
| DueSoon | `Task.Status.DueSoon` | Task is incomplete and due soon |
| Next | `Task.Status.Next` | Task is the first available task in a project |
| Overdue | `Task.Status.Overdue` | Task is incomplete and overdue |

**Static property**: `Task.Status.all` returns array of all status values.

---

## Task Methods Reference

### Note Management

```javascript
// Append text to task notes
task.appendStringToNote(stringToAppend)  // stringToAppend: String
```

**Behavior**:

- Appends the string to the end of the note
- Does NOT add separator automatically - caller must include `\n` if needed
- Empty string is valid (no-op)

### Completion Management

```javascript
// Mark task complete (optionally with specific date)
task.markComplete(date)  // date: Date or null, returns Task
task.markComplete()      // Uses current date

// Mark task incomplete
task.markIncomplete()    // No return value
```

### State Changes

```javascript
// Drop task (v3.8+)
task.drop(allOccurrences)  // allOccurrences: Boolean
```

### Tag Management

```javascript
task.addTag(tag)           // Add single tag
task.addTags(tags)         // Add multiple tags (array)
task.removeTag(tag)        // Remove single tag
task.removeTags(tags)      // Remove multiple tags (array)
task.clearTags()           // Remove all tags (v3.8+)
```

---

## Finding Tasks

### By Identifier (Recommended for Unique ID)

```javascript
// Returns Task or null
var task = Task.byIdentifier("dXL1Kdp4XCx");
```

### By Name (Returns First Match Only)

```javascript
// Returns first matching Task or null
var task = flattenedTasks.byName("Task Name");
```

**Important**: If multiple tasks have the same name, `byName()` only returns the
first match. Use `filter()` for disambiguation.

### By Name (All Matches for Disambiguation)

```javascript
// Returns array of all matching tasks
var taskName = "Summary";
var matchedTasks = flattenedTasks.filter(task => {
    return task.name === taskName;
});
// If matchedTasks.length > 1, disambiguation required
```

### Filtering Examples

```javascript
// Filter by status
var overdueTasks = flattenedTasks.filter(task => {
    return task.taskStatus === Task.Status.Overdue;
});

// Filter by project
var projectTasks = flattenedTasks.filter(task => {
    return task.containingProject &&
           task.containingProject.id.primaryKey === "projectId";
});

// Filter by tag (OR logic - has ANY of the tags)
var taggedTasks = flattenedTasks.filter(task => {
    return task.tags.some(t => t.name === "Urgent" || t.name === "Priority");
});

// Filter by tag (AND logic - has ALL of the tags)
var multiTaggedTasks = flattenedTasks.filter(task => {
    var tagNames = task.tags.map(t => t.name);
    return tagNames.includes("Urgent") && tagNames.includes("Priority");
});

// Filter by due date range
var tasksDueSoon = flattenedTasks.filter(task => {
    if (!task.dueDate) return false;
    var now = new Date();
    var weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return task.dueDate >= now && task.dueDate <= weekFromNow;
});

// Exclude completed/dropped
var activeTasks = flattenedTasks.filter(task => {
    return task.taskStatus !== Task.Status.Completed &&
           task.taskStatus !== Task.Status.Dropped;
});
```

---

## Version Checking

### Application Version Properties

```javascript
app.userVersion   // User-visible version (e.g., "4.7.1")
app.buildVersion  // Internal build version
```

### Version Class

```javascript
// Create version object
var ver = new Version("4.7");

// Comparison methods
app.userVersion.atLeast(new Version("4.7"))    // Returns Boolean
app.userVersion.isBefore(new Version("4.7"))   // Returns Boolean
app.userVersion.isAfter(new Version("4.7"))    // Returns Boolean
app.userVersion.equals(new Version("4.7"))     // Returns Boolean

// Get version string
app.userVersion.versionString  // Returns "4.7.1" etc.
```

### Version Check Example for plannedDate

```javascript
(function() {
    try {
        // Check version requirement
        if (!app.userVersion.atLeast(new Version("4.7"))) {
            return JSON.stringify({
                success: false,
                error: "Planned date requires OmniFocus v4.7 or later"
            });
        }

        var task = Task.byIdentifier("taskIdHere");
        if (!task) {
            return JSON.stringify({
                success: false,
                error: "Task 'taskIdHere' not found"
            });
        }

        // Set planned date
        task.plannedDate = new Date("2025-01-15T09:00:00");

        return JSON.stringify({
            success: true,
            id: task.id.primaryKey,
            name: task.name
        });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.message || String(e)
        });
    }
})();
```

---

## Version Requirements Summary

| Feature | Minimum Version |
|---------|-----------------|
| Base Task API | v3.0+ |
| `estimatedMinutes` | v3.5 (macOS only) |
| `shouldUseFloatingTimeZone` | v3.6+ |
| `effectiveCompletedDate`, `effectiveDropDate`, `drop()`, `clearTags()` | v3.8+ |
| `addNotification()`, `removeNotification()` | v3.8+ |
| `beforeTag()`, `afterTag()`, `moveTag()`, `moveTags()` | v4.0+ |
| `url` property on DatabaseObject | v4.5+ |
| **`plannedDate`** | **v4.7+** |
| **`effectivePlannedDate`** | **v4.7.1+** |

---

## OmniJS Script Patterns

### Standard IIFE with Error Handling

```javascript
(function() {
    try {
        // Business logic here
        return JSON.stringify({ success: true, data: result });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.message || String(e)
        });
    }
})();
```

### Date Formatting

```javascript
function formatDate(date) {
    if (!date) return null;
    return date.toISOString();
}
```

### Status Mapping

```javascript
var statusMap = {};
statusMap[Task.Status.Available] = "Available";
statusMap[Task.Status.Blocked] = "Blocked";
statusMap[Task.Status.Completed] = "Completed";
statusMap[Task.Status.Dropped] = "Dropped";
statusMap[Task.Status.DueSoon] = "DueSoon";
statusMap[Task.Status.Next] = "Next";
statusMap[Task.Status.Overdue] = "Overdue";

// Usage
var statusName = statusMap[task.taskStatus] || "Unknown";
```

---

## Implementation Recommendations

### 1. list_tasks

- Use `flattenedTasks.filter()` with generated filter conditions
- Apply `includeCompleted` filter by checking `taskStatus`
- Default `tagFilterMode` to `"any"` (OR logic) for consistency with existing
  `queryOmnifocus`
- Include `plannedDate` conditionally (check v4.7+ first)
- Use `limit` parameter to cap results (avoid returning entire database)

### 2. get_task

- Accept both `id` and `name` parameters
- Use `Task.byIdentifier()` for ID lookups (fast, exact)
- Use `flattenedTasks.filter()` for name lookups (enables disambiguation)
- Return all properties including version-specific ones
- Include `effectivePlannedDate` only if v4.7.1+

### 3. set_planned_date

- Check version with `app.userVersion.atLeast(new Version("4.7"))`
- Return clear error if version too old
- Accept both `id` and `name` for task identification
- Handle disambiguation for name-based lookups
- Accept `null` to clear planned date

### 4. append_note

- Use `task.appendStringToNote()` method
- Prepend `\n` to text if note is non-empty (per spec FR-033)
- Handle empty notes without leading newline (per spec)
- Preserve special characters (method handles escaping)

---

## Caveats and Gotchas

1. **plannedDate requires database migration** - Even on v4.7+, if the user hasn't
   migrated their database, `plannedDate` operations may fail. Error handling:
   - Version < 4.7: Return error "Planned date requires OmniFocus v4.7 or later"
   - Version >= 4.7 but unmigrated: Catch error, return "Planned date requires
     database migration. Please open OmniFocus preferences to migrate."

2. **byName() returns first match only** - Always use `filter()` and check array
   length for disambiguation.

3. **OmniJS errors fail silently** - Always wrap scripts in try-catch with JSON
   returns.

4. **estimatedMinutes is macOS only** - This property is not available on iOS/iPadOS.
   - MCP server runs on macOS only, so platform detection is not required
   - If accessed on iOS (future cross-platform), returns `null`

5. **flattenedTasks includes inbox items** - No need to separately query inbox.

6. **Tags are objects, not strings** - Use `task.tags.map(t => t.name)` to get
   tag names for comparison.

7. **Date comparison** - Use `.getTime()` for millisecond comparison to avoid
   timezone issues.

8. **effectivePlannedDate inheritance** - Computed from task's `plannedDate` if set,
   otherwise inherited from containing project (NOT from parent task).
