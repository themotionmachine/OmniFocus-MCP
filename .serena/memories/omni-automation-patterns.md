# Omni Automation Patterns (from omni-automation.com)

## Project Creation
```javascript
new Project(name: String, position: Folder or Folder.ChildInsertionLocation or null) → Project
```

### Example - Basic:
```javascript
var project = new Project("My Project")
```

### Example - In folder:
```javascript
var folder = folderNamed("Work") || flattenedFolders.byName("Work")
new Project("My Project", folder)
```

### Example - With position:
```javascript
var folder = folderNamed("Work")
new Project("My Project", folder.beginning)  // or folder.ending
```

## Project Properties
- `project.sequential = true` - Make sequential (default: parallel)
- `project.containsSingletonActions = true` - Single actions list
- `project.task.dueDate = new Date("2024-12-31")` - Due date via root task
- `project.task.deferDate = new Date("2024-12-01")` - Defer date via root task
- `project.task.note = "Notes here"` - Notes via root task
- `project.flagged = true` - Flag the project
- `project.addTag(tagObj)` - Add a tag

## Finding Items
```javascript
// Folders
folderNamed("Name")  // Top-level only
flattenedFolders.byName("Name")  // Any level
Folder.byIdentifier("id")  // By ID

// Projects
projectNamed("Name")  // Top-level only
flattenedProjects.byName("Name")  // Any level
Project.byIdentifier("id")  // By ID

// Tags
flattenedTags.byName("Name") || new Tag("Name")  // Find or create
```

## Task Creation
```javascript
new Task(name: String, position: Task or Task.ChildInsertionLocation or Project or Inbox or null) → Task
```

### Examples:
```javascript
task = new Task("My Task", inbox.beginning)
task = new Task("Project Task", project)  // In project
task = new Task("Subtask", parentTask)    // As child
task.note = "Notes"
task.flagged = true
task.dueDate = new Date()
task.deferDate = new Date()
task.addTag(tagObj)
```

## Folder Creation
```javascript
new Folder(name: String, position: Folder or Folder.ChildInsertionLocation or null) → Folder
```

## Task/Project Editing

### Finding Items
```javascript
Task.byIdentifier("taskId")        // Find task by ID
Project.byIdentifier("projectId")  // Find project by ID
flattenedTasks.byName("name")      // Find task by name
flattenedProjects.byName("name")   // Find project by name
```

### Task Status Changes
```javascript
task.markComplete()     // Mark as completed
task.markIncomplete()   // Mark as incomplete
task.active = false     // Drop the task
task.active = true      // Un-drop the task
```

### Tag Operations
```javascript
task.addTag(tagObj)         // Add single tag
task.addTags([tag1, tag2])  // Add multiple tags
task.removeTag(tagObj)      // Remove single tag
task.removeTags([tag1, tag2]) // Remove multiple tags
task.clearTags()            // Clear all tags (v3.8+)
```

### Project Status
```javascript
project.status = Project.Status.Active
project.status = Project.Status.OnHold
project.status = Project.Status.Done
project.status = Project.Status.Dropped
```

### Moving Projects to Folders
```javascript
var folder = flattenedFolders.byName("Folder Name")
moveSections([project], folder)  // Move project to folder
```

## Script Pattern (Return JSON)
```javascript
try {
  // ... Omni Automation logic ...
  JSON.stringify({ success: true, data: result })
} catch (e) {
  JSON.stringify({ success: false, error: e.message || String(e) })
}
```