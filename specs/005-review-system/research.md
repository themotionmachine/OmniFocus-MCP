# Phase 5: Review System - API Research

**Research Date**: 2025-12-30
**Sources**: omni-automation.com, discourse.omnigroup.com, OmniFocus API Reference
**Research Method**: Tavily deep search and extraction

## Summary

Comprehensive research on OmniFocus Omni Automation API for project review
functionality. Key findings validate our spec and revealed critical
implementation details for date calculations.

---

## Key API Findings

### 1. Project Review Properties

| Property | Type | Writable | Notes |
|----------|------|----------|-------|
| `nextReviewDate` | Date \| null | ✅ Yes | Primary mechanism for "marking reviewed" |
| `lastReviewDate` | Date \| null | ❌ No | Updated by OmniFocus app, read-only in scripts |
| `reviewInterval` | ReviewInterval \| null | ✅ Yes | Value object semantics |

### 2. Project.ReviewInterval Class

```javascript
// Structure
{
  steps: Number,  // Positive integer (e.g., 1, 2, 3)
  unit: String    // 'days' | 'weeks' | 'months' | 'years'
}

// Example: Change review interval
let project = projectNamed("My Project");
let reviewInterval = project.reviewInterval;
reviewInterval.steps = 3;
reviewInterval.unit = "months";
project.reviewInterval = reviewInterval;  // Must reassign entire object
```

**Critical**: Value object semantics - cannot modify properties in-place.
Must reassign the entire object for changes to take effect.

### 3. Project.Status Enum

```javascript
const {Active, Done, Dropped, OnHold} = Project.Status;

// Usage
project.status = Project.Status.Active;
project.status = Project.Status.OnHold;
project.status = Project.Status.Done;
project.status = Project.Status.Dropped;
```

### 4. Filtering Projects

```javascript
// Filter projects by review criteria
var dueProjects = flattenedProjects.filter(project => {
  if (!project.reviewInterval) return false;  // No review schedule
  if (!project.nextReviewDate) return false;
  return project.nextReviewDate <= new Date();
});

// Filter by status
var activeProjects = flattenedProjects.filter(project => {
  return project.status === Project.Status.Active;
});

// Combined filter
var overdueActiveProjects = flattenedProjects.filter(project => {
  return project.reviewInterval !== null &&
         project.nextReviewDate !== null &&
         project.nextReviewDate <= new Date() &&
         project.status === Project.Status.Active;
});
```

---

## Date Calculation API (Critical)

### Calendar.current Methods

| Method | Description |
|--------|-------------|
| `startOfDay(date)` | Returns midnight of the given date |
| `dateByAddingDateComponents(date, components)` | Adds DateComponents to a date |
| `dateFromDateComponents(components)` | Creates date from components |
| `dateComponentsFromDate(date)` | Extracts components from date |

### DateComponents Class

```javascript
// Create DateComponents
var dc = new DateComponents();

// Available properties
dc.day = Number;    // Day of month (also used for weeks: steps * 7)
dc.month = Number;  // Months
dc.year = Number;   // Years
dc.hour = Number;   // Hours
dc.minute = Number; // Minutes
dc.second = Number; // Seconds
// NOTE: There is NO dc.week property. Confirmed via Object.getOwnPropertyNames(new DateComponents())
// For weeks, use dc.day = steps * 7
```

### Correct Date Calculation Pattern

```javascript
// Calculate next review date from today + interval
function calculateNextReviewDate(reviewInterval) {
  var today = Calendar.current.startOfDay(new Date());
  var dc = new DateComponents();

  // Map interval unit to DateComponents property
  switch (reviewInterval.unit) {
    case 'days':
      dc.day = reviewInterval.steps;
      break;
    case 'weeks':
      dc.day = reviewInterval.steps * 7;  // No dc.week property exists
      break;
    case 'months':
      dc.month = reviewInterval.steps;
      break;
    case 'years':
      dc.year = reviewInterval.steps;
      break;
  }

  return Calendar.current.dateByAddingDateComponents(today, dc);
}

// Usage
var project = Project.byIdentifier("abc123");
if (project.reviewInterval) {
  project.nextReviewDate = calculateNextReviewDate(project.reviewInterval);
}
```

### Why Calendar API > Millisecond Math

| Scenario | Millisecond Math | Calendar API |
|----------|-----------------|--------------|
| 1 month from Jan 31 | Feb 28/March 2-3 (30 days) | Feb 28 (correct) |
| 1 month from Feb 28 | March 28 (may be wrong) | March 28 (correct) |
| Leap year handling | Manual calculation | Automatic |
| DST transitions | Off by 1 hour | Handled correctly |

---

## OmniFocus Version Requirements

| Feature | Minimum Version |
|---------|-----------------|
| `Project.reviewInterval` | OmniFocus 3.11 |
| Calendar/DateComponents | OmniFocus 3.0+ |
| `flattenedProjects.filter()` | OmniFocus 3.0+ |

---

## API Limitations Confirmed

### No `markReviewed()` Method

Searched extensively - this method does not exist in the API.
The only way to "mark reviewed" is to:

1. Calculate the new `nextReviewDate`
2. Set it directly: `project.nextReviewDate = newDate`

### `lastReviewDate` is Read-Only

Scripts cannot set this property. OmniFocus updates it automatically when:

- User marks project reviewed in the app UI
- User completes a review session

Scripts can only read this value for informational purposes.

---

## Additional API Patterns

### Finding Projects

```javascript
// By identifier (UUID)
var project = Project.byIdentifier("abc123-def456");

// By name (returns first match)
var project = flattenedProjects.byName("My Project");

// All projects matching name
var matches = flattenedProjects.filter(p => p.name === "My Project");
```

### Project Folder Hierarchy

```javascript
// Get project's parent folder
var folder = project.parentFolder;

// Check if project is in folder hierarchy
function isInFolderHierarchy(project, targetFolderId) {
  var folder = project.parentFolder;
  while (folder) {
    if (folder.id.primaryKey === targetFolderId) return true;
    folder = folder.parent;
  }
  return false;
}
```

### Date Comparison

```javascript
// Compare dates (using getTime for milliseconds)
var today = Calendar.current.startOfDay(new Date());

var isOverdue = project.nextReviewDate &&
                project.nextReviewDate.getTime() < today.getTime();

var isDueToday = project.nextReviewDate &&
                 project.nextReviewDate.getTime() === today.getTime();

var isFuture = project.nextReviewDate &&
               project.nextReviewDate.getTime() > today.getTime();
```

---

## Implementation Recommendations

### 1. `get_projects_for_review` Primitive

```javascript
(function() {
  try {
    var today = Calendar.current.startOfDay(new Date());
    var params = /* injected params */;

    var results = flattenedProjects.filter(function(project) {
      // Exclude projects without review schedule
      if (!project.reviewInterval) return false;

      // Status filter (exclude inactive by default)
      if (!params.includeInactive) {
        if (project.status === Project.Status.Done ||
            project.status === Project.Status.Dropped) {
          return false;
        }
      }

      // Date filter
      if (!project.nextReviewDate) return false;

      if (params.includeAll) return true;

      var reviewTime = project.nextReviewDate.getTime();
      var todayTime = today.getTime();

      if (params.includeFuture) {
        var futureLimit = new Date(todayTime);
        futureLimit.setDate(futureLimit.getDate() + params.futureDays);
        return reviewTime <= futureLimit.getTime();
      }

      return reviewTime <= todayTime;
    });

    // Sort by nextReviewDate ascending (most overdue first)
    results.sort(function(a, b) {
      return a.nextReviewDate.getTime() - b.nextReviewDate.getTime();
    });

    return JSON.stringify({
      success: true,
      projects: results.map(function(p) {
        return {
          id: p.id.primaryKey,
          name: p.name,
          nextReviewDate: p.nextReviewDate ? p.nextReviewDate.toISOString() : null,
          lastReviewDate: p.lastReviewDate ? p.lastReviewDate.toISOString() : null,
          reviewInterval: p.reviewInterval ? {
            steps: p.reviewInterval.steps,
            unit: p.reviewInterval.unit
          } : null,
          status: p.status.name
        };
      }),
      totalCount: results.length
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### 2. `mark_reviewed` Primitive

```javascript
(function() {
  try {
    var project = Project.byIdentifier(/* id */);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }

    if (!project.reviewInterval) {
      return JSON.stringify({
        success: false,
        error: "Project has no review interval configured"
      });
    }

    // Calculate next review date using Calendar API
    var today = Calendar.current.startOfDay(new Date());
    var dc = new DateComponents();

    switch (project.reviewInterval.unit) {
      case 'days': dc.day = project.reviewInterval.steps; break;
      case 'weeks': dc.day = project.reviewInterval.steps * 7; break;
      case 'months': dc.month = project.reviewInterval.steps; break;
      case 'years': dc.year = project.reviewInterval.steps; break;
    }

    project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);

    return JSON.stringify({
      success: true,
      project: {
        id: project.id.primaryKey,
        name: project.name,
        nextReviewDate: project.nextReviewDate.toISOString(),
        reviewInterval: {
          steps: project.reviewInterval.steps,
          unit: project.reviewInterval.unit
        }
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

---

## Research Sources

1. **omni-automation.com/omnifocus/project.html** - Project class reference
2. **omni-automation.com/omnifocus/OF-API.html** - Complete API reference
3. **omni-automation.com/shared/calendar.html** - Calendar API reference
4. **omni-automation.com/shared/date.html** - DateComponents reference
5. **discourse.omnigroup.com** - OmniFocus 3.11 release notes, community discussions

---

## Validation Checklist

- [x] `nextReviewDate` is writable - **CONFIRMED**
- [x] `lastReviewDate` is read-only - **CONFIRMED**
- [x] No `markReviewed()` method exists - **CONFIRMED**
- [x] ReviewInterval uses value object semantics - **CONFIRMED**
- [x] Calendar/DateComponents API available - **CONFIRMED**
- [x] `flattenedProjects.filter()` available - **CONFIRMED**
- [x] Project.Status enum values - **CONFIRMED**
- [x] OmniFocus 3.11+ required for reviewInterval - **CONFIRMED**
