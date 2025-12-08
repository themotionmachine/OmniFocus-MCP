---
applyTo: "src/utils/omnifocusScripts/**/*.js,src/utils/scriptExecution.ts"
---

# JXA Script Instructions

When working with JXA (JavaScript for Automation) scripts:

## Script Execution

All OmniFocus interactions use JXA executed via `osascript -l JavaScript`:

```typescript
import { executeJXA } from './utils/scriptExecution';

const script = `
  const app = Application('OmniFocus');
  app.includeStandardAdditions = true;

  // OmniFocus operations here

  return JSON.stringify({ success: true, data: result });
`;

const result = await executeJXA(script);
```

## OmniFocus Object Model

**Application**: `Application('OmniFocus')`

**Collections**:
- `app.defaultDocument.flattenedTasks()` - All tasks
- `app.defaultDocument.flattenedProjects()` - All projects
- `app.defaultDocument.flattenedFolders()` - All folders
- `app.defaultDocument.flattenedTags()` - All tags

**Filtering**:
```javascript
// Using whose() for filtering
const tasks = app.defaultDocument.flattenedTasks.whose({
  completed: false,
  dropped: false
});

// Date comparisons
const dueSoon = tasks.whose({
  _and: [
    { dueDate: { _greaterThan: new Date() } },
    { dueDate: { _lessThan: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }
  ]
});
```

## Script Structure

Pre-built scripts in `src/utils/omnifocusScripts/`:

```javascript
// omnifocusScript.js
(function() {
  const app = Application('OmniFocus');
  app.includeStandardAdditions = true;

  try {
    // 1. Get reference to document
    const doc = app.defaultDocument;

    // 2. Perform operations
    const result = performOperation(doc);

    // 3. Return JSON result
    return JSON.stringify({
      success: true,
      data: result
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
})();
```

## Dynamic Script Generation

When generating JXA in TypeScript:

```typescript
function generateScript(params: QueryParams): string {
  // Escape user input to prevent injection
  const taskId = params.taskId.replace(/'/g, "\\'");

  return `
    const app = Application('OmniFocus');
    const doc = app.defaultDocument;

    const task = doc.flattenedTasks.byId('${taskId}');

    return JSON.stringify({
      id: task.id(),
      name: task.name()
    });
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
- Map JXA results to TypeScript interfaces
- Validate returned data structure
- Handle null/undefined properties

### Property Access

```javascript
// Method calls require parentheses
task.id()        // ✓ Correct
task.id          // ✗ Wrong - returns function object

// Properties don't require parentheses
task.name()      // ✓ Method
task.completed   // ✓ Property (but use method for consistency)
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
const doc = app.defaultDocument;

const task = app.InboxTask({
  name: 'Task name',
  note: 'Task notes',
  dueDate: new Date('2024-12-31')
});

doc.inboxTasks.push(task);
```

## Common Gotchas

1. **Method vs Property**: Use `task.id()` not `task.id`
2. **Date Objects**: Always use JavaScript Date objects, not strings
3. **Filtering**: Use `.whose()` for filtering, not JavaScript `.filter()`
4. **JSON Return**: Always return stringified JSON
5. **Escaping**: Escape quotes in generated scripts to prevent syntax errors
6. **Build Process**: JXA scripts are copied from `src/` to `dist/` during build

## Debugging JXA

To debug generated scripts:

```typescript
// Log the script before execution
console.error('Executing JXA:', script);

try {
  const result = await executeJXA(script);
  console.error('Result:', result);
} catch (error) {
  console.error('JXA Error:', error);
}
```

Or test scripts directly:

```bash
osascript -l JavaScript -e 'your script here'
```
