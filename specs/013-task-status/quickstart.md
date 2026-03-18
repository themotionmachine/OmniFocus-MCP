# OmniJS Quickstart: Task Status & Completion

**Phase**: 013-task-status | **Date**: 2026-03-17

This document provides ready-to-use OmniJS patterns for implementing the Task
Status & Completion tools. All patterns are derived from official Omni
Automation documentation at omni-automation.com.

## Critical Constraints

### markIncomplete() Only Works on Completed Items

`markIncomplete()` does NOT work on dropped items. The `mark_incomplete` tool
must detect the item's state and use the appropriate mechanism:

| Item State | Mechanism |
|------------|-----------|
| Completed task | `task.markIncomplete()` |
| Dropped task | `task.active = true` |
| Completed project | `project.markIncomplete()` |
| Dropped project | `project.status = Project.Status.Active` |

### Projects Have No drop() Method

Only `Task` has `drop(allOccurrences)`. Projects must use status assignment:

```javascript
// Tasks: use drop() method (v3.8+)
task.drop(true);   // Drop + stop repeating
task.drop(false);  // Drop current, keep repeating

// Projects: use status assignment
project.status = Project.Status.Dropped;
```

### Version Detection for drop()

```javascript
if (!app.userVersion.atLeast(new Version("3.8"))) {
  return JSON.stringify({
    success: false,
    error: "drop_items requires OmniFocus 3.8+. Current: " +
           app.userVersion.versionString
  });
}
```

## Tool Implementation Patterns

### mark_complete

```javascript
(function() {
  try {
    var items = ${itemsJSON};
    var completionDate = ${completionDate} ? new Date("${completionDate}") : null;
    var results = [];
    var succeeded = 0;
    var failed = 0;

    items.forEach(function(identifier, index) {
      var result = {
        itemId: identifier.id || '',
        itemName: identifier.name || '',
        itemType: '',
        success: false
      };

      var item = null;
      var isProject = false;

      // Try task first, then project
      if (identifier.id) {
        item = Task.byIdentifier(identifier.id);
        if (!item) {
          item = Project.byIdentifier(identifier.id);
          isProject = !!item;
        }
      } else if (identifier.name) {
        // Search tasks
        var taskMatches = flattenedTasks.filter(function(t) {
          return t.name === identifier.name;
        });
        // Search projects
        var projMatches = flattenedProjects.filter(function(p) {
          return p.name === identifier.name;
        });
        var allMatches = taskMatches.concat(projMatches);

        if (allMatches.length > 1) {
          result.error = "Multiple items match '" + identifier.name + "'. Use ID.";
          result.code = 'DISAMBIGUATION_REQUIRED';
          result.candidates = allMatches.map(function(m) {
            return {
              id: m.id.primaryKey,
              name: m.name,
              type: m instanceof Project ? 'project' : 'task'
            };
          });
          results.push(result);
          failed++;
          return;
        }
        item = allMatches[0];
        isProject = item instanceof Project;
      }

      if (!item) {
        result.error = "Item not found";
        result.code = 'NOT_FOUND';
        results.push(result);
        failed++;
        return;
      }

      result.itemId = item.id.primaryKey;
      result.itemName = item.name;
      result.itemType = isProject ? 'project' : 'task';

      // Idempotent: already completed is a no-op success
      if (isProject ? item.status === Project.Status.Done : item.completed) {
        result.success = true;
        result.code = 'ALREADY_COMPLETED';
        results.push(result);
        succeeded++;
        return;
      }

      item.markComplete(completionDate);
      result.success = true;
      results.push(result);
      succeeded++;
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: { total: items.length, succeeded: succeeded, failed: failed }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### mark_incomplete

```javascript
(function() {
  try {
    var items = ${itemsJSON};
    var results = [];
    var succeeded = 0;
    var failed = 0;

    items.forEach(function(identifier, index) {
      var result = {
        itemId: identifier.id || '',
        itemName: identifier.name || '',
        itemType: '',
        success: false
      };

      // ... (same lookup logic as mark_complete) ...

      result.itemId = item.id.primaryKey;
      result.itemName = item.name;
      result.itemType = isProject ? 'project' : 'task';

      // Detect state and use appropriate mechanism
      if (isProject) {
        if (item.status === Project.Status.Done) {
          item.markIncomplete();
        } else if (item.status === Project.Status.Dropped) {
          item.status = Project.Status.Active;
        } else {
          // Already active — no-op
          result.code = 'ALREADY_ACTIVE';
        }
      } else {
        if (item.completed) {
          item.markIncomplete();
        } else if (item.dropDate !== null) {
          item.active = true;
        } else {
          // Already active — no-op
          result.code = 'ALREADY_ACTIVE';
        }
      }

      result.success = true;
      results.push(result);
      succeeded++;
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: { total: items.length, succeeded: succeeded, failed: failed }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### drop_items

```javascript
(function() {
  try {
    // Version check (v3.8+ required for task.drop())
    if (!app.userVersion.atLeast(new Version("3.8"))) {
      return JSON.stringify({
        success: false,
        error: "drop_items requires OmniFocus 3.8 or later. Current version: " +
               app.userVersion.versionString
      });
    }

    var items = ${itemsJSON};
    var allOccurrences = ${allOccurrences};
    var results = [];
    var succeeded = 0;
    var failed = 0;

    items.forEach(function(identifier, index) {
      var result = { /* ... same lookup ... */ };

      // ... (same lookup logic) ...

      // Idempotent: already dropped is a no-op success
      if (isProject ? item.status === Project.Status.Dropped : item.dropDate !== null) {
        result.success = true;
        result.code = 'ALREADY_DROPPED';
        results.push(result);
        succeeded++;
        return;
      }

      // Different mechanisms for tasks vs projects
      if (isProject) {
        item.status = Project.Status.Dropped;
      } else {
        item.drop(allOccurrences);
      }

      result.success = true;
      results.push(result);
      succeeded++;
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: { total: items.length, succeeded: succeeded, failed: failed }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### set_project_type

```javascript
(function() {
  try {
    var project = null;
    // ... (lookup by id or name with disambiguation) ...

    var projectType = "${projectType}";

    switch (projectType) {
      case 'sequential':
        project.sequential = true;
        project.containsSingletonActions = false;
        break;
      case 'parallel':
        project.sequential = false;
        project.containsSingletonActions = false;
        break;
      case 'single-actions':
        project.containsSingletonActions = true;
        project.sequential = false;
        break;
    }

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      projectType: projectType,
      sequential: project.sequential,
      containsSingletonActions: project.containsSingletonActions
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### get_next_task

```javascript
(function() {
  try {
    var project = null;
    // ... (lookup by id or name with disambiguation) ...

    // Check for single-actions project first
    if (project.containsSingletonActions) {
      return JSON.stringify({
        success: true,
        hasNext: false,
        reason: "SINGLE_ACTIONS_PROJECT",
        message: "Single-actions projects do not have a sequential next task."
      });
    }

    var next = project.nextTask;
    if (next === null) {
      return JSON.stringify({
        success: true,
        hasNext: false,
        reason: "NO_AVAILABLE_TASKS",
        message: "No available tasks in this project."
      });
    }

    return JSON.stringify({
      success: true,
      hasNext: true,
      task: {
        id: next.id.primaryKey,
        name: next.name,
        note: next.note || '',
        flagged: next.flagged,
        taskStatus: next.taskStatus.name,
        dueDate: next.dueDate ? next.dueDate.toISOString() : null,
        deferDate: next.deferDate ? next.deferDate.toISOString() : null,
        tags: next.tags.map(function(t) {
          return { id: t.id.primaryKey, name: t.name };
        }),
        project: { id: project.id.primaryKey, name: project.name }
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### set_floating_timezone

```javascript
(function() {
  try {
    var item = null;
    var isProject = false;
    // ... (lookup by id or name — try task first, then project) ...

    var enabled = ${enabled};
    item.shouldUseFloatingTimeZone = enabled;

    return JSON.stringify({
      success: true,
      id: item.id.primaryKey,
      name: item.name,
      itemType: isProject ? 'project' : 'task',
      floatingTimezone: enabled
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

## Shared Patterns

### Item Lookup (Task or Project)

```javascript
function lookupItem(identifier) {
  var item = null;
  var isProject = false;

  if (identifier.id) {
    item = Task.byIdentifier(identifier.id);
    if (!item) {
      item = Project.byIdentifier(identifier.id);
      isProject = !!item;
    }
  } else if (identifier.name) {
    var taskMatches = flattenedTasks.filter(function(t) {
      return t.name === identifier.name;
    });
    var projMatches = flattenedProjects.filter(function(p) {
      return p.name === identifier.name;
    });
    var all = taskMatches.concat(projMatches);
    if (all.length === 1) {
      item = all[0];
      isProject = item instanceof Project;
    } else if (all.length > 1) {
      return { item: null, isProject: false, disambiguation: all };
    }
  }

  return { item: item, isProject: isProject, disambiguation: null };
}
```
