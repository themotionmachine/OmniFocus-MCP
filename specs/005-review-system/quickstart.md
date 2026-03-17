# OmniJS Quickstart: Review System

**Phase**: 005-review-system | **Date**: 2025-12-30

This document provides ready-to-use OmniJS patterns for implementing the Review
System tools. All patterns have been validated in OmniFocus Script Editor.

## Critical Constraints

### No `markReviewed()` Method

OmniFocus has **NO** built-in `markReviewed()` method. To mark a project as
reviewed:

1. Calculate new date: `today + reviewInterval`
2. Set `project.nextReviewDate` directly

**Note:** `lastReviewDate` is **READ-ONLY** from scripts. OmniFocus only updates
it when the user marks a project as reviewed via the app UI. Setting
`nextReviewDate` programmatically does **NOT** trigger a `lastReviewDate` update.

### Date Properties

| Property | Readable | Writable | Notes |
|----------|----------|----------|-------|
| `lastReviewDate` | ✅ | ❌ | Managed by OmniFocus automatically |
| `nextReviewDate` | ✅ | ✅ | This is how you "mark reviewed" |
| `reviewInterval` | ✅ | ✅ | Value object semantics (see below) |

### ReviewInterval Value Object

```javascript
// WRONG - modifies local copy only, has NO effect
project.reviewInterval.steps = 14;  // ❌

// CORRECT - read existing proxy, modify, write back
var ri = project.reviewInterval;
ri.steps = 14;
ri.unit = 'days';
project.reviewInterval = ri;  // ✓
```

**Why?** `project.reviewInterval` returns a value object proxy. Modifying
properties on it without reassignment has no effect. You must read the existing
proxy, modify it, and write it back.

## Date Calculation with Calendar API

**CRITICAL**: Never use millisecond math for date calculations. Use the
Calendar/DateComponents API instead.

```javascript
// ❌ WRONG - fails for months/years (varying lengths)
var ms = project.reviewInterval.steps * 30 * 24 * 60 * 60 * 1000;
project.nextReviewDate = new Date(Date.now() + ms);

// ✓ CORRECT - handles all edge cases properly
var today = Calendar.current.startOfDay(new Date());
var dc = new DateComponents();

switch (project.reviewInterval.unit) {
  case 'days':   dc.day = project.reviewInterval.steps;   break;
  case 'weeks':  dc.day = project.reviewInterval.steps * 7;  break;
  case 'months': dc.month = project.reviewInterval.steps; break;
  case 'years':  dc.year = project.reviewInterval.steps;  break;
}

project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);
```

## Tool Implementation Patterns

### get_projects_for_review

```javascript
(function() {
  try {
    var today = Calendar.current.startOfDay(new Date());
    var includeFuture = ${includeFuture};
    var futureDays = ${futureDays};
    var includeAll = ${includeAll};
    var includeInactive = ${includeInactive};
    var limit = ${limit};
    var folderId = ${folderId ? "'" + escapeForJS(folderId) + "'" : 'null'};
    var folderName = ${folderName ? "'" + escapeForJS(folderName) + "'" : 'null'};

    // Calculate future horizon using futureDays parameter
    var futureDC = new DateComponents();
    futureDC.day = futureDays;
    var futureHorizon = Calendar.current.dateByAddingDateComponents(today, futureDC);

    // Validate folderId (empty string check)
    if (folderId !== null && folderId.length === 0) {
      return JSON.stringify({ success: false, error: 'Invalid folderId: cannot be empty string' });
    }

    // Folder scoping
    var targetFolder = null;
    if (folderId) {
      targetFolder = Folder.byIdentifier(folderId);
      if (!targetFolder) {
        return JSON.stringify({ success: false, error: 'Folder not found: ' + folderId });
      }
    } else if (folderName) {
      targetFolder = flattenedFolders.byName(folderName);
      if (!targetFolder) {
        return JSON.stringify({ success: false, error: 'Folder not found: ' + folderName });
      }
    }

    var results = [];
    var dueCount = 0;
    var upcomingCount = 0;

    flattenedProjects.forEach(function(project) {
      // Skip projects without review configured
      if (!project.reviewInterval) return;
      if (!project.nextReviewDate) return;

      // Status filter: skip Done/Dropped unless includeInactive is true
      if (!includeInactive) {
        if (project.status.name === 'Done' || project.status.name === 'Dropped') return;
      }

      // Folder filter: check project is within target folder hierarchy
      if (targetFolder) {
        var inFolder = false;
        var f = project.parentFolder;
        while (f) {
          if (f.id.primaryKey === targetFolder.id.primaryKey) {
            inFolder = true;
            break;
          }
          f = f.parent;
        }
        if (!inFolder) return;
      }

      var nextReview = project.nextReviewDate;
      var isDue = nextReview.getTime() <= today.getTime();
      var isUpcoming = !isDue && nextReview.getTime() <= futureHorizon.getTime();

      // Determine if project should be included in results
      var included = includeAll || isDue || (includeFuture && isUpcoming);
      if (!included) return;

      // Count due vs upcoming among included projects
      if (isDue) {
        dueCount++;
      } else {
        upcomingCount++;
      }

      results.push({
        id: project.id.primaryKey,
        name: project.name,
        status: project.status.name,
        flagged: project.flagged,
        reviewInterval: {
          steps: project.reviewInterval.steps,
          unit: project.reviewInterval.unit
        },
        lastReviewDate: project.lastReviewDate ? project.lastReviewDate.toISOString() : null,
        nextReviewDate: project.nextReviewDate.toISOString(),
        remainingCount: project.flattenedTasks.filter(function(t) { return t.taskStatus !== Task.Status.Completed && t.taskStatus !== Task.Status.Dropped; }).length
      });
    });

    // Sort by nextReviewDate ascending (most overdue first), then name alphabetical
    results.sort(function(a, b) {
      var dateCompare = new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.name.localeCompare(b.name);
    });

    // totalCount before limit applied
    var totalCount = results.length;

    // Apply limit
    if (results.length > limit) {
      results = results.slice(0, limit);
    }

    return JSON.stringify({
      success: true,
      projects: results,
      totalCount: totalCount,
      dueCount: dueCount,
      upcomingCount: upcomingCount
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### mark_reviewed

```javascript
(function() {
  try {
    var projectIdentifiers = ${JSON.stringify(projectIdentifiers)};
    var results = [];
    var succeeded = 0;
    var failed = 0;
    var today = Calendar.current.startOfDay(new Date());

    projectIdentifiers.forEach(function(identifier, index) {
      var project = null;
      var result = {
        projectId: identifier.id || '',
        projectName: identifier.name || '',
        success: false
      };

      // Find project by ID or name
      if (identifier.id) {
        project = Project.byIdentifier(identifier.id);
      } else if (identifier.name) {
        var matches = flattenedProjects.filter(function(p) {
          return p.name === identifier.name;
        });
        if (matches.length === 1) {
          project = matches[0];
        } else if (matches.length > 1) {
          result.error = "Multiple projects match '" + identifier.name + "'. Use ID for precision.";
          result.code = 'DISAMBIGUATION_REQUIRED';
          result.candidates = matches.map(function(p) { return {id: p.id.primaryKey, name: p.name}; });
          results.push(result);
          failed++;
          return;
        }
      }

      if (!project) {
        result.error = 'Project not found: ' + (identifier.id || identifier.name);
        result.code = 'NOT_FOUND';
        results.push(result);
        failed++;
        return;
      }

      // Check for reviewInterval
      if (!project.reviewInterval) {
        result.projectId = project.id.primaryKey;
        result.projectName = project.name;
        result.error = "Project '" + project.name + "' has no review interval configured";
        result.code = 'NO_REVIEW_INTERVAL';
        results.push(result);
        failed++;
        return;
      }

      // Store previous date for response
      var previousNextReviewDate = project.nextReviewDate ?
        project.nextReviewDate.toISOString() : null;

      // Calculate new nextReviewDate using Calendar API
      var dc = new DateComponents();
      switch (project.reviewInterval.unit) {
        case 'days':   dc.day = project.reviewInterval.steps;   break;
        case 'weeks':  dc.day = project.reviewInterval.steps * 7;  break;
        case 'months': dc.month = project.reviewInterval.steps; break;
        case 'years':  dc.year = project.reviewInterval.steps;  break;
      }

      var newNextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);
      project.nextReviewDate = newNextReviewDate;

      result.projectId = project.id.primaryKey;
      result.projectName = project.name;
      result.success = true;
      result.previousNextReviewDate = previousNextReviewDate;
      result.newNextReviewDate = newNextReviewDate.toISOString();

      results.push(result);
      succeeded++;
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: {
        total: projectIdentifiers.length,
        succeeded: succeeded,
        failed: failed
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### set_review_interval

```javascript
(function() {
  try {
    var projectIdentifiers = ${JSON.stringify(projectIdentifiers)};
    var interval = ${interval === null ? 'null' : JSON.stringify(interval)};
    var recalculateNextReview = ${recalculateNextReview};
    var results = [];
    var succeeded = 0;
    var failed = 0;
    var today = Calendar.current.startOfDay(new Date());

    projectIdentifiers.forEach(function(identifier, index) {
      var project = null;
      var result = {
        projectId: identifier.id || '',
        projectName: identifier.name || '',
        success: false
      };

      // Find project by ID or name
      if (identifier.id) {
        project = Project.byIdentifier(identifier.id);
      } else if (identifier.name) {
        var matches = flattenedProjects.filter(function(p) {
          return p.name === identifier.name;
        });
        if (matches.length === 1) {
          project = matches[0];
        } else if (matches.length > 1) {
          result.error = "Multiple projects match '" + identifier.name + "'. Use ID for precision.";
          result.code = 'DISAMBIGUATION_REQUIRED';
          result.candidates = matches.map(function(p) { return {id: p.id.primaryKey, name: p.name}; });
          results.push(result);
          failed++;
          return;
        }
      }

      if (!project) {
        result.error = 'Project not found: ' + (identifier.id || identifier.name);
        result.code = 'NOT_FOUND';
        results.push(result);
        failed++;
        return;
      }

      // Store previous interval for response
      var previousInterval = project.reviewInterval ? {
        steps: project.reviewInterval.steps,
        unit: project.reviewInterval.unit
      } : null;

      result.projectId = project.id.primaryKey;
      result.projectName = project.name;
      result.previousInterval = previousInterval;

      if (interval === null) {
        // OmniJS limitation: reviewInterval/nextReviewDate cannot be null.
        // Workaround: set to 365-year sentinel so project never appears in reviews.
        if (project.reviewInterval) {
          var riDisable = project.reviewInterval;
          riDisable.steps = 365;
          riDisable.unit = 'years';
          project.reviewInterval = riDisable;
          var dcDisable = new DateComponents();
          dcDisable.year = 365;
          project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dcDisable);
        }
        result.newInterval = null;
      } else {
        // Set new interval (value object - read, modify, write back)
        var ri = project.reviewInterval;
        if (ri) {
          ri.steps = interval.steps;
          ri.unit = interval.unit;
          project.reviewInterval = ri;
        } else {
          // Project has no interval yet — assign directly to enable reviews
          project.reviewInterval = { steps: interval.steps, unit: interval.unit };
        }

        // Calculate nextReviewDate if null or recalculation requested
        if (!project.nextReviewDate || recalculateNextReview) {
          var dc = new DateComponents();
          switch (interval.unit) {
            case 'days':   dc.day = interval.steps;   break;
            case 'weeks':  dc.day = interval.steps * 7;  break;
            case 'months': dc.month = interval.steps; break;
            case 'years':  dc.year = interval.steps;  break;
          }
          project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);
        }

        result.newInterval = { steps: interval.steps, unit: interval.unit };
      }

      result.success = true;
      results.push(result);
      succeeded++;
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: {
        total: projectIdentifiers.length,
        succeeded: succeeded,
        failed: failed
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

## Folder Filtering Pattern

When filtering by folder, include all nested subfolders recursively:

```javascript
function isProjectInFolder(project, targetFolder) {
  var folder = project.parentFolder;
  while (folder) {
    if (folder.id.primaryKey === targetFolder.id.primaryKey) {
      return true;
    }
    folder = folder.parent;
  }
  return false;
}

// Find folder by ID or name
var targetFolder = null;
if (folderId) {
  targetFolder = Folder.byIdentifier(folderId);
} else if (folderName) {
  targetFolder = flattenedFolders.byName(folderName);
}

// Filter projects
var filtered = flattenedProjects.filter(function(p) {
  return isProjectInFolder(p, targetFolder);
});
```

## Error Response Format

All OmniJS scripts follow this error handling pattern:

```javascript
(function() {
  try {
    // ... implementation ...
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

## Testing in Script Editor

Before integrating, test all OmniJS patterns in OmniFocus Script Editor:

1. Open OmniFocus
2. Press `⌘-⌃-O` to open Automation Console
3. Paste script and execute
4. Verify JSON output structure

## Related Documentation

- [spec.md](./spec.md) - Feature specification
- [research.md](./research.md) - API research findings
- [data-model.md](./data-model.md) - Entity definitions
- [plan.md](./plan.md) - Implementation plan
