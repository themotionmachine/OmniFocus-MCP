# Phase 4: Project Management - Quickstart

## Development Environment

### Prerequisites

- Node.js 24+
- pnpm (package manager)
- OmniFocus Pro 3.0+ (core functionality)
- OmniFocus Pro 3.5+ (for `estimatedMinutes`)
- OmniFocus Pro 3.6+ (for `shouldUseFloatingTimeZone`)
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
specs/004-project-management/
├── spec.md               # Feature specification
├── plan.md               # Implementation plan
├── research.md           # OmniJS Project API research
├── data-model.md         # Data model documentation
├── quickstart.md         # This file
├── contracts/            # Zod schema contracts
│   ├── index.ts          # Main exports
│   ├── shared/           # Shared types
│   │   ├── index.ts
│   │   ├── project.ts    # Project entity schemas
│   │   └── disambiguation.ts
│   ├── list-projects.ts
│   ├── get-project.ts
│   ├── create-project.ts
│   ├── edit-project.ts
│   ├── delete-project.ts
│   └── move-project.ts
└── checklists/           # Implementation checklists
```

## Implementation Order

### Phase 1: list_projects

1. **Contract tests** → `tests/contract/project-tools/list-projects.test.ts`
2. **Primitive tests** → `tests/unit/project-tools/listProjects.test.ts`
3. **Primitive** → `src/tools/primitives/listProjects.ts`
4. **Definition** → `src/tools/definitions/listProjects.ts`
5. **Register** in `src/server.ts`

### Phase 2: get_project

1. **Contract tests** → `tests/contract/project-tools/get-project.test.ts`
2. **Primitive tests** → `tests/unit/project-tools/getProject.test.ts`
3. **Primitive** → `src/tools/primitives/getProject.ts`
4. **Definition** → `src/tools/definitions/getProject.ts`
5. **Register** in `src/server.ts`

### Phase 3: create_project

1. **Contract tests** → `tests/contract/project-tools/create-project.test.ts`
2. **Primitive tests** → `tests/unit/project-tools/createProject.test.ts`
3. **Primitive** → `src/tools/primitives/createProject.ts`
4. **Definition** → `src/tools/definitions/createProject.ts`
5. **Register** in `src/server.ts`

### Phase 4: edit_project

1. **Contract tests** → `tests/contract/project-tools/edit-project.test.ts`
2. **Primitive tests** → `tests/unit/project-tools/editProject.test.ts`
3. **Primitive** → `src/tools/primitives/editProject.ts`
4. **Definition** → `src/tools/definitions/editProject.ts`
5. **Register** in `src/server.ts`

### Phase 5: delete_project

1. **Contract tests** → `tests/contract/project-tools/delete-project.test.ts`
2. **Primitive tests** → `tests/unit/project-tools/deleteProject.test.ts`
3. **Primitive** → `src/tools/primitives/deleteProject.ts`
4. **Definition** → `src/tools/definitions/deleteProject.ts`
5. **Register** in `src/server.ts`

### Phase 6: move_project

1. **Contract tests** → `tests/contract/project-tools/move-project.test.ts`
2. **Primitive tests** → `tests/unit/project-tools/moveProject.test.ts`
3. **Primitive** → `src/tools/primitives/moveProject.ts`
4. **Definition** → `src/tools/definitions/moveProject.ts`
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
    var project = Project.byIdentifier("${escapeForJS(id)}");
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }
    return JSON.stringify({
      success: true,
      project: {
        id: project.id.primaryKey,
        name: project.name,
        status: getStatusString(project)
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
```

### Project Status Mapping

```javascript
// OmniJS → JSON String (output)
function getStatusString(project) {
  var statusMap = {};
  statusMap[Project.Status.Active] = 'Active';
  statusMap[Project.Status.OnHold] = 'OnHold';
  statusMap[Project.Status.Done] = 'Done';
  statusMap[Project.Status.Dropped] = 'Dropped';
  var str = statusMap[project.status];
  if (!str) {
    throw new Error('Unknown project status: ' + project.status);
  }
  return str;
}

// JSON String → OmniJS (input)
function getStatusEnum(statusStr) {
  var map = {
    'Active': Project.Status.Active,
    'OnHold': Project.Status.OnHold,
    'Done': Project.Status.Done,
    'Dropped': Project.Status.Dropped
  };
  var val = map[statusStr];
  if (val === undefined) {
    throw new Error('Invalid status: ' + statusStr + '. Expected: Active, OnHold, Done, Dropped');
  }
  return val;
}
```

**Note**: Unknown/invalid status values throw errors (fail-fast) rather than
silently defaulting. This ensures data integrity.

### Project Type Derivation

```javascript
// Derive projectType from sequential and containsSingletonActions
function getProjectType(project) {
  if (project.containsSingletonActions) return 'single-actions';
  if (project.sequential) return 'sequential';
  return 'parallel';
}
```

### Project Type Auto-Clear Pattern

**This pattern is unique to Phase 4** - no similar mutual exclusion exists in
Phase 1 (folders), Phase 2 (tags), or Phase 3 (tasks).

#### Precedence: `containsSingletonActions` Wins

When both `sequential: true` AND `containsSingletonActions: true` are provided,
`containsSingletonActions` wins (last processed). Use separate `if` statements:

```javascript
// CORRECT: Separate if statements - containsSingletonActions wins if both provided
if (params.sequential === true) {
  project.containsSingletonActions = false;
  project.sequential = true;
}
if (params.containsSingletonActions === true) {
  project.sequential = false;  // Auto-clears the previous setting
  project.containsSingletonActions = true;
}
```

**Silent behavior**: No error response, no warning. Success response contains only
`success: true`, `id`, `name`. Users discover actual state via `get_project`.

#### Setting to False (No Auto-Clear)

Setting a property to `false` does NOT auto-set the other property:

```javascript
// Setting to false - no auto-clear occurs
if (params.sequential === false) {
  project.sequential = false;
  // containsSingletonActions is NOT touched
}
if (params.containsSingletonActions === false) {
  project.containsSingletonActions = false;
  // sequential is NOT touched
}
```

#### Omitting Parameters (edit_project)

- Both omitted: Project type preserved
- One provided: Only that property changes; auto-clear only if setting `true`

#### Complete Implementation Pattern

```javascript
// Full project type handling for create/edit
function applyProjectType(project, params) {
  // Only process explicitly provided values
  if (params.sequential === true) {
    project.containsSingletonActions = false;
    project.sequential = true;
  } else if (params.sequential === false) {
    project.sequential = false;
  }

  if (params.containsSingletonActions === true) {
    project.sequential = false;  // Auto-clear (precedence)
    project.containsSingletonActions = true;
  } else if (params.containsSingletonActions === false) {
    project.containsSingletonActions = false;
  }
  // Omitted parameters: no change to project
}
```

This is **application logic**, not Zod validation. Schemas intentionally allow
both=true; auto-clear handles it at runtime.

### Filter Generation Pattern (list_projects)

```javascript
// In OmniJS script
var projects = flattenedProjects;
var filtered = projects.filter(function(p) {
  // 1. includeCompleted filter
  if (!includeCompleted) {
    if (p.status === Project.Status.Done || p.status === Project.Status.Dropped) {
      return false;
    }
  }

  // 2. Status filter (OR logic)
  if (statusValues && statusValues.length > 0) {
    var matchesStatus = statusValues.some(function(s) {
      return p.status === getStatusEnum(s);
    });
    if (!matchesStatus) return false;
  }

  // 3. Folder filter (recursive)
  if (folderId) {
    var inFolder = false;
    var parent = p.parentFolder;
    while (parent) {
      if (parent.id.primaryKey === folderId) {
        inFolder = true;
        break;
      }
      parent = parent.parentFolder;
    }
    if (!inFolder) return false;
  }

  // 4. Review status filter
  // Note: 'any' filter (or reviewStatus not specified) = no filtering = include ALL projects
  // 'any' includes projects WITH and WITHOUT reviewInterval, regardless of nextReviewDate value
  if (reviewStatus === 'due') {
    // nextReviewDate <= today (today at midnight local time)
    // Boundary: nextReviewDate = exactly today → INCLUDED in 'due'
    if (!p.nextReviewDate) return false;  // Exclude projects without review schedule
    var today = new Date();
    today.setHours(0, 0, 0, 0);  // Midnight local time = start of today
    if (p.nextReviewDate > today) return false;
  } else if (reviewStatus === 'upcoming') {
    // today < nextReviewDate <= today+7 days (7-day boundary is INCLUSIVE)
    // Boundary: nextReviewDate = exactly today → EXCLUDED (handled by 'due')
    // Boundary: nextReviewDate = exactly today+7 → INCLUDED in 'upcoming'
    if (!p.nextReviewDate) return false;  // Exclude projects without review schedule
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var sevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (p.nextReviewDate <= today || p.nextReviewDate > sevenDays) return false;
  }
  // reviewStatus === 'any' or undefined: no filtering - continue to next filter

  // 5. Date filters (inclusive, null excluded)
  if (dueAfter) {
    if (!p.dueDate) return false;
    if (p.dueDate.getTime() < new Date(dueAfter).getTime()) return false;
  }
  if (dueBefore) {
    if (!p.dueDate) return false;
    if (p.dueDate.getTime() > new Date(dueBefore).getTime()) return false;
  }

  return true;
});

// Apply limit (post-filter)
if (limit && filtered.length > limit) {
  filtered = filtered.slice(0, limit);
}
```

### Efficient Filtering Guidance

**Performance Best Practice**: Filter BEFORE serialization.

- All filtering logic should execute within the OmniJS script (shown above)
- Do NOT transfer entire database to Node.js then filter
- OmniJS runs inside OmniFocus process - filtering there is fast
- JSON serialization is expensive - serialize only the filtered results

**Why this matters**:

- Database with 1,000 projects: filtering in OmniJS = ~50ms, full transfer = ~500ms
- Reduces memory usage in Node.js process
- Matches SC-001 requirement: <2 seconds for 1,000 projects

### Disambiguation Pattern

```typescript
// In primitive - when name lookup returns multiple
var matches = flattenedProjects.filter(function(p) {
  return p.name === targetName;
});

if (matches.length === 0) {
  return JSON.stringify({
    success: false,
    error: "Project '" + targetName + "' not found"
  });
}

if (matches.length > 1) {
  return JSON.stringify({
    success: false,
    error: "Multiple projects found with name '" + targetName + "'. Found " + matches.length + " matches.",
    code: 'DISAMBIGUATION_REQUIRED',
    matchingIds: matches.map(function(p) { return p.id.primaryKey; })
  });
}

var project = matches[0];
```

### Review Interval Pattern

```javascript
// Setting review interval (value object semantics)
project.reviewInterval = { steps: 2, unit: 'weeks' };

// Clearing review interval
project.reviewInterval = null;

// Reading review interval
var interval = project.reviewInterval;
if (interval) {
  console.log(interval.steps + ' ' + interval.unit);
}
```

### Moving Projects

```javascript
// Move to folder
var project = Project.byIdentifier(projectId);
var folder = Folder.byIdentifier(folderId);
moveSections([project], folder);

// Move to root
moveSections([project], library.ending);

// Move with position
moveSections([project], folder.beginning);
moveSections([project], folder.ending);

// Move relative to sibling
var sibling = flattenedProjects.byName(siblingName);
moveSections([project], sibling.before);
moveSections([project], sibling.after);
```

### Deleting Projects (Cascade)

```javascript
// Delete project (cascades to all child tasks)
var project = Project.byIdentifier(projectId);
if (project) {
  var taskCount = project.flattenedTasks.length;
  var name = project.name;
  deleteObject(project);
  // project and all tasks are now deleted
}
```

## Testing Patterns

### Contract Test

```typescript
import { describe, it, expect } from 'vitest';
import { ListProjectsInputSchema } from '../contracts/list-projects.js';

describe('ListProjectsInputSchema', () => {
  it('should accept valid filters', () => {
    const result = ListProjectsInputSchema.safeParse({
      folderId: 'folder123',
      status: ['Active', 'OnHold'],
      flagged: true
    });
    expect(result.success).toBe(true);
  });

  it('should use default values', () => {
    const result = ListProjectsInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeCompleted).toBe(false);
      expect(result.data.reviewStatus).toBe('any');
      expect(result.data.limit).toBe(100);
    }
  });

  it('should reject invalid status values', () => {
    const result = ListProjectsInputSchema.safeParse({
      status: ['active'] // lowercase is invalid
    });
    expect(result.success).toBe(false);
  });
});
```

### Primitive Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listProjects } from '../src/tools/primitives/listProjects.js';

vi.mock('../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

describe('listProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return projects on success', async () => {
    const mockProjects = [{
      id: 'p1',
      name: 'Project 1',
      status: 'Active',
      projectType: 'parallel'
    }];
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({ success: true, projects: mockProjects })
    );

    const result = await listProjects({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(1);
    }
  });

  it('should handle folder filter', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({ success: true, projects: [] })
    );

    await listProjects({ folderId: 'folder123' });

    const scriptCall = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptCall).toContain('folder123');
  });
});
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
project.dueDate = new Date("2024-12-25T17:00:00");

// Getting date as ISO string
var isoDate = project.dueDate ? project.dueDate.toISOString() : null;
```

### String Escaping

Always escape user input for OmniJS:

```typescript
const escapeForJS = (str: string): string =>
  str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
```

### Project Type Mutual Exclusion

Never set both `sequential` and `containsSingletonActions` to true:

```javascript
// WRONG - don't do this
project.sequential = true;
project.containsSingletonActions = true; // undefined behavior

// CORRECT - auto-clear pattern
if (setSequential) {
  project.containsSingletonActions = false;
  project.sequential = true;
}
```

### Review Interval Value Object

**CRITICAL**: ReviewInterval is a **value object** - when you read it, you get a COPY,
not a reference to the internal data.

```javascript
// WRONG - this doesn't work!
project.reviewInterval.steps = 14; // changes local copy only
// Why it fails: project.reviewInterval returns a COPY of the object.
// Modifying the copy has no effect on the project's actual reviewInterval.

// CORRECT - reassign the entire object
project.reviewInterval = { steps: 14, unit: 'days' };
// Why it works: Assignment triggers OmniFocus to update the project's
// internal reviewInterval AND recalculate nextReviewDate.

// CORRECT - clearing the review schedule
project.reviewInterval = null;
// Effect: nextReviewDate becomes null, lastReviewDate is preserved
```

**Why value object semantics matter**: OmniFocus uses value objects for immutability
and to trigger recalculation of dependent properties (like nextReviewDate). Always
create a new object and assign it; never mutate properties on a retrieved copy.

### Cascade Delete Warning

Deleting a project deletes all tasks within it:

```javascript
// This deletes the project AND all its tasks
deleteObject(project);
// There is no undo from script - warn users appropriately
```

## Version Checking

```javascript
// Check for floating timezone support (v3.6+)
if (app.userVersion.atLeast(new Version("3.6"))) {
  project.shouldUseFloatingTimeZone = true;
}

// Check for estimated minutes (v3.5+ macOS only)
// Note: MCP server runs on macOS, so platform check not needed
if (app.userVersion.atLeast(new Version("3.5"))) {
  project.estimatedMinutes = 60;
}
```

## Contract Sync

When implementation begins, copy contracts from spec to source:

```bash
# Copy contracts to runtime location
cp -r specs/004-project-management/contracts/* src/contracts/project-tools/
```

The spec location (`specs/004-project-management/contracts/`) is the source of truth.
