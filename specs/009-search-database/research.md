# Phase 9: Search & Database - API Research

**Research Date**: 2026-03-18
**Sources**: omni-automation.com (OF-API.html, database.html, apply.html, task.html, project.html, tag.html), discourse.omnigroup.com
**Research Method**: Tavily advanced search targeting official Omni Automation documentation

## Summary

Comprehensive research on OmniFocus Omni Automation API for search and database
operations. Key findings confirm the spec's architecture decisions: native Smart
Match methods for projects/folders/tags, `flattenedTasks.filter()` for tasks, and
top-level Database functions for undo/redo/save/cleanUp.

---

## Key API Findings

### 1. Search Methods (Database Class)

| Method | Signature | Returns | Notes |
|--------|-----------|---------|-------|
| `projectsMatching` | `projectsMatching(search: String)` | `Array of Project` | Smart Match / Quick Open relevance order |
| `foldersMatching` | `foldersMatching(search: String)` | `Array of Folder` | Smart Match / Quick Open relevance order |
| `tagsMatching` | `tagsMatching(search: String)` | `Array of Tag` | Smart Match / Quick Open relevance order |

**No `tasksMatching()` method exists.** Task search must use `flattenedTasks.filter()`.

Source: https://omni-automation.com/omnifocus/OF-API.html

### 2. Smart Match Behavior

The `*Matching()` methods use OmniFocus's Smart Match algorithm, the same one
used in the Quick Open window. Results are returned in relevance order. From
the official docs:

> "Returns each existing Project that Smart Matches the given search. The result
> will be in the same order and have the same projects as would be found when
> searching this string in the Quick Open window."

This means:
- Substring matching is implicit (no need for `includes()`)
- Relevance ranking is built-in (no manual sorting needed)
- Empty results return an empty array (no exception thrown)

Source: https://omni-automation.com/omnifocus/apply.html

### 3. Task Search via flattenedTasks.filter()

Since no `tasksMatching()` API exists, task search must use manual filtering:

```javascript
flattenedTasks.filter(task => {
  return task.name.toLowerCase().includes(query.toLowerCase());
});
```

**Critical notes:**
- `flattenedTasks` returns ALL tasks including completed, dropped, and inbox items
- Tasks are sorted by database order (not relevance)
- Status filtering must be applied within the filter callback for performance
- `task.taskStatus` returns a `Task.Status` enum value, not a string

Source: https://omni-automation.com/omnifocus/database.html

### 4. Task.Status Enum Values

| Value | Constant | Description |
|-------|----------|-------------|
| Available | `Task.Status.Available` | Task is available to work on |
| Blocked | `Task.Status.Blocked` | Blocked by defer date, sequential project, or on-hold tag |
| Completed | `Task.Status.Completed` | Already completed |
| Dropped | `Task.Status.Dropped` | Will not be worked on |
| DueSoon | `Task.Status.DueSoon` | Incomplete and due soon |
| Next | `Task.Status.Next` | First available task in a project |
| Overdue | `Task.Status.Overdue` | Incomplete and overdue |

**Decision for status filter mapping:**
- `"active"` maps to: Available, DueSoon, Next, Overdue, Blocked (all non-terminal states)
- `"completed"` maps to: Completed
- `"dropped"` maps to: Dropped
- `"all"` maps to: no filter applied

Source: https://omni-automation.com/omnifocus/task.html

### 5. Project.Status Enum Values

| Value | Constant | Description |
|-------|----------|-------------|
| Active | `Project.Status.Active` | Project is active |
| Done | `Project.Status.Done` | Project completed |
| Dropped | `Project.Status.Dropped` | Project dropped |
| OnHold | `Project.Status.OnHold` | Project on hold |

Source: https://omni-automation.com/omnifocus/project.html

### 6. Database Operations

| Method | Signature | Returns | Notes |
|--------|-----------|---------|-------|
| `save()` | `save()` | void | Saves unsaved changes; triggers sync if enabled |
| `cleanUp()` | `cleanUp()` | void | Processes inbox items, delayed filtering, deletes empty items |
| `undo()` | `undo()` | void | Undoes last undoable action; **throws on empty stack** |
| `redo()` | `redo()` | void | Redoes next redoable action; **throws on empty stack** |

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `canUndo` | Boolean | read-only | True if undoable actions exist |
| `canRedo` | Boolean | read-only | True if redoable actions exist |

**All are top-level Database functions** — called as `save()`, `undo()`, etc., not
`document.save()` or `database.save()`.

Source: https://omni-automation.com/omnifocus/database.html

### 7. Undo/Redo Pattern

Official example from omni-automation.com:

```javascript
if (canRedo) { redo() }
```

The pre-check pattern is mandatory because `undo()` and `redo()` throw errors
when no actions are available. The pre-check uses properties (`canUndo`, `canRedo`),
not method calls.

Source: https://omni-automation.com/omnifocus/database.html

### 8. Inbox Access

```javascript
// Count inbox items
inbox.length  // Returns number of tasks in inbox

// Iterate inbox items
inbox.forEach(task => { /* ... */ })
```

The `inbox` property returns a copy of Tasks currently in the Inbox. It supports
`.length` for counting without iteration.

Source: https://omni-automation.com/omnifocus/tutorial/class.html

### 9. Task Properties for Search Results

| Property | Type | Description |
|----------|------|-------------|
| `task.id.primaryKey` | String | Unique identifier |
| `task.name` | String | Display name |
| `task.taskStatus` | Task.Status | Current status enum value |
| `task.containingProject` | Project or null | Parent project (null for inbox items) |
| `task.inInbox` | Boolean | True if task is directly in inbox |

Source: https://omni-automation.com/omnifocus/task.html

### 10. Project Properties for Search Results

| Property | Type | Description |
|----------|------|-------------|
| `project.id.primaryKey` | String | Unique identifier |
| `project.name` | String | Display name |
| `project.status` | Project.Status | Current status enum value |
| `project.parentFolder` | Folder or null | Parent folder (null for root-level) |

Source: https://omni-automation.com/omnifocus/project.html

### 11. Folder Properties for Search Results

| Property | Type | Description |
|----------|------|-------------|
| `folder.id.primaryKey` | String | Unique identifier |
| `folder.name` | String | Display name |
| `folder.parent` | Folder or null | Parent folder (null for root-level) |

Source: https://omni-automation.com/omnifocus/OF-API.html

### 12. Tag Properties for Search Results

| Property | Type | Description |
|----------|------|-------------|
| `tag.id.primaryKey` | String | Unique identifier |
| `tag.name` | String | Display name |
| `tag.status` | Tag.Status | Current status (Active, OnHold, Dropped) |
| `tag.parent` | Tag or null | Parent tag (null for root-level) |

Source: https://omni-automation.com/omnifocus/tag.html

---

## Research Decisions

### Decision 1: Task Status Filter Mapping

**Decision**: Map the spec's `status` parameter to Task.Status enum values as follows:
- `"active"` = Available, Blocked, DueSoon, Next, Overdue (all non-terminal)
- `"completed"` = Completed
- `"dropped"` = Dropped
- `"all"` = no filter

**Rationale**: "Active" in GTD terms means "not done and not dropped." The OmniJS
Task.Status enum has 7 values, 5 of which represent non-terminal states. Grouping
them as "active" matches the GTD mental model and the spec's FR-006.

**Alternatives considered**: Exposing all 7 Task.Status values as individual filter
options was rejected because the spec explicitly defines only 4 values (active,
completed, dropped, all), and the additional granularity (DueSoon, Overdue, Next,
Blocked vs Available) is better served by the existing `list_tasks` tool's filters.

### Decision 2: Search Result Parent Context

**Decision**: Include parent context in search results as specified:
- Tasks: `projectName` (string) — project name or "Inbox" if `inInbox` is true, null if orphaned
- Projects: `folderName` (string or null) — parent folder name or null if root-level
- Folders: `parentFolderName` (string or null) — parent folder name or null if root-level
- Tags: `parentTagName` (string or null) — parent tag name or null if root-level

**Rationale**: Matches spec FR-001 through FR-004 and the "rich result" Key Entity
definition. Provides enough context for identification without follow-up queries.

### Decision 3: Database Stats Breakdown

**Decision**: Compute statistics by iterating flattened collections with status checks:
- Tasks: count by `taskStatus` grouping (available, blocked, completed, dropped)
  where "available" includes Available, DueSoon, Next, Overdue
- Projects: count by `status` (active, done, dropped, onHold)
- Folders: total count via `flattenedFolders.length`
- Tags: total count via `flattenedTags.length`
- Inbox: `inbox.length`

**Rationale**: OmniJS provides no aggregate statistics API. Iteration is the only
approach. Performance is acceptable for typical databases (under 10,000 items per
the spec's assumptions).

### Decision 4: No cleanUp() Return Data

**Decision**: `cleanup_database` returns only success/failure boolean. `cleanUp()`
is void in OmniJS and provides no information about items processed.

**Rationale**: Confirmed by spec clarification (2026-03-18) and API documentation.
There is no way to detect what items were moved or processed.

### Decision 5: save() Triggers Sync

**Decision**: `save_database` calls `save()` which both persists changes and triggers
sync if configured.

**Rationale**: From API docs: "Saves any unsaved changes to disk. If sync is enabled
and there were unsaved changes, this also triggers a sync request." This is the
complete behavior — no separate sync call needed.
