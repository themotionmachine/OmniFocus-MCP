# OmniJS Quickstart: Search & Database

**Phase**: 009-search-database | **Date**: 2026-03-18

This document provides ready-to-use OmniJS patterns for implementing the Search
& Database tools. All patterns are derived from official Omni Automation
documentation at omni-automation.com.

## Critical Constraints

### No tasksMatching() API Exists

The Database class provides `projectsMatching()`, `foldersMatching()`, and
`tagsMatching()` but has NO `tasksMatching()` method. Task search must use
`flattenedTasks.filter()` with manual substring matching.

### flattenedTasks Includes ALL Tasks

`flattenedTasks` returns every task in the database: active, completed, dropped,
inbox items, root tasks for projects, and task groups. Status filtering must be
applied within the OmniJS script.

### undo()/redo() Throw on Empty Stack

Both methods throw errors when no actions are available. The `canUndo`/`canRedo`
properties (not methods) must be checked before calling.

### cleanUp() and save() Are Void

Neither method returns any data. They complete silently on success.

### All Database Functions Are Top-Level

`save()`, `cleanUp()`, `undo()`, `redo()`, `canUndo`, `canRedo` are accessed
directly — not as `document.*` or `database.*`.

## Tool Implementation Patterns

### search_tasks

```javascript
(function() {
  try {
    var query = "${query}";
    var limit = ${limit};
    var statusFilter = "${statusFilter}";

    var queryLower = query.toLowerCase();

    var matches = flattenedTasks.filter(function(task) {
      // Skip root tasks of projects (they represent the project itself)
      if (task.containingProject !== null) {
        if (task.id.primaryKey === task.containingProject.id.primaryKey) {
          return false;
        }
      }

      // Name match (case-insensitive substring)
      if (!task.name.toLowerCase().includes(queryLower)) {
        return false;
      }

      // Status filter
      var status = task.taskStatus;
      if (statusFilter === "active") {
        return (
          status === Task.Status.Available ||
          status === Task.Status.Blocked ||
          status === Task.Status.DueSoon ||
          status === Task.Status.Next ||
          status === Task.Status.Overdue
        );
      } else if (statusFilter === "completed") {
        return status === Task.Status.Completed;
      } else if (statusFilter === "dropped") {
        return status === Task.Status.Dropped;
      }
      // "all" — no status filter
      return true;
    });

    var totalMatches = matches.length;
    var limited = matches.slice(0, limit);

    function mapTaskStatus(task) {
      var s = task.taskStatus;
      if (s === Task.Status.Available) return "available";
      if (s === Task.Status.Blocked) return "blocked";
      if (s === Task.Status.Completed) return "completed";
      if (s === Task.Status.Dropped) return "dropped";
      if (s === Task.Status.DueSoon) return "dueSoon";
      if (s === Task.Status.Next) return "next";
      if (s === Task.Status.Overdue) return "overdue";
      return "available";
    }

    var results = limited.map(function(task) {
      var projectName = null;
      if (task.inInbox) {
        projectName = "Inbox";
      } else if (task.containingProject) {
        projectName = task.containingProject.name;
      }

      return {
        id: task.id.primaryKey,
        name: task.name,
        status: mapTaskStatus(task),
        projectName: projectName,
        flagged: task.flagged
      };
    });

    return JSON.stringify({
      success: true,
      results: results,
      totalMatches: totalMatches
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

### search_projects

```javascript
(function() {
  try {
    var query = "${query}";
    var limit = ${limit};

    var matches = projectsMatching(query);
    var totalMatches = matches.length;
    var limited = matches.slice(0, limit);

    function mapProjectStatus(project) {
      var s = project.status;
      if (s === Project.Status.Active) return "active";
      if (s === Project.Status.Done) return "done";
      if (s === Project.Status.Dropped) return "dropped";
      if (s === Project.Status.OnHold) return "onHold";
      return "active";
    }

    var results = limited.map(function(project) {
      return {
        id: project.id.primaryKey,
        name: project.name,
        status: mapProjectStatus(project),
        folderName: project.parentFolder ? project.parentFolder.name : null
      };
    });

    return JSON.stringify({
      success: true,
      results: results,
      totalMatches: totalMatches
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

### search_folders

```javascript
(function() {
  try {
    var query = "${query}";
    var limit = ${limit};

    var matches = foldersMatching(query);
    var totalMatches = matches.length;
    var limited = matches.slice(0, limit);

    var results = limited.map(function(folder) {
      return {
        id: folder.id.primaryKey,
        name: folder.name,
        parentFolderName: folder.parent ? folder.parent.name : null
      };
    });

    return JSON.stringify({
      success: true,
      results: results,
      totalMatches: totalMatches
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

### search_tags

```javascript
(function() {
  try {
    var query = "${query}";
    var limit = ${limit};

    var matches = tagsMatching(query);
    var totalMatches = matches.length;
    var limited = matches.slice(0, limit);

    function mapTagStatus(tag) {
      if (tag.status === Tag.Status.OnHold) return "onHold";
      if (tag.status === Tag.Status.Dropped) return "dropped";
      return "active";
    }

    var results = limited.map(function(tag) {
      return {
        id: tag.id.primaryKey,
        name: tag.name,
        status: mapTagStatus(tag),
        parentTagName: tag.parent ? tag.parent.name : null
      };
    });

    return JSON.stringify({
      success: true,
      results: results,
      totalMatches: totalMatches
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

### get_database_stats

```javascript
(function() {
  try {
    // Task stats
    var available = 0;
    var blocked = 0;
    var completed = 0;
    var dropped = 0;

    flattenedTasks.forEach(function(task) {
      // Skip root tasks of projects
      if (task.containingProject !== null) {
        if (task.id.primaryKey === task.containingProject.id.primaryKey) {
          return;
        }
      }

      var s = task.taskStatus;
      if (s === Task.Status.Completed) {
        completed++;
      } else if (s === Task.Status.Dropped) {
        dropped++;
      } else if (s === Task.Status.Blocked) {
        blocked++;
      } else {
        // Available, DueSoon, Next, Overdue
        available++;
      }
    });

    // Project stats
    var projActive = 0;
    var projOnHold = 0;
    var projCompleted = 0;
    var projDropped = 0;

    flattenedProjects.forEach(function(project) {
      var s = project.status;
      if (s === Project.Status.Active) projActive++;
      else if (s === Project.Status.OnHold) projOnHold++;
      else if (s === Project.Status.Done) projCompleted++;
      else if (s === Project.Status.Dropped) projDropped++;
    });

    return JSON.stringify({
      success: true,
      tasks: {
        available: available,
        blocked: blocked,
        completed: completed,
        dropped: dropped,
        total: available + blocked + completed + dropped
      },
      projects: {
        active: projActive,
        onHold: projOnHold,
        completed: projCompleted,
        dropped: projDropped,
        total: projActive + projOnHold + projCompleted + projDropped
      },
      folders: flattenedFolders.length,
      tags: flattenedTags.length,
      inbox: inbox.length
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

### get_inbox_count

```javascript
(function() {
  try {
    return JSON.stringify({
      success: true,
      count: inbox.length
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

### save_database

```javascript
(function() {
  try {
    save();
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

### cleanup_database

```javascript
(function() {
  try {
    cleanUp();
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

### undo

```javascript
(function() {
  try {
    var performed = false;
    if (canUndo) {
      undo();
      performed = true;
    }
    return JSON.stringify({
      success: true,
      performed: performed,
      canUndo: canUndo,
      canRedo: canRedo
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

### redo

```javascript
(function() {
  try {
    var performed = false;
    if (canRedo) {
      redo();
      performed = true;
    }
    return JSON.stringify({
      success: true,
      performed: performed,
      canUndo: canUndo,
      canRedo: canRedo
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

## Key Patterns Summary

| Pattern | Used By | Notes |
|---------|---------|-------|
| `*Matching(query)` | search_projects, search_folders, search_tags | Smart Match, relevance order |
| `flattenedTasks.filter()` | search_tasks | Manual substring + status filter |
| `canUndo`/`canRedo` pre-check | undo, redo | Properties, not methods |
| `inbox.length` | get_inbox_count, get_database_stats | Direct count without iteration |
| Root task skip | search_tasks, get_database_stats | Avoid counting project root tasks as tasks |
