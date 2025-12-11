# Quickstart: Tag Management Tools Development

**Feature**: 003-tag-management
**Date**: 2025-12-10

## Prerequisites

```bash
# Ensure dependencies installed
pnpm install

# Verify build works
pnpm build

# Run tests in watch mode (TDD)
pnpm test:watch
```

## File Creation Order

Follow this order to satisfy import dependencies:

### 1. Contracts (src/contracts/tag-tools/)

```bash
# Create directory structure
mkdir -p src/contracts/tag-tools/shared

# Create shared types first
touch src/contracts/tag-tools/shared/tag.ts
touch src/contracts/tag-tools/shared/position.ts
touch src/contracts/tag-tools/shared/disambiguation.ts
touch src/contracts/tag-tools/shared/index.ts

# Create tool contracts
touch src/contracts/tag-tools/list-tags.ts
touch src/contracts/tag-tools/create-tag.ts
touch src/contracts/tag-tools/edit-tag.ts
touch src/contracts/tag-tools/delete-tag.ts
touch src/contracts/tag-tools/assign-tags.ts
touch src/contracts/tag-tools/remove-tags.ts
touch src/contracts/tag-tools/index.ts
```

### 2. Tests (TDD - Write First!)

```bash
# Create test directories
mkdir -p tests/contract/tag-tools
mkdir -p tests/unit/tag-tools

# Contract tests (verify schemas)
touch tests/contract/tag-tools/list-tags.test.ts
touch tests/contract/tag-tools/create-tag.test.ts
# ... etc

# Unit tests (verify primitives)
touch tests/unit/tag-tools/listTags.test.ts
touch tests/unit/tag-tools/createTag.test.ts
# ... etc
```

### 3. Primitives (src/tools/primitives/)

```bash
touch src/tools/primitives/listTags.ts
touch src/tools/primitives/createTag.ts
touch src/tools/primitives/editTag.ts
touch src/tools/primitives/deleteTag.ts
touch src/tools/primitives/assignTags.ts
touch src/tools/primitives/removeTags.ts
```

### 4. Definitions (src/tools/definitions/)

```bash
touch src/tools/definitions/listTags.ts
touch src/tools/definitions/createTag.ts
touch src/tools/definitions/editTag.ts
touch src/tools/definitions/deleteTag.ts
touch src/tools/definitions/assignTags.ts
touch src/tools/definitions/removeTags.ts
```

## Code Templates

### Contract Template (list-tags.ts)

```typescript
/**
 * list_tags - Zod Schema Contract
 * @see spec.md FR-001 to FR-006
 * Zod version: 4.1.x
 */
import { z } from 'zod';
import { TagSchema, type Tag } from './shared/index.js';

export { TagSchema, type Tag };

export const ListTagsInputSchema = z.object({
  status: z.enum(['active', 'onHold', 'dropped']).optional(),
  parentId: z.string().optional(),
  includeChildren: z.boolean().default(true)
});

export type ListTagsInput = z.infer<typeof ListTagsInputSchema>;

export const ListTagsSuccessSchema = z.object({
  success: z.literal(true),
  tags: z.array(TagSchema)
});

export const ListTagsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export const ListTagsResponseSchema = z.discriminatedUnion('success', [
  ListTagsSuccessSchema,
  ListTagsErrorSchema
]);

export type ListTagsResponse = z.infer<typeof ListTagsResponseSchema>;
```

### Primitive Template (listTags.ts)

```typescript
import type { z } from 'zod';
import type { Tag, ListTagsInputSchema } from '../../contracts/tag-tools/list-tags.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

type ListTagsParams = z.input<typeof ListTagsInputSchema>;

export type ListTagsSuccessResponse = { success: true; tags: Tag[] };
export type ListTagsErrorResponse = { success: false; error: string };
export type ListTagsResponse = ListTagsSuccessResponse | ListTagsErrorResponse;

function generateOmniScript(params: ListTagsParams): string {
  const { status, parentId, includeChildren = true } = params;

  const escapeForJS = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const parentIdEscaped = parentId ? escapeForJS(parentId) : '';
  const statusFilter = status ? escapeForJS(status) : '';

  return `(function() {
  try {
    var parentId = "${parentIdEscaped}";
    var statusFilter = "${statusFilter}";
    var includeChildren = ${includeChildren};
    var tags = [];
    var sourceTags;

    // Map status to string
    function mapStatus(tag) {
      if (tag.status === Tag.Status.OnHold) return "onHold";
      if (tag.status === Tag.Status.Dropped) return "dropped";
      return "active";
    }

    // Determine source based on parentId and includeChildren
    if (parentId && parentId.length > 0) {
      var parentTag = Tag.byIdentifier(parentId);
      if (!parentTag) {
        return JSON.stringify({
          success: false,
          error: "Invalid parentId '" + parentId + "': tag not found"
        });
      }
      sourceTags = includeChildren ? parentTag.flattenedTags : parentTag.tags;
    } else {
      sourceTags = includeChildren ? flattenedTags : tags;
    }

    // Process tags
    sourceTags.forEach(function(tag) {
      var tagStatus = mapStatus(tag);
      if (statusFilter && statusFilter.length > 0 && tagStatus !== statusFilter) {
        return;
      }
      tags.push({
        id: tag.id.primaryKey,
        name: tag.name,
        status: tagStatus,
        parentId: tag.parent ? tag.parent.id.primaryKey : null,
        allowsNextAction: tag.allowsNextAction,
        taskCount: tag.remainingTasks.length
      });
    });

    return JSON.stringify({ success: true, tags: tags });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

export async function listTags(params: ListTagsParams = {}): Promise<ListTagsResponse> {
  const script = generateOmniScript(params);
  const tempFile = writeSecureTempFile(script, 'list_tags', '.js');

  try {
    const rawResult = await executeOmniFocusScript(tempFile.path);
    // Validate response structure at runtime (no type assertions)
    if (typeof rawResult !== 'object' || rawResult === null) {
      return { success: false, error: 'Invalid script response' };
    }
    if (!('success' in rawResult)) {
      return { success: false, error: 'Missing success field in response' };
    }
    // Type narrowing via runtime check
    if (rawResult.success === true && 'tags' in rawResult) {
      return { success: true, tags: rawResult.tags as Tag[] };
    }
    if (rawResult.success === false && 'error' in rawResult) {
      return { success: false, error: String(rawResult.error) };
    }
    return { success: false, error: 'Unexpected response format' };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  } finally {
    tempFile.cleanup();
  }
}
```

### Definition Template (listTags.ts)

```typescript
import { ListTagsInputSchema } from '../../contracts/tag-tools/list-tags.js';
import { listTags } from '../primitives/listTags.js';

export const schema = ListTagsInputSchema;

export async function handler(params: unknown) {
  const parseResult = ListTagsInputSchema.safeParse(params);

  if (!parseResult.success) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: false,
          error: parseResult.error.issues
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')
        })
      }],
      isError: true
    };
  }

  const result = await listTags(parseResult.data);

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(result)
    }],
    isError: !result.success
  };
}
```

### Contract Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { ListTagsInputSchema } from '../../../src/contracts/tag-tools/list-tags.js';

describe('ListTagsInputSchema', () => {
  it('should accept empty input (all defaults)', () => {
    const result = ListTagsInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeChildren).toBe(true);
    }
  });

  it('should accept valid status filter', () => {
    const result = ListTagsInputSchema.safeParse({ status: 'onHold' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = ListTagsInputSchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });
});
```

### Unit Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listTags } from '../../../src/tools/primitives/listTags.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

vi.mock('../../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/test.js',
    cleanup: vi.fn()
  }))
}));

import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

describe('listTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return tags on success', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue({
      success: true,
      tags: [{ id: 't1', name: 'Test', status: 'active', parentId: null, allowsNextAction: true, taskCount: 5 }]
    });

    const result = await listTags({});
    expect(result.success).toBe(true);
  });

  it('should return error on script failure', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue({
      success: false,
      error: 'Script error'
    });

    const result = await listTags({});
    expect(result.success).toBe(false);
  });
});
```

## Server Registration

Add to `src/server.ts`:

```typescript
import { schema as listTagsSchema, handler as listTagsHandler } from './tools/definitions/listTags.js';
import { schema as createTagSchema, handler as createTagHandler } from './tools/definitions/createTag.js';
import { schema as editTagSchema, handler as editTagHandler } from './tools/definitions/editTag.js';
import { schema as deleteTagSchema, handler as deleteTagHandler } from './tools/definitions/deleteTag.js';
import { schema as assignTagsSchema, handler as assignTagsHandler } from './tools/definitions/assignTags.js';
import { schema as removeTagsSchema, handler as removeTagsHandler } from './tools/definitions/removeTags.js';

// In tool registration section:
server.tool('list_tags', listTagsSchema, listTagsHandler);
server.tool('create_tag', createTagSchema, createTagHandler);
server.tool('edit_tag', editTagSchema, editTagHandler);
server.tool('delete_tag', deleteTagSchema, deleteTagHandler);
server.tool('assign_tags', assignTagsSchema, assignTagsHandler);
server.tool('remove_tags', removeTagsSchema, removeTagsHandler);
```

## TDD Workflow

For each tool, follow this cycle:

1. **RED**: Write contract test → Run `pnpm test` → Verify FAIL
2. **RED**: Write unit test → Run `pnpm test` → Verify FAIL
3. **GREEN**: Implement contract → Tests should start passing
4. **GREEN**: Implement primitive → Unit tests pass
5. **GREEN**: Implement definition → Integration works
6. **REFACTOR**: Clean up while keeping tests green
7. **VERIFY**: Manual test in OmniFocus Script Editor

## Common OmniJS Patterns

### Find with Disambiguation

```javascript
// Find by ID first
var item = Tag.byIdentifier(identifier);
if (item) return { found: item };

// Fall back to name search
var matches = flattenedTags.filter(function(t) {
  return t.name === identifier;
});

if (matches.length === 0) {
  return { error: "Tag '" + identifier + "' not found" };
}
if (matches.length > 1) {
  return {
    error: "Ambiguous tag name '" + identifier + "'. Found " + matches.length + " matches.",
    code: "DISAMBIGUATION_REQUIRED",
    matchingIds: matches.map(function(t) { return t.id.primaryKey; })
  };
}
return { found: matches[0] };
```

### Status Mapping

```javascript
function mapStatus(tag) {
  if (tag.status === Tag.Status.OnHold) return "onHold";
  if (tag.status === Tag.Status.Dropped) return "dropped";
  return "active";
}

function parseStatus(str) {
  if (str === "onHold") return Tag.Status.OnHold;
  if (str === "dropped") return Tag.Status.Dropped;
  return Tag.Status.Active;
}
```

### Position Error Handling

When `relativeTo` references an invalid tag ID in position operations:

```javascript
// For create_tag position validation
function resolvePosition(position, parentId) {
  if (!position) {
    // Default: tags.ending (root level) or parentTag.ending
    if (parentId) {
      var parent = Tag.byIdentifier(parentId);
      if (!parent) {
        return { error: "Invalid parentId '" + parentId + "': tag not found" };
      }
      return { position: parent.ending };
    }
    return { position: tags.ending };
  }

  var placement = position.placement;
  var relativeTo = position.relativeTo;

  if (placement === "before" || placement === "after") {
    // relativeTo is REQUIRED - already validated by Zod
    var sibling = Tag.byIdentifier(relativeTo);
    if (!sibling) {
      return { error: "Invalid relativeTo '" + relativeTo + "': tag not found" };
    }
    return { position: placement === "before" ? sibling.before : sibling.after };
  }

  // beginning/ending - relativeTo is optional parent
  if (relativeTo) {
    var parent = Tag.byIdentifier(relativeTo);
    if (!parent) {
      return { error: "Invalid relativeTo '" + relativeTo + "': tag not found" };
    }
    return { position: placement === "beginning" ? parent.beginning : parent.ending };
  }

  // No relativeTo - use root level
  return { position: placement === "beginning" ? tags.beginning : tags.ending };
}
```

### Batch Operation Template (assignTags.ts)

```javascript
(function() {
  try {
    var taskIds = [/* injected from TypeScript */];
    var tagIds = [/* injected from TypeScript */];
    var results = [];

    // Helper: find tag by ID or name with disambiguation
    function findTag(identifier) {
      var tag = Tag.byIdentifier(identifier);
      if (tag) return { found: tag };

      var matches = flattenedTags.filter(function(t) {
        return t.name === identifier;
      });

      if (matches.length === 0) {
        return { error: "Tag '" + identifier + "' not found" };
      }
      if (matches.length > 1) {
        return {
          error: "Ambiguous tag name '" + identifier + "'. Found " + matches.length + " matches.",
          code: "DISAMBIGUATION_REQUIRED",
          matchingIds: matches.map(function(t) { return t.id.primaryKey; })
        };
      }
      return { found: matches[0] };
    }

    // Helper: find task by ID or name with disambiguation
    function findTask(identifier) {
      var task = Task.byIdentifier(identifier);
      if (task) return { found: task };

      var matches = flattenedTasks.filter(function(t) {
        return t.name === identifier;
      });

      if (matches.length === 0) {
        return { error: "Task '" + identifier + "' not found" };
      }
      if (matches.length > 1) {
        return {
          error: "Ambiguous task name '" + identifier + "'. Found " + matches.length + " matches.",
          code: "DISAMBIGUATION_REQUIRED",
          matchingIds: matches.map(function(t) { return t.id.primaryKey; })
        };
      }
      return { found: matches[0] };
    }

    // Resolve all tags first (fail fast on tag errors)
    var resolvedTags = [];
    for (var i = 0; i < tagIds.length; i++) {
      var tagResult = findTag(tagIds[i]);
      if (tagResult.error) {
        // Return tag resolution error at top level
        return JSON.stringify({
          success: false,
          error: tagResult.error,
          code: tagResult.code,
          matchingIds: tagResult.matchingIds
        });
      }
      resolvedTags.push(tagResult.found);
    }

    // Process each task - continue on individual failures
    for (var j = 0; j < taskIds.length; j++) {
      var taskIdentifier = taskIds[j];
      var taskResult = findTask(taskIdentifier);

      if (taskResult.error) {
        // Per-item error - continue processing other tasks
        results.push({
          taskId: taskIdentifier,
          taskName: "",
          success: false,
          error: taskResult.error,
          code: taskResult.code,
          matchingIds: taskResult.matchingIds
        });
        continue;
      }

      var task = taskResult.found;

      // Add all resolved tags to this task
      try {
        for (var k = 0; k < resolvedTags.length; k++) {
          task.addTag(resolvedTags[k]); // Idempotent - no error if already tagged
        }
        results.push({
          taskId: task.id.primaryKey,
          taskName: task.name,
          success: true
        });
      } catch (e) {
        results.push({
          taskId: task.id.primaryKey,
          taskName: task.name,
          success: false,
          error: e.message || String(e)
        });
      }
    }

    // Top-level success: true indicates batch completed (check per-item results)
    return JSON.stringify({ success: true, results: results });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### Batch Operation Template (removeTags.ts)

```javascript
(function() {
  try {
    var taskIds = [/* injected from TypeScript */];
    var tagIds = [/* injected from TypeScript, may be empty if clearAll */];
    var clearAll = false; // injected from TypeScript
    var results = [];

    // Helper functions (same as assignTags)
    function findTag(identifier) {
      var tag = Tag.byIdentifier(identifier);
      if (tag) return { found: tag };

      var matches = flattenedTags.filter(function(t) {
        return t.name === identifier;
      });

      if (matches.length === 0) {
        return { error: "Tag '" + identifier + "' not found" };
      }
      if (matches.length > 1) {
        return {
          error: "Ambiguous tag name '" + identifier + "'. Found " + matches.length + " matches.",
          code: "DISAMBIGUATION_REQUIRED",
          matchingIds: matches.map(function(t) { return t.id.primaryKey; })
        };
      }
      return { found: matches[0] };
    }

    function findTask(identifier) {
      var task = Task.byIdentifier(identifier);
      if (task) return { found: task };

      var matches = flattenedTasks.filter(function(t) {
        return t.name === identifier;
      });

      if (matches.length === 0) {
        return { error: "Task '" + identifier + "' not found" };
      }
      if (matches.length > 1) {
        return {
          error: "Ambiguous task name '" + identifier + "'. Found " + matches.length + " matches.",
          code: "DISAMBIGUATION_REQUIRED",
          matchingIds: matches.map(function(t) { return t.id.primaryKey; })
        };
      }
      return { found: matches[0] };
    }

    // Resolve tags if not clearAll
    var resolvedTags = [];
    if (!clearAll) {
      for (var i = 0; i < tagIds.length; i++) {
        var tagResult = findTag(tagIds[i]);
        if (tagResult.error) {
          return JSON.stringify({
            success: false,
            error: tagResult.error,
            code: tagResult.code,
            matchingIds: tagResult.matchingIds
          });
        }
        resolvedTags.push(tagResult.found);
      }
    }

    // Process each task
    for (var j = 0; j < taskIds.length; j++) {
      var taskIdentifier = taskIds[j];
      var taskResult = findTask(taskIdentifier);

      if (taskResult.error) {
        results.push({
          taskId: taskIdentifier,
          taskName: "",
          success: false,
          error: taskResult.error,
          code: taskResult.code,
          matchingIds: taskResult.matchingIds
        });
        continue;
      }

      var task = taskResult.found;

      try {
        if (clearAll) {
          task.clearTags(); // Remove ALL tags
        } else {
          for (var k = 0; k < resolvedTags.length; k++) {
            task.removeTag(resolvedTags[k]); // Idempotent - no error if not tagged
          }
        }
        results.push({
          taskId: task.id.primaryKey,
          taskName: task.name,
          success: true
        });
      } catch (e) {
        results.push({
          taskId: task.id.primaryKey,
          taskName: task.name,
          success: false,
          error: e.message || String(e)
        });
      }
    }

    return JSON.stringify({ success: true, results: results });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

## Advanced Test Templates

### Refine Validation Tests

```typescript
import { describe, it, expect } from 'vitest';
import { EditTagInputSchema } from '../../../src/contracts/tag-tools/edit-tag.js';

describe('EditTagInputSchema refine validations', () => {
  it('should reject when neither id nor name is provided', () => {
    const result = EditTagInputSchema.safeParse({
      newName: 'Updated Name'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('id');
      expect(result.error.issues[0].message).toBe('Either id or name must be provided');
    }
  });

  it('should reject when no update field is provided', () => {
    const result = EditTagInputSchema.safeParse({
      id: 'tag-123'
      // No newName, status, or allowsNextAction
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('newName');
      expect(result.error.issues[0].message).toContain('At least one update field');
    }
  });

  it('should accept valid input with id and newName', () => {
    const result = EditTagInputSchema.safeParse({
      id: 'tag-123',
      newName: 'Updated Name'
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid input with name and status', () => {
    const result = EditTagInputSchema.safeParse({
      name: 'MyTag',
      status: 'onHold'
    });
    expect(result.success).toBe(true);
  });
});
```

### Transform Tests

```typescript
import { describe, it, expect } from 'vitest';
import { CreateTagInputSchema } from '../../../src/contracts/tag-tools/create-tag.js';

describe('CreateTagInputSchema transform', () => {
  it('should trim whitespace from name', () => {
    const result = CreateTagInputSchema.safeParse({
      name: '  My Tag  '
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Tag');
    }
  });

  it('should reject whitespace-only name after trim', () => {
    const result = CreateTagInputSchema.safeParse({
      name: '   '
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // min(1) validation fires after trim
      expect(result.error.issues[0].path).toContain('name');
    }
  });

  it('should apply default for allowsNextAction', () => {
    const result = CreateTagInputSchema.safeParse({
      name: 'Test'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowsNextAction).toBe(true);
    }
  });
});
```

### Disambiguation Response Tests

```typescript
import { describe, it, expect } from 'vitest';
import { DisambiguationErrorSchema } from '../../../src/contracts/tag-tools/shared/disambiguation.js';

describe('DisambiguationErrorSchema', () => {
  it('should validate correct disambiguation error', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: "Ambiguous tag name 'Work'. Found 3 matches.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['tag-1', 'tag-2', 'tag-3']
    });
    expect(result.success).toBe(true);
  });

  it('should reject matchingIds with less than 2 items', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: "Ambiguous tag name 'Work'. Found 1 match.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['tag-1'] // Only 1 - not valid disambiguation
    });
    expect(result.success).toBe(false);
  });

  it('should reject wrong code value', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: 'Some error',
      code: 'WRONG_CODE',
      matchingIds: ['a', 'b']
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: true', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: true,
      error: 'test',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['a', 'b']
    });
    expect(result.success).toBe(false);
  });
});
```

### Batch Result Schema Tests

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import from shared (to be created)
const BatchItemResultSchema = z.object({
  taskId: z.string(),
  taskName: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
  code: z.string().optional(),
  matchingIds: z.array(z.string()).optional()
});

describe('BatchItemResultSchema', () => {
  it('should validate successful result', () => {
    const result = BatchItemResultSchema.safeParse({
      taskId: 'task-123',
      taskName: 'My Task',
      success: true
    });
    expect(result.success).toBe(true);
  });

  it('should validate failed result with error', () => {
    const result = BatchItemResultSchema.safeParse({
      taskId: 'task-123',
      taskName: 'My Task',
      success: false,
      error: "Tag 'missing' not found"
    });
    expect(result.success).toBe(true);
  });

  it('should validate disambiguation result', () => {
    const result = BatchItemResultSchema.safeParse({
      taskId: 'MyTask',
      taskName: '',
      success: false,
      error: "Ambiguous task name 'MyTask'. Found 2 matches.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task-1', 'task-2']
    });
    expect(result.success).toBe(true);
  });

  it('should not require error when success is true', () => {
    const result = BatchItemResultSchema.safeParse({
      taskId: 'task-123',
      taskName: 'My Task',
      success: true,
      error: undefined // Should be fine
    });
    expect(result.success).toBe(true);
  });
});

describe('Batch operation semantics', () => {
  it('should have results in same order as input taskIds', () => {
    // This is a behavioral test - verify in unit tests
    const inputTaskIds = ['task-a', 'task-b', 'task-c'];
    const results = [
      { taskId: 'task-a', taskName: 'A', success: true },
      { taskId: 'task-b', taskName: 'B', success: false, error: 'Not found' },
      { taskId: 'task-c', taskName: 'C', success: true }
    ];
    expect(results.map(r => r.taskId)).toEqual(inputTaskIds);
  });

  it('should allow top-level success with per-item failures', () => {
    const response = {
      success: true,
      results: [
        { taskId: 'task-a', taskName: 'A', success: true },
        { taskId: 'task-b', taskName: '', success: false, error: 'Not found' }
      ]
    };
    // Top-level success is about operation completion, not per-item success
    expect(response.success).toBe(true);
    expect(response.results.some(r => !r.success)).toBe(true);
  });
});
```

## Error Handling Patterns

### Error Handling Layers

The error handling flows through four layers, each with specific responsibilities:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Definition Layer                              │
│  - Zod safeParse for input validation                           │
│  - Transform primitive errors to MCP response format            │
│  - Set isError: true when response.success === false            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Primitive Layer                               │
│  - Return structured { success, ...data } or { success, error } │
│  - NEVER throw exceptions - always return error responses       │
│  - Preserve original error messages from OmniJS layer           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OmniJS Script Layer                           │
│  - MUST wrap all code in try-catch                              │
│  - MUST return JSON with success field                          │
│  - Use e.message || String(e) for error extraction              │
│  - NEVER swallow errors silently                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Transport Layer                               │
│  - Handled by scriptExecution.ts (existing patterns)            │
│  - OmniFocus not running, osascript timeout, syntax errors      │
│  - Empty results indicate silent failure                        │
└─────────────────────────────────────────────────────────────────┘
```

### Zod Validation Error Formatting

```typescript
// In definition handler
if (!parseResult.success) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: false,
        error: parseResult.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')
      })
    }],
    isError: true
  };
}
```

### Status Enum Validation Error

```typescript
// Zod enum automatically validates status values
// Error format: "status: Invalid enum value. Expected 'active' | 'onHold' | 'dropped', received 'invalid'"
status: z.enum(['active', 'onHold', 'dropped']).optional()
```

### OmniJS Error Pattern (Required)

```javascript
(function() {
  try {
    // All OmniJS logic here
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    // NEVER swallow errors - always return structured error
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### Silent Failure Detection

Empty OmniJS results indicate silent failure (syntax error or uncaught exception):

```typescript
// In primitive
const rawResult = await executeOmniFocusScript(tempFile.path);

// Detect silent failure
if (rawResult === undefined || rawResult === null || rawResult === '') {
  return {
    success: false,
    error: 'OmniJS script returned empty result (possible syntax error or silent failure). ' +
           'Test the script in OmniFocus Script Editor to diagnose.'
  };
}
```

### Transport Failure Detection

```typescript
// In primitive (scriptExecution.ts handles this)
try {
  const rawResult = await executeOmniFocusScript(tempFile.path);
  // ... process result
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  // Categorize transport errors
  if (errorMessage.includes('timeout')) {
    return { success: false, error: 'OmniJS script timed out. Large operations may need smaller batches.' };
  }
  if (errorMessage.includes('not running') || errorMessage.includes('Application not found')) {
    return { success: false, error: 'OmniFocus is not running. Please launch OmniFocus and retry.' };
  }

  return { success: false, error: errorMessage };
}
```

### Primitive Error Propagation

Primitives MUST preserve error context without losing information:

```typescript
export async function editTag(params: EditTagParams): Promise<EditTagResponse> {
  const script = generateOmniScript(params);
  const tempFile = writeSecureTempFile(script, 'edit_tag', '.js');

  try {
    const rawResult = await executeOmniFocusScript(tempFile.path);

    // Validate and narrow response type
    if (typeof rawResult !== 'object' || rawResult === null) {
      return { success: false, error: 'Invalid script response format' };
    }

    // Preserve OmniJS error messages exactly
    if (rawResult.success === false) {
      // Pass through disambiguation errors with full structure
      if (rawResult.code === 'DISAMBIGUATION_REQUIRED') {
        return {
          success: false,
          error: rawResult.error,
          code: rawResult.code,
          matchingIds: rawResult.matchingIds
        };
      }
      return { success: false, error: String(rawResult.error) };
    }

    return { success: true, id: rawResult.id, name: rawResult.name };
  } catch (error: unknown) {
    // Preserve original error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  } finally {
    tempFile.cleanup();
  }
}
```

## Verification Commands

```bash
# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test

# Coverage
pnpm test:coverage
```
