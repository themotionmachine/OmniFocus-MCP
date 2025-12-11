---
applyTo: "src/utils/omnifocusScripts/**/*.js,src/utils/scriptExecution.ts"
---

# OmniJS Script Instructions

When working with Omni Automation JavaScript (OmniJS) scripts:

## Script Execution

All OmniFocus interactions use pure OmniJS executed via `executeOmniFocusScript()`:

```typescript
import { executeOmniFocusScript } from './utils/scriptExecution.js';

// OmniJS script (pure OmniAutomation JavaScript)
const omniJSScript = `
(() => {
  try {
    // OmniJS operations accessing OmniFocus internal object model
    const task = flattenedTasks.byName('Example Task');
    
    return JSON.stringify({ success: true, data: { id: task.id.primaryKey } });
  } catch (error) {
    return JSON.stringify({ success: false, error: error.toString() });
  }
})();
`;

// executeOmniFocusScript wraps the OmniJS in minimal JXA infrastructure
const result = await executeOmniFocusScript('@scriptName.js');
```

## OmniJS Object Model

**Global Objects** (available directly in OmniJS context):

**Collections**:
- `flattenedTasks` - All tasks across all projects
- `flattenedProjects` - All projects
- `flattenedFolders` - All folders
- `flattenedTags` - All tags
- `inbox` - Inbox tasks collection

**Finding Items**:
```javascript
// By identifier
const task = Task.byIdentifier(taskId);
const project = Project.byIdentifier(projectId);
const folder = Folder.byIdentifier(folderId);

// By name
const task = flattenedTasks.byName('Task name');
const project = flattenedProjects.byName('Project name');
const folder = flattenedFolders.byName('Folder name');
```

## Script Structure

Pre-built OmniJS scripts in `src/utils/omnifocusScripts/`:

```javascript
// omnifocusScript.js - Pure OmniJS
(() => {
  try {
    // OmniJS has direct access to OmniFocus object model
    // No need for Application() or defaultDocument references
    
    // 1. Find or create items
    const task = flattenedTasks.byName('Example');
    const project = flattenedProjects.byName('My Project');
    
    // 2. Perform operations
    task.markComplete();
    
    // 3. Return JSON result
    return JSON.stringify({
      success: true,
      data: { taskId: task.id.primaryKey }
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();
```

## Dynamic Script Generation

When generating OmniJS in TypeScript:

```typescript
function generateScript(params: QueryParams): string {
  // Escape user input to prevent injection
  const taskId = params.taskId.replace(/'/g, "\\'");

  return `
(() => {
  try {
    const task = Task.byIdentifier('${taskId}');

    return JSON.stringify({
      success: true,
      data: {
        id: task.id.primaryKey,
        name: task.name
      }
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();
  `;
}
```

## Best Practices

### Error Handling
- Always wrap operations in try-catch
- Return JSON with `success` and `error` fields
- Include context in error messages

### Performance
- Minimize object traversals
- Use `.whose()` filters early in the chain
- Fetch only needed properties
- Avoid recursive operations when possible

### Type Safety
- Map OmniJS results to TypeScript interfaces
- Validate returned data structure
- Handle null/undefined properties

### Property Access

```javascript
// OmniJS uses direct property access (no parentheses)
task.id.primaryKey  // ✓ Correct - access ID
task.name           // ✓ Correct - access name
task.completed      // ✓ Correct - boolean property

// Methods require parentheses
task.markComplete() // ✓ Correct - method call
deleteObject(task)  // ✓ Correct - function call
```

## Date Handling

```javascript
// Creating dates
const now = new Date();
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

// ISO 8601 strings from TypeScript
const date = new Date("2024-12-25T00:00:00Z");

// Comparing dates
const dueTasks = tasks.whose({
  dueDate: { _lessThan: tomorrow }
});
```

## Task Creation

```javascript
// Create task in inbox
const task = new Task('Task name', inbox.ending);
task.note = 'Task notes';
task.dueDate = new Date('2024-12-31');

// Create task in project
const project = Project.byIdentifier(projectId);
const task = new Task('Task name', project.task.children.ending);
task.note = 'Task notes';

// Create project in folder
const folder = Folder.byIdentifier(folderId);
const project = new Project('Project name', folder);
```

## Common Gotchas

1. **Property Access**: Use `task.id.primaryKey` not `task.id()` - OmniJS uses properties, not methods
2. **Date Objects**: Always use JavaScript Date objects, not strings
3. **Global Context**: No need for `Application()` or `defaultDocument` - use global objects directly
4. **JSON Return**: Always return stringified JSON with try-catch
5. **Escaping**: Escape quotes in generated scripts to prevent syntax errors
6. **Build Process**: OmniJS scripts are copied from `src/` to `dist/` during build
7. **Execution Wrapper**: `executeOmniFocusScript()` wraps OmniJS in minimal JXA infrastructure

## Debugging OmniJS

To debug generated scripts:

```typescript
// Log the script before execution
console.error('Executing OmniJS:', script);

try {
  const result = await executeOmniFocusScript(scriptPath);
  console.error('Result:', result);
} catch (error) {
  console.error('OmniJS Error:', error);
}
```

Or test scripts in OmniFocus Script Editor (⌘-⌃-O):

1. Open OmniFocus
2. Press ⌘-⌃-O to open Script Editor
3. Paste your OmniJS code
4. Click Run to test

**Note**: The OmniFocus Script Editor runs pure OmniJS directly, without needing
the JXA wrapper that `executeOmniFocusScript()` provides for automation.
