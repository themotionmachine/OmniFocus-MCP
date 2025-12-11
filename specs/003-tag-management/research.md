# Research: Tag Management Tools

**Feature**: 003-tag-management
**Date**: 2025-12-10
**Source**: Official Omni Automation documentation (omni-automation.com)

## Executive Summary

All NEEDS CLARIFICATION items from the Technical Context have been resolved through
research of the official Omni Automation documentation. The Tag class API is
well-documented and follows similar patterns to the Folder class with key differences
in status enumeration and task relationship management.

## Research Findings

### 1. Tag Class API

**Decision**: Use native Tag class with OmniJS execution pattern

**Rationale**: The Tag class provides all required functionality:

- Full CRUD operations via properties and `new Tag()` constructor
- Status management via `Tag.Status` enumeration
- Hierarchical structure via `parent`, `tags`, `flattenedTags`
- Task relationship via `remainingTasks`, Task's `addTag()`/`removeTag()`

**Alternatives Considered**:

- AppleScript: Rejected (Constitution v2.0.0 removed AppleScript tier)
- JXA direct: Rejected (OmniJS provides cleaner API access)

### 2. Tag.Status Enumeration

**Decision**: Support all three status values

**Rationale**: Official API exposes three states:

```javascript
Tag.Status.Active   // Tag is active
Tag.Status.OnHold   // Tag is paused (tasks may be hidden)
Tag.Status.Dropped  // Tag is archived
```

**Source**: omni-automation.com/omnifocus/tag.html - "Properties of the Tag.Status class"

**Alternatives Considered**:

- Two-state (active/dropped): Rejected - loses OnHold capability which is valuable
  for temporarily pausing tags without archiving

### 3. Task Count Metric

**Decision**: Use `tag.remainingTasks.length` for taskCount

**Rationale**: This metric represents incomplete tasks only, which is the most
useful count for GTD workflows. The official docs use `remainingTasks` as the
standard metric for determining "assigned" vs "unassigned" tags.

**Source**: omni-automation.com/omnifocus/tag.html - "Assigned/Unassigned Tags" section

```javascript
// Assigned tags have remaining tasks
assignedTags = flattenedTags.filter(tag => tag.remainingTasks.length > 0)
```

**Alternatives Considered**:

- `tag.tasks.length`: Includes completed tasks (less useful for active planning)
- `tag.availableTasks.length`: Only actionable tasks (too narrow)

### 4. Position System

**Decision**: Same pattern as folders with Tag-specific collections

**Rationale**: Tag positioning uses identical semantics to Folder:

| Placement | relativeTo Required | OmniJS Mapping |
|-----------|---------------------|----------------|
| before | Yes (sibling ID) | `siblingTag.before` |
| after | Yes (sibling ID) | `siblingTag.after` |
| beginning | No (parent ID optional) | `parentTag.beginning` or `tags.beginning` |
| ending | No (parent ID optional) | `parentTag.ending` or `tags.ending` |

**Source**: omni-automation.com/omnifocus/tag.html - "Create New Tag" section

### 5. Tag Identification

**Decision**: Support both ID and name lookup with disambiguation

**Rationale**: Official API provides multiple lookup methods:

```javascript
// By ID (unambiguous)
Tag.byIdentifier(id)

// By name (first match only - requires disambiguation)
flattenedTags.byName(name)
tagNamed(name)  // Top-level only
```

**Disambiguation Pattern**: When name lookup finds multiple matches, return
structured error per FR-038:

```json
{
  "success": false,
  "error": "Ambiguous tag name 'Urgent'. Found 2 matches: id1, id2",
  "code": "DISAMBIGUATION_REQUIRED",
  "matchingIds": ["id1", "id2"]
}
```

### 6. Task-Tag Operations

**Decision**: Use Task class methods for tag assignment

**Rationale**: The Task class provides clean API for tag management:

```javascript
// Adding tags
task.addTag(tagObj)       // Single tag
task.addTags(tagArray)    // Multiple tags (idempotent)

// Removing tags
task.removeTag(tagObj)    // Single tag (idempotent)
task.removeTags(tagArray) // Multiple tags
task.clearTags()          // All tags
```

**Source**: omni-automation.com/omnifocus/task.html - "Tag-Editing Functions"

**Key Behaviors**:

- `addTag()` is idempotent: no error if tag already assigned
- `removeTag()` is idempotent: no error if tag not present
- `clearTags()` removes all tags from task

### 7. Finding Tasks by Name

**Decision**: Use `flattenedTasks.byName()` with disambiguation

**Rationale**: Task lookup by name returns only first match:

```javascript
flattenedTasks.byName(name)  // Returns first match or null
```

To find all matches for disambiguation:

```javascript
flattenedTasks.filter(task => task.name === targetName)
```

### 8. Tag Deletion

**Decision**: Use `deleteObject(tag)` from Database class

**Rationale**: Standard deletion pattern consistent with folders:

```javascript
deleteObject(tag)  // Deletes tag and all children recursively
```

**Source**: omni-automation.com/omnifocus/tag.html - "Deleting Tags" section

**Behaviors**:

- Recursive: deleting parent deletes all children
- Task references automatically removed (handled by OmniFocus)
- Tasks themselves are NOT deleted

### 9. allowsNextAction Property

**Decision**: Expose as boolean in edit operations

**Rationale**: This property controls GTD workflow availability:

```javascript
tag.allowsNextAction = false  // Tasks with this tag won't show as "next"
```

**Use Case**: "Waiting For" tags typically have `allowsNextAction = false`

### 10. Hierarchical Listing

**Decision**: Use `tags` vs `flattenedTags` pattern (same as folders)

**Rationale**: Official API provides same distinction:

| Scenario | API | Returns |
|----------|-----|---------|
| Root only (includeChildren=false) | `tags` | Top-level tags |
| All recursive (includeChildren=true) | `flattenedTags` | All tags |
| Parent children only | `parentTag.tags` | Immediate children |
| Parent all descendants | `parentTag.flattenedTags` | All descendants |

## Implementation Patterns

### OmniJS Script Template for Tags

```javascript
(function() {
  try {
    // Tag operations here...

    // Find by ID
    var tag = Tag.byIdentifier(tagId);

    // Find by name (needs disambiguation check)
    var matches = flattenedTags.filter(function(t) {
      return t.name === targetName;
    });
    if (matches.length > 1) {
      return JSON.stringify({
        success: false,
        error: "Ambiguous tag name '" + targetName + "'",
        code: "DISAMBIGUATION_REQUIRED",
        matchingIds: matches.map(function(t) { return t.id.primaryKey; })
      });
    }

    // Map status to string
    function mapStatus(tag) {
      if (tag.status === Tag.Status.OnHold) return "onHold";
      if (tag.status === Tag.Status.Dropped) return "dropped";
      return "active";
    }

    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### Task Lookup Pattern

```javascript
// For assign_tags / remove_tags
function findTask(idOrName) {
  // Try ID first
  var task = Task.byIdentifier(idOrName);
  if (task) return { task: task };

  // Fall back to name lookup
  var matches = flattenedTasks.filter(function(t) {
    return t.name === idOrName;
  });

  if (matches.length === 0) {
    return { error: "Task '" + idOrName + "' not found" };
  }
  if (matches.length > 1) {
    return {
      error: "Ambiguous task name '" + idOrName + "'",
      code: "DISAMBIGUATION_REQUIRED",
      matchingIds: matches.map(function(t) { return t.id.primaryKey; })
    };
  }
  return { task: matches[0] };
}
```

## Resolved Questions

| Question | Resolution | Source |
|----------|------------|--------|
| Tag.Status values? | Active, OnHold, Dropped | tag.html |
| taskCount metric? | remainingTasks.length | tag.html Assigned Tags |
| Position API? | Same as folders | tag.html Create section |
| Task assignment? | task.addTag(), removeTag() | task.html Tag-Editing |
| Disambiguation? | Filter + structured error | Consistent with folders |
| Delete behavior? | Recursive, unlinks from tasks | tag.html Deleting Tags |

## References

- Tag Class: <https://omni-automation.com/omnifocus/tag.html>
- Task Class: <https://omni-automation.com/omnifocus/task.html>
- Database Class: <https://omni-automation.com/omnifocus/database.html>
- Finding Items: <https://omni-automation.com/omnifocus/finding-items.html>
