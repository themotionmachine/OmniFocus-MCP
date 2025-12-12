# Research: OmniJS Project API Documentation

**Feature Branch**: `004-project-management`
**Date**: 2025-12-12
**Sources**: omni-automation.com/omnifocus/project.html, omni-automation.com/omnifocus/database.html

## Executive Summary

This document captures OmniJS API research findings for the 6 project management
tools: `list_projects`, `get_project`, `create_project`, `edit_project`,
`delete_project`, and `move_project`.

---

## 1. Project Properties

### Writable Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | String | Project title (via root task) |
| `note` | String | Note content (via root task) |
| `status` | Project.Status | Active, OnHold, Done, Dropped |
| `sequential` | Boolean | If true, children form dependency chain |
| `containsSingletonActions` | Boolean | Single-actions list type |
| `completedByChildren` | Boolean | Auto-complete when last child completes |
| `defaultSingletonActionHolder` | Boolean | Receives inbox items on cleanup |
| `deferDate` | Date or null | Project not actionable until this date |
| `dueDate` | Date or null | Project should be completed by this date |
| `flagged` | Boolean | Flagged status |
| `shouldUseFloatingTimeZone` | Boolean | v3.6+ - Floating timezone for dates |
| `reviewInterval` | Project.ReviewInterval or null | Review schedule |
| `repetitionRule` | Task.RepetitionRule or null | Repetition properties |

### Read-Only Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | ObjectIdentifier | Unique identifier (via `id.primaryKey`) |
| `task` | Task | Root task holding project properties |
| `parentFolder` | Folder or null | Container folder |
| `children` | TaskArray | Alias for tasks property |
| `tasks` | Array of Task | Direct child tasks (sorted by library order) |
| `flattenedTasks` | TaskArray | All tasks recursively |
| `flattenedChildren` | TaskArray | Alias for flattenedTasks |
| `hasChildren` | Boolean | Has child tasks |
| `nextTask` | Task or null | Next available task (null for single-actions) |
| `completed` | Boolean | Completion status |
| `completionDate` | Date or null | When completed |
| `dropDate` | Date or null | When dropped |
| `taskStatus` | Task.Status | Current status enum |
| `effectiveDeferDate` | Date or null | Computed defer date |
| `effectiveDueDate` | Date or null | Computed due date |
| `effectiveCompletedDate` | Date or null | Computed completion date |
| `effectiveDropDate` | Date or null | Computed drop date |
| `effectiveFlagged` | Boolean | Computed flagged status |
| `lastReviewDate` | Date or null | When last reviewed |
| `nextReviewDate` | Date or null | When next review due |
| `tags` | TagArray | Associated tags |
| `attachments` | Array of FileWrapper | Root task attachments |
| `notifications` | Array of Task.Notification | Active notifications |
| `before` | Folder.ChildInsertionLocation | Position before this project |
| `after` | Folder.ChildInsertionLocation | Position after this project |
| `beginning` | Task.ChildInsertionLocation | Position before first task |
| `ending` | Task.ChildInsertionLocation | Position after last task |

---

## 2. Project.Status Enum

```javascript
// Project.Status values (Project.Status r/o)
Project.Status.Active   // Default - project is active
Project.Status.OnHold   // Project is paused
Project.Status.Done     // Project is completed
Project.Status.Dropped  // Project is dropped/abandoned

// Get all status values
Project.Status.all      // Array of all Project.Status values
```

**Usage Pattern:**

```javascript
// Set status
project.status = Project.Status.OnHold;

// Check status
if (project.status === Project.Status.Active) {
  // ...
}

// Get status as string
function getStatusString(project) {
  const {Active, Done, Dropped, OnHold} = Project.Status;
  switch(project.status) {
    case Active: return 'Active';
    case Done: return 'Done';
    case Dropped: return 'Dropped';
    case OnHold: return 'OnHold';
    default: return null;
  }
}
```

---

## 3. Project.ReviewInterval Class

The `Project.ReviewInterval` is a **value object** representing a simple
repetition interval for project reviews.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `steps` | Number | Count of units (e.g., "14" days) |
| `unit` | String | Unit type: "days", "weeks", "months", "years" |

### Important Notes

- **Value Object Semantics**: Changing properties doesn't affect projects directly
- Must update and re-assign to project's `reviewInterval` property

**Usage Pattern:**

```javascript
// Read review interval
var project = projectNamed("Miscellaneous");
var interval = project.reviewInterval;
console.log(interval.steps, interval.unit); // e.g., 7, "days"

// Modify review interval (must re-assign)
var reviewIntervalObj = project.reviewInterval;
reviewIntervalObj.steps = 2;
reviewIntervalObj.unit = "months";
project.reviewInterval = reviewIntervalObj;

// Create new review interval
project.reviewInterval = {steps: 1, unit: "weeks"};
```

---

## 4. Creating Projects

### Constructor

```javascript
new Project(name: String, position: Folder | Folder.ChildInsertionLocation | null) → Project
```

**Parameters:**

- `name`: Project name (required)
- `position`: Optional placement location
  - `Folder` object - places in folder
  - `Folder.ChildInsertionLocation` - precise positioning
  - `null` or omitted - top-level project

**Examples:**

```javascript
// Top-level project
var project = new Project("My Top-Level Project");

// Project in specific folder
var folder = flattenedFolders.byName("Work");
var project = new Project("New Project", folder);

// Project at specific position
var project = new Project("First Project", library.beginning);
var project = new Project("Last Project", library.ending);

// Before/after another project
var existingProject = flattenedProjects.byName("Reference");
var project = new Project("Before Ref", existingProject.before);
var project = new Project("After Ref", existingProject.after);
```

### Setting Project Type

```javascript
// Sequential project (tasks form dependency chain)
var project = new Project("Sequential Project");
project.sequential = true;
// OR via root task
project.task.sequential = true;

// Single-actions list (no next task)
var project = new Project("Single Actions List");
project.containsSingletonActions = true;

// Parallel project (default - all tasks available)
// No additional setting needed
```

**Critical Note:** `sequential` and `containsSingletonActions` are mutually
exclusive. Official patterns explicitly clear the conflicting property:

```javascript
// Setting Sequential (safe pattern)
if (project instanceof Project) {
  project.containsSingletonActions = false;
}
project.sequential = true;

// Setting Single Actions (safe pattern)
project.sequential = false;
project.containsSingletonActions = true;

// Setting Parallel (both false)
project.sequential = false;
project.containsSingletonActions = false;
```

---

## 5. Finding Projects

### By Identifier (ID)

```javascript
// Find by unique ID
var project = Project.byIdentifier("abc123-def456");
if (project) {
  console.log(project.name);
}
```

### By Name

```javascript
// Top-level project by name
var project = projectNamed("My Project");

// Any project by name (search entire database)
var project = flattenedProjects.byName("My Project");

// Projects in folder by name
var folder = flattenedFolders.byName("Work");
var project = folder.projectNamed("Target Project");
```

### All Projects (Iteration)

```javascript
// All projects in database
flattenedProjects.forEach(project => {
  console.log(project.name, project.status);
});

// Filter projects
var activeProjects = flattenedProjects.filter(project => {
  return project.status === Project.Status.Active;
});
```

### Smart Matching

```javascript
// Smart match projects (Quick Open style)
var matches = projectsMatching("Renov");
// Returns: [Project: Renovation, Project: Renovate Kitchen]
```

---

## 6. Editing Projects

### Property Updates

```javascript
var project = flattenedProjects.byName("My Project");
if (project) {
  // Basic properties
  project.name = "New Name";
  project.flagged = true;
  project.deferDate = new Date("2025-01-15");
  project.dueDate = new Date("2025-03-01");

  // Status
  project.status = Project.Status.OnHold;

  // Review interval
  project.reviewInterval = {steps: 2, unit: "weeks"};

  // Via root task (alternative)
  project.task.dueDate = targetDate;
}
```

### Clearing Properties (null assignment)

```javascript
// Clear optional dates
project.deferDate = null;
project.dueDate = null;
project.reviewInterval = null;
```

---

## 7. Deleting Projects

### Using deleteObject()

```javascript
// Delete by reference
var project = flattenedProjects.byName("Old Project");
if (project) {
  deleteObject(project);
}

// Delete by ID
var project = Project.byIdentifier("abc123");
if (project) {
  deleteObject(project);
}
```

**Cascade Behavior:** Deleting a project removes all child tasks automatically.
This is OmniFocus's native behavior.

---

## 8. Moving Projects

### Using moveSections()

```javascript
// Move project(s) to folder
var project = flattenedProjects.byName("My Project");
var targetFolder = flattenedFolders.byName("Archive");
moveSections([project], targetFolder);

// Move to root (top-level)
moveSections([project], library.ending);

// Position within folder
moveSections([project], targetFolder.beginning);
moveSections([project], targetFolder.ending);

// Move multiple projects
var projects = [proj1, proj2, proj3];
moveSections(projects, targetFolder);
```

**Key Points:**

- `moveSections()` accepts Array of Projects/Folders
- Works for both projects and folders
- Returns void (no return value)

---

## 9. Project Functions

### Task Operations

| Function | Description |
|----------|-------------|
| `taskNamed(name)` | First top-level task by name |
| `markComplete(date?)` | Mark complete (optional date) |
| `markIncomplete()` | Mark incomplete |
| `appendStringToNote(text)` | Append to note |

### Tag Operations

| Function | Description |
|----------|-------------|
| `addTag(tag)` | Add single tag |
| `addTags(tags)` | Add multiple tags |
| `removeTag(tag)` | Remove single tag |
| `removeTags(tags)` | Remove multiple tags |
| `clearTags()` | Remove all tags |

### Attachment Operations

| Function | Description |
|----------|-------------|
| `addAttachment(fileWrapper)` | Add file attachment |
| `removeAttachmentAtIndex(index)` | Remove by index |
| `addLinkedFileURL(url)` | Add file bookmark (macOS) |
| `removeLinkedFileWithURL(url)` | Remove file link |

### Notification Operations

| Function | Description |
|----------|-------------|
| `addNotification(dateOrOffset)` | Add notification |
| `removeNotification(notification)` | Remove notification |

---

## 10. Database Functions for Projects

### Project Lookup

```javascript
// Top-level by name
projectNamed(name: String) → Project | null

// Smart matching
projectsMatching(search: String) → Array of Project

// All projects (property)
flattenedProjects → ProjectArray
```

### Project Array Methods

```javascript
// byName on arrays
flattenedProjects.byName(name) → Project | null

// Standard array methods work
flattenedProjects.filter(p => p.flagged)
flattenedProjects.forEach(p => console.log(p.name))
```

### Movement Functions

```javascript
// Move projects/folders
moveSections(sections: Array<Project|Folder>, position: Folder|Folder.ChildInsertionLocation) → void

// Duplicate projects/folders
duplicateSections(sections: Array<Project|Folder>, position: Folder|Folder.ChildInsertionLocation) → Array<Project|Folder>
```

### Deletion

```javascript
// Delete any database object
deleteObject(object: DatabaseObject) → void
```

---

## 11. Version Requirements

| Feature | Version | Platform | Notes |
|---------|---------|----------|-------|
| Project class | v3.0+ | All | Core functionality |
| Project.Status | v3.0+ | All | All 4 status values |
| reviewInterval | v3.0+ | All | Review scheduling |
| moveSections | v3.0+ | All | Move projects/folders |
| shouldUseFloatingTimeZone | v3.6+ | All | Floating timezone |
| deleteObject | v3.0+ | All | Cascade deletes tasks |
| Project.byIdentifier | v3.0+ | All | ID-based lookup |

---

## 12. Key Findings & Decisions

### Finding 1: Project Type Auto-Clear

**Question:** What happens when setting `sequential` on a project with
`containsSingletonActions = true`?

**Answer:** Official Omni Automation code examples show explicit clearing
of the conflicting property before setting the desired one. No exception
is thrown for simultaneous true values, but behavior is undefined.

**Decision:** Auto-clear conflicting property (per spec clarification)

```javascript
// Implementation pattern
if (params.sequential === true) {
  project.containsSingletonActions = false;
  project.sequential = true;
} else if (params.containsSingletonActions === true) {
  project.sequential = false;
  project.containsSingletonActions = true;
}
```

### Finding 2: Review Interval Value Object

**Question:** How to update review interval?

**Answer:** `Project.ReviewInterval` is a value object. Must modify and
re-assign to take effect.

**Decision:** Accept `{steps: number, unit: string}` input, assign directly

```javascript
project.reviewInterval = {steps: 2, unit: "weeks"};
```

### Finding 3: Cascade Delete

**Question:** Does `deleteObject(project)` remove child tasks?

**Answer:** Yes, confirmed by documentation. All child tasks are deleted
with the project (OmniFocus native behavior).

**Decision:** No additional handling needed; document cascade behavior

### Finding 4: Position Parameters

**Question:** How to control project positioning?

**Answer:** Multiple options available:
- `library.beginning` / `library.ending` for top-level
- `folder.beginning` / `folder.ending` within folder
- `project.before` / `project.after` relative to sibling

**Decision:** Support `"beginning"`, `"ending"`, `"root"`, and relative
positioning via `beforeProject` / `afterProject` parameters

### Finding 5: Name-Based Disambiguation

**Question:** How to handle multiple projects with same name?

**Answer:** `flattenedProjects.byName()` returns first match only.
Must filter and return all matches for disambiguation.

**Decision:** Use filter pattern for disambiguation:

```javascript
var matches = flattenedProjects.filter(p => p.name === targetName);
if (matches.length > 1) {
  // Return disambiguation error with all matching IDs
}
```

---

## 13. OmniJS Script Templates

### list_projects Filter Template

```javascript
(() => {
  try {
    var results = [];
    flattenedProjects.forEach(project => {
      // Status filter
      if (statusFilter && project.status !== statusFilter) return;

      // Folder filter (recursive)
      if (folderFilter) {
        var inFolder = false;
        var parent = project.parentFolder;
        while (parent) {
          if (parent.id.primaryKey === folderFilter) {
            inFolder = true;
            break;
          }
          parent = parent.parentFolder;
        }
        if (!inFolder) return;
      }

      // Review status filter
      if (reviewStatusFilter === 'due') {
        var today = new Date();
        if (!project.nextReviewDate || project.nextReviewDate > today) return;
      }

      results.push({
        id: project.id.primaryKey,
        name: project.name,
        status: getStatusString(project),
        flagged: project.flagged,
        dueDate: project.dueDate ? project.dueDate.toISOString() : null,
        deferDate: project.deferDate ? project.deferDate.toISOString() : null,
        parentFolderId: project.parentFolder ? project.parentFolder.id.primaryKey : null,
        parentFolderName: project.parentFolder ? project.parentFolder.name : null,
        taskCount: project.flattenedTasks.length,
        nextReviewDate: project.nextReviewDate ? project.nextReviewDate.toISOString() : null
      });
    });
    return JSON.stringify({success: true, projects: results});
  } catch (e) {
    return JSON.stringify({success: false, error: e.toString()});
  }
})();
```

### create_project Template

```javascript
(() => {
  try {
    var position = null;
    if (folderId) {
      var folder = Folder.byIdentifier(folderId);
      if (!folder) {
        return JSON.stringify({success: false, error: "Folder '" + folderId + "' not found"});
      }
      position = folder;
    }

    var project = new Project(name, position);

    // Set properties
    if (sequential === true) {
      project.containsSingletonActions = false;
      project.sequential = true;
    } else if (containsSingletonActions === true) {
      project.sequential = false;
      project.containsSingletonActions = true;
    }

    if (deferDate) project.deferDate = new Date(deferDate);
    if (dueDate) project.dueDate = new Date(dueDate);
    if (flagged !== undefined) project.flagged = flagged;
    if (reviewInterval) project.reviewInterval = reviewInterval;

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name
    });
  } catch (e) {
    return JSON.stringify({success: false, error: e.toString()});
  }
})();
```

---

## 14. Research Status

All research tasks completed:

- [x] Project API properties - Documented all writable/read-only
- [x] `Project.Status` enum - Confirmed 4 values
- [x] `reviewInterval` structure - Documented value object pattern
- [x] `new Project()` constructor - Confirmed signature and positioning
- [x] `deleteObject(project)` - Confirmed cascade delete behavior
- [x] `moveSections()` - Documented API for moving projects
- [x] `Project.byIdentifier()` - Confirmed lookup pattern
- [x] `flattenedProjects.byName()` - Confirmed name-based lookup
- [x] Project type switching - Confirmed auto-clear pattern

---

## References

- [OmniFocus Project Class](https://omni-automation.com/omnifocus/project.html)
- [OmniFocus Database Class](https://omni-automation.com/omnifocus/database.html)
- [OmniFocus API Reference](https://omni-automation.com/omnifocus/OF-API.html)
