# Phase 4 Project Management - Manual Test Scripts

These OmniJS scripts are generated from the actual implementation code for manual verification in OmniFocus Script Editor (⌘⇧O to open Automation Console).

**Instructions:**
1. Open OmniFocus
2. Press ⌘⇧O to open the Automation Console
3. Copy each script and paste into the console
4. Press Enter to execute
5. Review the JSON output

---

## T015: list_projects Manual Verification

### Test 1: List all projects (no filters)

```javascript
(function() {
  try {
    var results = [];
    var projectList;

    // No folder filter - get all projects
    projectList = flattenedProjects;

    // Map project status to string
    function mapStatus(project) {
      var ps = project.status;
      if (ps === Project.Status.Active) return "Active";
      if (ps === Project.Status.OnHold) return "OnHold";
      if (ps === Project.Status.Done) return "Done";
      if (ps === Project.Status.Dropped) return "Dropped";
      return "Active";
    }

    // Helper to format date as ISO string
    function toISO(d) {
      return d ? d.toISOString() : null;
    }

    // Helper to determine project type
    function getProjectType(project) {
      if (project.containsSingletonActions) return "single-actions";
      if (project.sequential) return "sequential";
      return "parallel";
    }

    var count = 0;
    var maxResults = 20; // Limit for readability

    projectList.forEach(function(project) {
      if (count >= maxResults) return;

      var statusStr = mapStatus(project);

      // Skip completed/dropped by default
      if (statusStr === "Done" || statusStr === "Dropped") return;

      var folder = project.parentFolder;
      var rootTask = project.task;

      results.push({
        id: project.id.primaryKey,
        name: project.name,
        status: statusStr,
        flagged: project.flagged,
        projectType: getProjectType(project),
        deferDate: toISO(project.deferDate),
        dueDate: toISO(project.dueDate),
        nextReviewDate: toISO(project.nextReviewDate),
        parentFolderId: folder ? folder.id.primaryKey : null,
        parentFolderName: folder ? folder.name : null,
        taskCount: rootTask.tasks.length,
        remainingCount: rootTask.tasks.filter(function(t) {
          return t.taskStatus !== Task.Status.Completed && t.taskStatus !== Task.Status.Dropped;
        }).length
      });

      count++;
    });

    return JSON.stringify({ success: true, projects: results }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Returns JSON with `success: true` and array of projects with all properties.

### Test 2: List projects with status filter (Active only)

```javascript
(function() {
  try {
    var results = [];
    var projectList = flattenedProjects;
    var filterStatus = ["Active"];

    function mapStatus(project) {
      var ps = project.status;
      if (ps === Project.Status.Active) return "Active";
      if (ps === Project.Status.OnHold) return "OnHold";
      if (ps === Project.Status.Done) return "Done";
      if (ps === Project.Status.Dropped) return "Dropped";
      return "Active";
    }

    function toISO(d) { return d ? d.toISOString() : null; }
    function getProjectType(project) {
      if (project.containsSingletonActions) return "single-actions";
      if (project.sequential) return "sequential";
      return "parallel";
    }

    var count = 0;
    projectList.forEach(function(project) {
      if (count >= 10) return;
      var statusStr = mapStatus(project);
      if (filterStatus.indexOf(statusStr) === -1) return;

      results.push({
        id: project.id.primaryKey,
        name: project.name,
        status: statusStr,
        projectType: getProjectType(project)
      });
      count++;
    });

    return JSON.stringify({ success: true, count: results.length, projects: results }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Only returns projects with status "Active".

### Test 3: List flagged projects only

```javascript
(function() {
  try {
    var results = [];
    var projectList = flattenedProjects;

    function mapStatus(project) {
      var ps = project.status;
      if (ps === Project.Status.Active) return "Active";
      if (ps === Project.Status.OnHold) return "OnHold";
      if (ps === Project.Status.Done) return "Done";
      if (ps === Project.Status.Dropped) return "Dropped";
      return "Active";
    }

    projectList.forEach(function(project) {
      var statusStr = mapStatus(project);
      if (statusStr === "Done" || statusStr === "Dropped") return;
      if (project.flagged !== true) return; // Only flagged

      results.push({
        id: project.id.primaryKey,
        name: project.name,
        flagged: project.flagged
      });
    });

    return JSON.stringify({ success: true, flaggedCount: results.length, projects: results }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Only returns projects where `flagged: true`.

### Test 4: List projects in a specific folder (by name)

Replace `"YOUR_FOLDER_NAME"` with an actual folder name in your OmniFocus.

```javascript
(function() {
  try {
    var folderName = "YOUR_FOLDER_NAME"; // <-- Replace with actual folder name
    var folder = flattenedFolders.byName(folderName);

    if (!folder) {
      return JSON.stringify({ success: false, error: "Folder '" + folderName + "' not found" });
    }

    var projectList = folder.flattenedProjects;
    var results = [];

    projectList.forEach(function(project) {
      results.push({
        id: project.id.primaryKey,
        name: project.name,
        parentFolderName: project.parentFolder ? project.parentFolder.name : null
      });
    });

    return JSON.stringify({ success: true, folder: folderName, projects: results }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Only returns projects within the specified folder (including nested subfolders).

---

## T025: get_project Manual Verification

### Test 1: Get project by ID

First, run list_projects to get a valid project ID, then replace `"YOUR_PROJECT_ID"`:

```javascript
(function() {
  try {
    var projectId = "YOUR_PROJECT_ID"; // <-- Replace with actual ID from list_projects
    var project = Project.byIdentifier(projectId);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project '" + projectId + "' not found" });
    }

    function mapStatus(p) {
      var ps = p.status;
      if (ps === Project.Status.Active) return "Active";
      if (ps === Project.Status.OnHold) return "OnHold";
      if (ps === Project.Status.Done) return "Done";
      if (ps === Project.Status.Dropped) return "Dropped";
      return "Active";
    }

    function deriveProjectType(p) {
      if (p.containsSingletonActions) return "single-actions";
      if (p.sequential) return "sequential";
      return "parallel";
    }

    function toISO(d) { return d ? d.toISOString() : null; }

    var folder = project.parentFolder;
    var next = project.nextTask;
    var rootTask = project.task;

    var result = {
      id: project.id.primaryKey,
      name: project.name,
      note: rootTask.note || "",
      status: mapStatus(project),
      completed: project.completed,
      flagged: project.flagged,
      effectiveFlagged: project.effectiveFlagged,
      sequential: project.sequential,
      containsSingletonActions: project.containsSingletonActions,
      projectType: deriveProjectType(project),
      completedByChildren: project.completedByChildren,
      defaultSingletonActionHolder: project.defaultSingletonActionHolder,
      deferDate: toISO(project.deferDate),
      dueDate: toISO(project.dueDate),
      effectiveDeferDate: toISO(project.effectiveDeferDate),
      effectiveDueDate: toISO(project.effectiveDueDate),
      completionDate: toISO(project.completionDate),
      dropDate: toISO(project.dropDate),
      estimatedMinutes: project.estimatedMinutes !== undefined ? project.estimatedMinutes : null,
      reviewInterval: project.reviewInterval ? {
        steps: project.reviewInterval.steps,
        unit: project.reviewInterval.unit
      } : null,
      lastReviewDate: toISO(project.lastReviewDate),
      nextReviewDate: toISO(project.nextReviewDate),
      repetitionRule: project.repetitionRule ? project.repetitionRule.toString() : null,
      shouldUseFloatingTimeZone: project.shouldUseFloatingTimeZone !== undefined ? project.shouldUseFloatingTimeZone : false,
      hasChildren: project.task.hasChildren,
      nextTask: next ? { id: next.id.primaryKey, name: next.name } : null,
      parentFolder: folder ? { id: folder.id.primaryKey, name: folder.name } : null,
      tags: project.task.tags.map(function(t) {
        return { id: t.id.primaryKey, name: t.name };
      }),
      taskCount: project.task.children.length,
      remainingCount: project.task.children.filter(function(t) { return !t.completed; }).length
    };

    return JSON.stringify({ success: true, project: result }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Returns all 30 ProjectFull properties.

### Test 2: Get project by unique name

Replace `"YOUR_UNIQUE_PROJECT_NAME"` with an actual project name:

```javascript
(function() {
  try {
    var projectName = "YOUR_UNIQUE_PROJECT_NAME"; // <-- Replace

    var matchingProjects = flattenedProjects.filter(function(p) {
      return p.name === projectName;
    });

    if (matchingProjects.length === 0) {
      return JSON.stringify({ success: false, error: "Project '" + projectName + "' not found" });
    }

    if (matchingProjects.length > 1) {
      return JSON.stringify({
        success: false,
        error: "Multiple projects match name '" + projectName + "'",
        code: "DISAMBIGUATION_REQUIRED",
        matchingIds: matchingProjects.map(function(p) { return p.id.primaryKey; })
      }, null, 2);
    }

    var project = matchingProjects[0];
    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      status: project.status.toString()
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Returns project if name is unique, or DISAMBIGUATION_REQUIRED if multiple matches.

### Test 3: Get project with non-existent ID

```javascript
(function() {
  try {
    var projectId = "nonexistent-id-12345";
    var project = Project.byIdentifier(projectId);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project '" + projectId + "' not found" });
    }
    return JSON.stringify({ success: true, id: project.id.primaryKey });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Returns `success: false` with "not found" error.

---

## T036: create_project Manual Verification

### Test 1: Create project at top level with default settings

```javascript
(function() {
  try {
    var projectName = "Test Project - Default Settings";
    var insertionLocation = library.ending;

    var newProject = new Project(projectName, insertionLocation);

    return JSON.stringify({
      success: true,
      id: newProject.id.primaryKey,
      name: newProject.name,
      message: "Created at library root"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Creates project at root level, returns success with ID.

### Test 2: Create sequential project

```javascript
(function() {
  try {
    var projectName = "Test Project - Sequential";
    var insertionLocation = library.ending;

    var newProject = new Project(projectName, insertionLocation);
    newProject.sequential = true;
    newProject.containsSingletonActions = false;

    return JSON.stringify({
      success: true,
      id: newProject.id.primaryKey,
      name: newProject.name,
      sequential: newProject.sequential,
      containsSingletonActions: newProject.containsSingletonActions,
      projectType: "sequential"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Creates sequential project, `sequential: true`, `containsSingletonActions: false`.

### Test 3: Create single-actions project

```javascript
(function() {
  try {
    var projectName = "Test Project - Single Actions";
    var insertionLocation = library.ending;

    var newProject = new Project(projectName, insertionLocation);
    newProject.sequential = false;
    newProject.containsSingletonActions = true;

    return JSON.stringify({
      success: true,
      id: newProject.id.primaryKey,
      name: newProject.name,
      sequential: newProject.sequential,
      containsSingletonActions: newProject.containsSingletonActions,
      projectType: "single-actions"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Creates single-actions project, `containsSingletonActions: true`.

### Test 4: Create project with both flags (containsSingletonActions wins)

```javascript
(function() {
  try {
    var projectName = "Test Project - Both Flags";
    var insertionLocation = library.ending;

    var newProject = new Project(projectName, insertionLocation);

    // Per spec: containsSingletonActions wins (auto-clear sequential)
    newProject.sequential = false;
    newProject.containsSingletonActions = true;

    return JSON.stringify({
      success: true,
      id: newProject.id.primaryKey,
      name: newProject.name,
      sequential: newProject.sequential,
      containsSingletonActions: newProject.containsSingletonActions,
      message: "containsSingletonActions wins - sequential auto-cleared"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** `sequential: false`, `containsSingletonActions: true`.

### Test 5: Create project with dates and review interval

```javascript
(function() {
  try {
    var projectName = "Test Project - With Dates";
    var insertionLocation = library.ending;

    var newProject = new Project(projectName, insertionLocation);
    newProject.deferDate = new Date("2025-01-01T09:00:00");
    newProject.dueDate = new Date("2025-01-31T17:00:00");
    newProject.reviewInterval = new Project.ReviewInterval(1, "weeks");

    function toISO(d) { return d ? d.toISOString() : null; }

    return JSON.stringify({
      success: true,
      id: newProject.id.primaryKey,
      name: newProject.name,
      deferDate: toISO(newProject.deferDate),
      dueDate: toISO(newProject.dueDate),
      reviewInterval: newProject.reviewInterval ? {
        steps: newProject.reviewInterval.steps,
        unit: newProject.reviewInterval.unit
      } : null
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Project created with dates and weekly review interval.

### Test 6: Create project in specific folder

Replace `"YOUR_FOLDER_NAME"` with actual folder name:

```javascript
(function() {
  try {
    var projectName = "Test Project - In Folder";
    var folderName = "YOUR_FOLDER_NAME"; // <-- Replace

    var folder = flattenedFolders.byName(folderName);
    if (!folder) {
      return JSON.stringify({ success: false, error: "Folder '" + folderName + "' not found" });
    }

    var insertionLocation = folder.ending;
    var newProject = new Project(projectName, insertionLocation);

    return JSON.stringify({
      success: true,
      id: newProject.id.primaryKey,
      name: newProject.name,
      parentFolderId: newProject.parentFolder ? newProject.parentFolder.id.primaryKey : null,
      parentFolderName: newProject.parentFolder ? newProject.parentFolder.name : null
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Project created inside the specified folder.

---

## T047: edit_project Manual Verification

### Test 1: Edit project name and status

First create a test project or use an existing one's ID:

```javascript
(function() {
  try {
    var projectId = "YOUR_PROJECT_ID"; // <-- Replace with project to edit
    var project = Project.byIdentifier(projectId);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }

    var oldName = project.name;
    project.name = "Renamed Project - " + new Date().getTime();
    project.status = Project.Status.OnHold;

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      oldName: oldName,
      newName: project.name,
      status: project.status.toString()
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Project renamed and status changed to OnHold.

### Test 2: Edit project type with auto-clear

```javascript
(function() {
  try {
    var projectId = "YOUR_PROJECT_ID"; // <-- Replace
    var project = Project.byIdentifier(projectId);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }

    // Set sequential=true -> auto-clears containsSingletonActions
    project.sequential = true;
    project.containsSingletonActions = false; // auto-clear

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      sequential: project.sequential,
      containsSingletonActions: project.containsSingletonActions,
      message: "Set sequential=true, containsSingletonActions auto-cleared"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** `sequential: true`, `containsSingletonActions: false`.

### Test 3: Edit project dates

```javascript
(function() {
  try {
    var projectId = "YOUR_PROJECT_ID"; // <-- Replace
    var project = Project.byIdentifier(projectId);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }

    project.deferDate = new Date("2025-02-01T09:00:00");
    project.dueDate = new Date("2025-02-28T17:00:00");

    function toISO(d) { return d ? d.toISOString() : null; }

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      deferDate: toISO(project.deferDate),
      dueDate: toISO(project.dueDate)
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Dates updated to February 2025.

### Test 4: Clear dates by setting to null

```javascript
(function() {
  try {
    var projectId = "YOUR_PROJECT_ID"; // <-- Replace
    var project = Project.byIdentifier(projectId);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }

    project.deferDate = null;
    project.dueDate = null;

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      deferDate: project.deferDate,
      dueDate: project.dueDate,
      message: "Dates cleared"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Both dates are null.

---

## T057: delete_project Manual Verification

### Test 1: Delete project by ID (verify cascade)

First create a test project with tasks, then delete it:

```javascript
// Step 1: Create test project with tasks
(function() {
  try {
    var project = new Project("Test Delete - With Tasks", library.ending);
    new Task("Task 1", project);
    new Task("Task 2", project);
    new Task("Task 3", project);

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      taskCount: project.flattenedTasks.length,
      message: "Now run delete script with this ID"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

```javascript
// Step 2: Delete the project (use ID from step 1)
(function() {
  try {
    var projectId = "YOUR_PROJECT_ID"; // <-- Replace with ID from step 1
    var project = Project.byIdentifier(projectId);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project '" + projectId + "' not found" });
    }

    var capturedId = project.id.primaryKey;
    var capturedName = project.name;
    var taskCount = project.flattenedTasks.length;

    deleteObject(project);

    return JSON.stringify({
      success: true,
      id: capturedId,
      name: capturedName,
      message: "Project \"" + capturedName + "\" deleted (" + taskCount + " tasks removed)"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Project and all child tasks deleted, message shows task count.

### Test 2: Delete non-existent project

```javascript
(function() {
  try {
    var projectId = "nonexistent-project-id";
    var project = Project.byIdentifier(projectId);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project '" + projectId + "' not found" });
    }

    deleteObject(project);
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Returns error "Project 'nonexistent-project-id' not found".

### Test 3: Delete project with ambiguous name (create duplicates first)

```javascript
// Step 1: Create two projects with same name
(function() {
  try {
    var project1 = new Project("Duplicate Name Test", library.ending);
    var project2 = new Project("Duplicate Name Test", library.ending);

    return JSON.stringify({
      success: true,
      project1Id: project1.id.primaryKey,
      project2Id: project2.id.primaryKey,
      message: "Now test delete by name"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

```javascript
// Step 2: Try to delete by name (should fail with disambiguation)
(function() {
  try {
    var projectName = "Duplicate Name Test";
    var matchingProjects = [];

    flattenedProjects.forEach(function(p) {
      if (p.name === projectName) {
        matchingProjects.push(p);
      }
    });

    if (matchingProjects.length === 0) {
      return JSON.stringify({ success: false, error: "Project '" + projectName + "' not found" });
    }

    if (matchingProjects.length > 1) {
      var ids = matchingProjects.map(function(p) { return p.id.primaryKey; });
      return JSON.stringify({
        success: false,
        error: "Ambiguous project name '" + projectName + "'. Found " + matchingProjects.length + " matches.",
        code: "DISAMBIGUATION_REQUIRED",
        matchingIds: ids
      }, null, 2);
    }

    // Would delete here if unique
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Returns DISAMBIGUATION_REQUIRED with matchingIds array.

---

## T067: move_project Manual Verification

### Test 1: Move project to folder

```javascript
(function() {
  try {
    var projectId = "YOUR_PROJECT_ID"; // <-- Replace
    var targetFolderName = "YOUR_FOLDER_NAME"; // <-- Replace

    var project = Project.byIdentifier(projectId);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }

    var folder = flattenedFolders.byName(targetFolderName);
    if (!folder) {
      return JSON.stringify({ success: false, error: "Folder '" + targetFolderName + "' not found" });
    }

    moveSections([project], folder.ending);

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      parentFolderId: project.parentFolder ? project.parentFolder.id.primaryKey : null,
      parentFolderName: project.parentFolder ? project.parentFolder.name : null
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Project moved to folder, parentFolder info updated.

### Test 2: Move project to root

```javascript
(function() {
  try {
    var projectId = "YOUR_PROJECT_ID"; // <-- Replace (should be in a folder)

    var project = Project.byIdentifier(projectId);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }

    var oldFolder = project.parentFolder ? project.parentFolder.name : "root";

    moveSections([project], library.ending);

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      movedFrom: oldFolder,
      parentFolderId: project.parentFolder ? project.parentFolder.id.primaryKey : null,
      parentFolderName: project.parentFolder ? project.parentFolder.name : null,
      message: "Moved to library root"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Project moved to root, parentFolder is null.

### Test 3: Move project with position (beginning)

```javascript
(function() {
  try {
    var projectId = "YOUR_PROJECT_ID"; // <-- Replace

    var project = Project.byIdentifier(projectId);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }

    // Move to beginning of library
    moveSections([project], library.beginning);

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      position: "beginning",
      message: "Moved to beginning of library"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Project moved to the beginning of the library.

### Test 4: Move project before another project

```javascript
(function() {
  try {
    var projectId = "YOUR_PROJECT_ID"; // <-- Replace: project to move
    var beforeProjectId = "SIBLING_PROJECT_ID"; // <-- Replace: project to insert before

    var project = Project.byIdentifier(projectId);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }

    var beforeProj = Project.byIdentifier(beforeProjectId);
    if (!beforeProj) {
      return JSON.stringify({ success: false, error: "Before project not found" });
    }

    moveSections([project], beforeProj.before);

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      insertedBefore: beforeProj.name,
      message: "Moved before sibling project"
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Expected:** Project moved to position immediately before the specified sibling.

---

## Cleanup Script

After testing, run this to clean up test projects:

```javascript
(function() {
  try {
    var deleted = [];
    var testPrefix = "Test Project -";
    var deletePrefix = "Test Delete -";
    var duplicateName = "Duplicate Name Test";
    var renamedPrefix = "Renamed Project -";

    flattenedProjects.forEach(function(p) {
      if (p.name.indexOf(testPrefix) === 0 ||
          p.name.indexOf(deletePrefix) === 0 ||
          p.name === duplicateName ||
          p.name.indexOf(renamedPrefix) === 0) {
        deleted.push(p.name);
        deleteObject(p);
      }
    });

    return JSON.stringify({
      success: true,
      deletedCount: deleted.length,
      deleted: deleted
    }, null, 2);
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

---

## Verification Checklist

After running all tests, verify:

- [ ] **T015 list_projects**: Projects returned with correct filtering
- [ ] **T025 get_project**: All 30 properties returned, disambiguation works
- [ ] **T036 create_project**: Projects created with correct settings
- [ ] **T047 edit_project**: Properties updated, auto-clear works
- [ ] **T057 delete_project**: Cascade delete works, proper error messages
- [ ] **T067 move_project**: Projects move to correct locations
