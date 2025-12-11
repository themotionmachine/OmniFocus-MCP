# Phase 3: Enhanced Task Management - Quickstart

## Development Environment

### Prerequisites

- Node.js 24+
- pnpm (package manager)
- OmniFocus Pro 4.7+ (for `plannedDate` support)
- macOS with OmniFocus installed

### Setup

```bash
# Install dependencies
pnpm install

# Build project
pnpm build

# Run tests in watch mode (TDD)
pnpm test:watch

# Type checking
pnpm typecheck
```

## File Structure

```text
specs/003-tasks/
├── spec.md               # Feature specification
├── plan.md               # Implementation plan
├── research.md           # OmniJS Task API research
├── data-model.md         # Data model documentation
├── quickstart.md         # This file
├── contracts/            # Zod schema contracts
│   ├── index.ts          # Main exports
│   ├── shared/           # Shared types
│   │   ├── index.ts
│   │   ├── task.ts       # Task entity schemas
│   │   └── disambiguation.ts
│   ├── list-tasks.ts     # list_tasks contract
│   ├── get-task.ts       # get_task contract
│   ├── set-planned-date.ts
│   └── append-note.ts
└── checklists/           # Implementation checklists
```

## Implementation Order

### Phase 1: list_tasks

1. **Contract tests** → `tests/contract/list-tasks.test.ts`
2. **Primitive tests** → `tests/unit/listTasks.test.ts`
3. **Primitive** → `src/tools/primitives/listTasks.ts`
4. **Definition** → `src/tools/definitions/listTasks.ts`
5. **Register** in `src/server.ts`

### Phase 2: get_task

1. **Contract tests** → `tests/contract/get-task.test.ts`
2. **Primitive tests** → `tests/unit/getTask.test.ts`
3. **Primitive** → `src/tools/primitives/getTask.ts`
4. **Definition** → `src/tools/definitions/getTask.ts`
5. **Register** in `src/server.ts`

### Phase 3: set_planned_date

1. **Contract tests** → `tests/contract/set-planned-date.test.ts`
2. **Primitive tests** → `tests/unit/setPlannedDate.test.ts`
3. **Primitive** → `src/tools/primitives/setPlannedDate.ts`
4. **Definition** → `src/tools/definitions/setPlannedDate.ts`
5. **Register** in `src/server.ts`

### Phase 4: append_note

1. **Contract tests** → `tests/contract/append-note.test.ts`
2. **Primitive tests** → `tests/unit/appendNote.test.ts`
3. **Primitive** → `src/tools/primitives/appendNote.ts`
4. **Definition** → `src/tools/definitions/appendNote.ts`
5. **Register** in `src/server.ts`

## TDD Workflow

```bash
# 1. Start watch mode
pnpm test:watch

# 2. Write failing test (RED)
# 3. Run test - should FAIL
# 4. Write minimum implementation (GREEN)
# 5. Run test - should PASS
# 6. Refactor while keeping tests green
```

## Key Patterns

### OmniJS Script Generation

```typescript
// In primitive
const script = `(function() {
  try {
    var task = Task.byIdentifier("${escapeForJS(id)}");
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found" });
    }
    return JSON.stringify({ success: true, task: { id: task.id.primaryKey, name: task.name } });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
```

### Task Status Mapping

```typescript
// OmniJS returns Task.Status enum
// Map to string values for JSON response
const statusMap: Record<number, string> = {
  [Task.Status.Available]: 'Available',
  [Task.Status.Blocked]: 'Blocked',
  [Task.Status.Completed]: 'Completed',
  [Task.Status.Dropped]: 'Dropped',
  [Task.Status.DueSoon]: 'DueSoon',
  [Task.Status.Next]: 'Next',
  [Task.Status.Overdue]: 'Overdue'
};
```

### Filter Generation Pattern

```javascript
// In OmniJS script - Complete filter implementation
var tasks = flattenedTasks;
var filtered = tasks.filter(function(t) {
  // 1. includeCompleted filter (applied to ALL queries)
  if (!includeCompleted && (t.taskStatus === Task.Status.Completed || t.taskStatus === Task.Status.Dropped)) {
    return false;
  }

  // 2. Status filter (OR logic - match ANY status)
  // Empty array means no filter (return all statuses)
  if (statusValues && statusValues.length > 0) {
    var statusMap = {
      'Available': Task.Status.Available,
      'Blocked': Task.Status.Blocked,
      'Completed': Task.Status.Completed,
      'Dropped': Task.Status.Dropped,
      'DueSoon': Task.Status.DueSoon,
      'Next': Task.Status.Next,
      'Overdue': Task.Status.Overdue
    };
    var matchesStatus = statusValues.some(function(s) {
      return t.taskStatus === statusMap[s];
    });
    if (!matchesStatus) return false;
  }

  // 3. Project filter (ID takes precedence)
  if (projectId) {
    if (!t.containingProject || t.containingProject.id.primaryKey !== projectId) {
      return false;
    }
  } else if (projectName) {
    if (!t.containingProject || t.containingProject.name !== projectName) {
      return false;
    }
  }

  // 4. Tag filter - empty arrays mean no filter
  var allTagIds = (tagIds || []).concat(resolvedTagIds || []);
  if (allTagIds.length > 0) {
    var taskTagIds = t.tags.map(function(tag) { return tag.id.primaryKey; });
    if (tagFilterMode === 'all') {
      // AND logic - must have ALL tags
      var hasAll = allTagIds.every(function(tid) {
        return taskTagIds.indexOf(tid) !== -1;
      });
      if (!hasAll) return false;
    } else {
      // 'any' mode (default) - OR logic - must have ANY tag
      var hasAny = allTagIds.some(function(tid) {
        return taskTagIds.indexOf(tid) !== -1;
      });
      if (!hasAny) return false;
    }
  }

  // 5. Date filters - INCLUSIVE boundaries, null dates EXCLUDED
  // Due date range
  if (dueAfter) {
    if (!t.dueDate) return false; // null dates excluded
    if (t.dueDate.getTime() < new Date(dueAfter).getTime()) return false;
  }
  if (dueBefore) {
    if (!t.dueDate) return false; // null dates excluded
    if (t.dueDate.getTime() > new Date(dueBefore).getTime()) return false;
  }

  // Planned date filters (v4.7+ only, otherwise skip)
  if (app.userVersion.atLeast(new Version("4.7"))) {
    if (plannedAfter) {
      if (!t.plannedDate) return false;
      if (t.plannedDate.getTime() < new Date(plannedAfter).getTime()) return false;
    }
    if (plannedBefore) {
      if (!t.plannedDate) return false;
      if (t.plannedDate.getTime() > new Date(plannedBefore).getTime()) return false;
    }
  }
  // On < v4.7, plannedBefore/After filters are silently ignored

  return true;
});

// 6. Apply limit (post-filter)
if (limit && filtered.length > limit) {
  filtered = filtered.slice(0, limit);
}
```

### Disambiguation Pattern

```typescript
// In primitive - when name lookup returns multiple
if (matchingTasks.length > 1) {
  return {
    success: false,
    error: `Multiple tasks found with name "${name}"`,
    code: 'DISAMBIGUATION_REQUIRED',
    matchingIds: matchingTasks.map(t => t.id)
  };
}
```

## Testing Patterns

### Contract Test

```typescript
import { describe, it, expect } from 'vitest';
import { ListTasksInputSchema } from '../contracts/list-tasks.js';

describe('ListTasksInputSchema', () => {
  it('should accept valid filters', () => {
    const result = ListTasksInputSchema.safeParse({
      projectId: 'abc123',
      tagIds: ['tag1', 'tag2'],
      flagged: true
    });
    expect(result.success).toBe(true);
  });

  it('should use default values', () => {
    const result = ListTasksInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeCompleted).toBe(false);
      expect(result.data.tagFilterMode).toBe('any');
      expect(result.data.limit).toBe(100);
    }
  });
});
```

### Primitive Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listTasks } from '../src/tools/primitives/listTasks.js';

vi.mock('../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

describe('listTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return tasks on success', async () => {
    const mockTasks = [{ id: 't1', name: 'Task 1', taskStatus: 'Available' }];
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({ success: true, tasks: mockTasks })
    );

    const result = await listTasks({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks).toHaveLength(1);
    }
  });
});
```

## Version Checking

```javascript
// OmniJS version check for plannedDate (set_planned_date tool)
(function() {
  try {
    // 1. Version check FIRST
    if (!app.userVersion.atLeast(new Version("4.7"))) {
      return JSON.stringify({
        success: false,
        error: "Planned date requires OmniFocus v4.7 or later"
      });
    }

    var task = Task.byIdentifier("taskIdHere");
    if (!task) {
      return JSON.stringify({
        success: false,
        error: "Task 'taskIdHere' not found"
      });
    }

    // 2. Attempt set (may fail if database not migrated)
    task.plannedDate = new Date("2024-12-25");

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: task.name
    });
  } catch (e) {
    // 3. Catch migration errors
    var msg = e.message || String(e);
    if (msg.toLowerCase().includes("migration") || msg.toLowerCase().includes("planned")) {
      return JSON.stringify({
        success: false,
        error: "Planned date requires database migration. Please open OmniFocus preferences to migrate."
      });
    }
    return JSON.stringify({
      success: false,
      error: msg
    });
  }
})();
```

## Common Issues

### Empty Script Results

OmniJS errors often produce empty output. Always wrap in try-catch:

```javascript
(function() {
  try {
    // ... logic ...
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### Date Handling

OmniFocus uses local time. Use explicit ISO 8601:

```javascript
// Setting date
task.dueDate = new Date("2024-12-25T17:00:00");

// Getting date as ISO string
var isoDate = task.dueDate ? task.dueDate.toISOString() : null;
```

### String Escaping

Always escape user input for OmniJS:

```typescript
const escapeForJS = (str: string): string =>
  str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
```
