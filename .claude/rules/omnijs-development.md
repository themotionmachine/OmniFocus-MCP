---
paths:
  - "src/utils/omnifocusScripts/**/*.js"
  - "src/tools/primitives/**/*.ts"
---

# Omni Automation Development Rules

## Critical Behaviors

- OmniJS errors fail silently - test in Script Editor first
- Always wrap in try-catch with JSON error returns
- Use `executeOmniFocusScript()` to run pure OmniJS (wrapper handled internally)
- Use `writeSecureTempFile()` for script execution

## Script Structure

All OmniJS scripts must follow this IIFE pattern:

```javascript
(function() {
  try {
    // ... Omni Automation logic ...
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

## String Escaping

When generating OmniJS from TypeScript:

```typescript
const escapeForJS = (str: string): string =>
  str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
```

## OmniFocus Object Model (OmniJS)

### Finding Items

```javascript
Task.byIdentifier(id)          // Find task by ID
Project.byIdentifier(id)       // Find project by ID
Folder.byIdentifier(id)        // Find folder by ID
flattenedTasks.byName(name)    // Find task by name
flattenedProjects.byName(name) // Find project by name
flattenedFolders.byName(name)  // Find folder by name
```

### Creating Items

```javascript
new Task(name, inbox.ending)   // Create task in inbox
new Task(name, project)        // Create task in project
new Project(name, folder)      // Create project in folder
new Folder(name)               // Create top-level folder
new Tag(name)                  // Create tag
```

### Modifying Items

```javascript
task.markComplete()            // Complete task
task.markIncomplete()          // Mark incomplete
task.active = false            // Drop task
project.status = Project.Status.Active   // Project status
project.status = Project.Status.OnHold
project.status = Project.Status.Done
project.status = Project.Status.Dropped
```

### Tag Operations

```javascript
task.addTag(tagObj)            // Add single tag
task.removeTag(tagObj)         // Remove single tag
task.clearTags()               // Remove all tags
```

### Deleting Items

```javascript
deleteObject(item)             // Delete task, project, or folder
```

## Date Handling Chain

1. **Input**: ISO 8601 strings from MCP tools
2. **OmniJS**: Convert to `new Date("2024-12-25T00:00:00Z")`
3. **OmniFocus**: Stores as native Date objects
4. **Comparison**: Use `.getTime()` for milliseconds
5. **Output**: Convert back to ISO 8601 for response
