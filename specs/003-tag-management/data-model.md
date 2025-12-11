# Data Model: Tag Management Tools

**Feature**: 003-tag-management
**Date**: 2025-12-10
**Spec Reference**: [spec.md](./spec.md) FR-001 through FR-044

## Entity Definitions

### Tag Entity

Represents a contextual label in the OmniFocus tag hierarchy.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (`tag.id.primaryKey`) |
| name | string | Yes | Display name (`tag.name`) |
| status | enum | Yes | 'active' \| 'onHold' \| 'dropped' |
| parentId | string \| null | Yes | Parent tag ID (null for root-level) |
| allowsNextAction | boolean | Yes | Controls task availability in GTD workflow |
| taskCount | number | Yes | Count of incomplete tasks (`remainingTasks.length`) |

**Zod Schema** (`src/contracts/tag-tools/shared/tag.ts`):

```typescript
import { z } from 'zod';

export const TagSchema = z.object({
  id: z.string().describe("Tag's unique identifier"),
  name: z.string().describe("Tag's display name"),
  status: z.enum(['active', 'onHold', 'dropped'])
    .describe("Tag's current status"),
  parentId: z.string().nullable()
    .describe('Parent tag ID (null for root-level)'),
  allowsNextAction: z.boolean()
    .describe('Whether tasks with this tag can be next actions'),
  taskCount: z.number().int().min(0)
    .describe('Number of incomplete tasks assigned this tag')
});

export type Tag = z.infer<typeof TagSchema>;
```

### Tag.Status Enumeration

| Value | OmniJS Constant | Description |
|-------|-----------------|-------------|
| 'active' | `Tag.Status.Active` | Tag is active and visible |
| 'onHold' | `Tag.Status.OnHold` | Tag is paused (tasks may be hidden) |
| 'dropped' | `Tag.Status.Dropped` | Tag is archived/dropped |

### Position Schema

Shared positioning schema for tag creation (mirrors folder pattern).

**Zod Schema** (`src/contracts/tag-tools/shared/position.ts`):

```typescript
import { z } from 'zod';

export const TagPositionSchema = z.object({
  placement: z.enum(['before', 'after', 'beginning', 'ending'])
    .describe('Position relative to reference'),
  relativeTo: z.string().optional()
    .describe('Reference tag ID (sibling for before/after, parent for beginning/ending)')
}).refine(
  (data) => {
    // relativeTo REQUIRED for before/after, OPTIONAL for beginning/ending
    if (data.placement === 'before' || data.placement === 'after') {
      return data.relativeTo !== undefined && data.relativeTo.length > 0;
    }
    return true;
  },
  {
    message: "relativeTo is required for 'before' and 'after' placements",
    path: ['relativeTo']
  }
);

export type TagPosition = z.infer<typeof TagPositionSchema>;
```

**Position Error Messages**:

| Scenario | Error Message |
|----------|---------------|
| Invalid parentId | `"Invalid parentId '{id}': tag not found"` |
| Invalid relativeTo (before/after) | `"Invalid relativeTo '{id}': tag not found"` |
| Invalid relativeTo (beginning/ending) | `"Invalid relativeTo '{id}': tag not found"` |
| Missing relativeTo | `"relativeTo is required for 'before' and 'after' placements"` |

### Disambiguation Error Schema

Structured error for ambiguous name lookups (FR-038).

**Zod Schema** (`src/contracts/tag-tools/shared/disambiguation.ts`):

```typescript
import { z } from 'zod';

export const DisambiguationErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.literal('DISAMBIGUATION_REQUIRED'),
  matchingIds: z.array(z.string()).min(2)
});

export type DisambiguationError = z.infer<typeof DisambiguationErrorSchema>;
```

## Tool Contracts

### list_tags

**Purpose**: List tags with optional filtering (FR-001 to FR-006)

**Input Schema**:

```typescript
export const ListTagsInputSchema = z.object({
  status: z.enum(['active', 'onHold', 'dropped']).optional()
    .describe('Filter by tag status'),
  parentId: z.string().optional()
    .describe('Filter to children of this tag ID'),
  includeChildren: z.boolean().default(true)
    .describe('Include nested tags recursively')
});
```

**Success Response**:

```typescript
export const ListTagsSuccessSchema = z.object({
  success: z.literal(true),
  tags: z.array(TagSchema)
});
```

**Behavior Matrix**:

| parentId | includeChildren | Result |
|----------|-----------------|--------|
| omitted | true (default) | All tags via `flattenedTags` |
| omitted | false | Top-level only via `tags` |
| specified | true | All descendants via `parent.flattenedTags` |
| specified | false | Immediate children via `parent.tags` |

---

### create_tag

**Purpose**: Create a new tag with optional positioning (FR-007 to FR-013). Use this tool
for adding new tags to the taxonomy; use `edit_tag` to modify existing tag properties.

**Input Schema**:

```typescript
export const CreateTagInputSchema = z.object({
  name: z.string().min(1).transform(s => s.trim())
    .describe('Tag name (required, non-empty)'),
  parentId: z.string().optional()
    .describe('Parent tag ID for nested tags'),
  position: TagPositionSchema.optional()
    .describe('Insertion position'),
  allowsNextAction: z.boolean().default(true)
    .describe('Whether tasks can be next actions')
});
```

**Success Response**:

```typescript
export const CreateTagSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string(),
  name: z.string()
});
```

---

### edit_tag

**Purpose**: Modify existing tag properties such as name, status, or allowsNextAction
(FR-014 to FR-020). Does not support moving tags between parents (hierarchy changes);
use delete + create for that. When both `id` and `name` are provided, `id` takes
precedence and `name` is ignored.

**Input Schema**:

```typescript
export const EditTagInputSchema = z.object({
  // Identification (one required)
  id: z.string().optional()
    .describe('Tag ID (preferred)'),
  name: z.string().optional()
    .describe('Tag name (triggers disambiguation if multiple matches)'),

  // Update fields (at least one required)
  newName: z.string().min(1).transform(s => s.trim()).optional()
    .describe('New tag name'),
  status: z.enum(['active', 'onHold', 'dropped']).optional()
    .describe('New status'),
  allowsNextAction: z.boolean().optional()
    .describe('New allowsNextAction value')
}).refine(
  (data) => data.id !== undefined || data.name !== undefined,
  { message: 'Either id or name must be provided', path: ['id'] }
).refine(
  (data) => data.newName !== undefined || data.status !== undefined || data.allowsNextAction !== undefined,
  { message: 'At least one update field (newName, status, allowsNextAction) must be provided', path: ['newName'] }
);
```

**Success Response**:

```typescript
export const EditTagSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string(),
  name: z.string()
});
```

---

### delete_tag

**Purpose**: Permanently remove a tag and all its child tags recursively (FR-021 to FR-025).
Tasks that had the deleted tag are NOT deleted; only the tag reference is removed.
When both `id` and `name` are provided, `id` takes precedence and `name` is ignored.

**Input Schema**:

```typescript
export const DeleteTagInputSchema = z.object({
  id: z.string().optional()
    .describe('Tag ID (preferred)'),
  name: z.string().optional()
    .describe('Tag name (triggers disambiguation if multiple matches)')
}).refine(
  (data) => data.id !== undefined || data.name !== undefined,
  { message: 'Either id or name must be provided', path: ['id'] }
);
```

**Success Response**:

```typescript
export const DeleteTagSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string(),
  name: z.string()
});
```

---

### assign_tags

**Purpose**: Add tags to tasks (FR-026 to FR-031)

**Input Schema**:

```typescript
export const AssignTagsInputSchema = z.object({
  taskIds: z.array(z.string()).min(1)
    .describe('Task IDs or names to tag'),
  tagIds: z.array(z.string()).min(1)
    .describe('Tag IDs or names to assign')
});
```

**Success Response**:

```typescript
export const AssignTagsResultSchema = z.object({
  taskId: z.string(),
  taskName: z.string(),
  success: z.boolean(),
  error: z.string().optional()
});

export const AssignTagsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(AssignTagsResultSchema)
});
```

---

### remove_tags

**Purpose**: Remove specific tags from tasks, or clear all tags (FR-032 to FR-037).
Supports two modes: selective removal via `tagIds`, or clearing all tags via `clearAll: true`.
When `clearAll: true`, the `tagIds` parameter is ignored if provided.

**Input Schema**:

```typescript
export const RemoveTagsInputSchema = z.object({
  taskIds: z.array(z.string()).min(1)
    .describe('Task IDs or names'),
  tagIds: z.array(z.string()).optional()
    .describe('Tag IDs or names to remove (omit for clearTags)'),
  clearAll: z.boolean().default(false)
    .describe('Remove ALL tags from tasks')
}).refine(
  (data) => data.clearAll || (data.tagIds !== undefined && data.tagIds.length > 0),
  { message: 'Either tagIds or clearAll=true must be provided', path: ['tagIds'] }
).refine(
  (data) => !(data.clearAll && data.tagIds !== undefined && data.tagIds.length > 0),
  { message: 'Cannot specify both clearAll and tagIds. Use clearAll=true alone to remove all tags, or provide tagIds to remove specific tags', path: ['clearAll'] }
);
```

**Success Response**:

```typescript
export const RemoveTagsResultSchema = z.object({
  taskId: z.string(),
  taskName: z.string(),
  success: z.boolean(),
  error: z.string().optional()
});

export const RemoveTagsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(RemoveTagsResultSchema)
});
```

## Error Response Schema

All tools share a common error response format (FR-039):

```typescript
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string()
});
```

## Disambiguation Support by Tool

| Tool | Supports Name Lookup | Disambiguation |
|------|---------------------|----------------|
| list_tags | No (uses parentId) | N/A |
| create_tag | No (creates new) | N/A |
| edit_tag | Yes (id or name) | Yes - FR-038 error |
| delete_tag | Yes (id or name) | Yes - FR-038 error |
| assign_tags | Yes (taskIds, tagIds) | Yes - per-item error |
| remove_tags | Yes (taskIds, tagIds) | Yes - per-item error |

## State Transitions

### Tag Status

```text
     ┌─────────────────┐
     │                 │
     ▼                 │
  Active ◄────► OnHold │
     │                 │
     │                 │
     ▼                 │
  Dropped ─────────────┘
```

All transitions are valid. OnHold is a "soft pause" vs Dropped which is archival.

### Task-Tag Relationship

```text
  Task ◄───────────────► Tag
      │ addTag()         │
      │ removeTag()      │
      │ clearTags()      │
      └──────────────────┘

  Many-to-Many relationship:
  - Task can have 0..* tags
  - Tag can have 0..* tasks
```

## OmniJS Field Mapping

| Entity Field | OmniJS Source |
|--------------|---------------|
| tag.id | `tag.id.primaryKey` |
| tag.name | `tag.name` |
| tag.status | `mapStatus(tag.status)` → 'active' \| 'onHold' \| 'dropped' |
| tag.parentId | `tag.parent?.id.primaryKey ?? null` |
| tag.allowsNextAction | `tag.allowsNextAction` |
| tag.taskCount | `tag.remainingTasks.length` |

### Status Mapping Function

```javascript
function mapStatus(tag) {
  if (tag.status === Tag.Status.OnHold) return "onHold";
  if (tag.status === Tag.Status.Dropped) return "dropped";
  return "active";
}

function parseStatus(statusStr) {
  if (statusStr === "onHold") return Tag.Status.OnHold;
  if (statusStr === "dropped") return Tag.Status.Dropped;
  return Tag.Status.Active;
}
```

## Batch Operation Semantics

### Partial Failure Handling

Batch operations (`assign_tags`, `remove_tags`) continue processing all items even when
individual items fail. One failed item does NOT abort the entire batch. This enables
maximum progress while providing detailed per-item feedback.

**Key Behaviors**:

- The top-level `success: true` indicates the batch operation completed (not that all
  items succeeded)
- Check individual `results[].success` for per-item outcomes
- The `results` array maintains the same order as the input `taskIds` array
- The `error` field is present only when the per-item `success: false`

### Per-Item Result Schema (Extended)

For batch operations, per-item results support disambiguation reporting:

```typescript
import { z } from 'zod';

export const BatchItemResultSchema = z.object({
  taskId: z.string()
    .describe('The resolved task ID (original input if lookup failed)'),
  taskName: z.string()
    .describe('The task name (empty string if lookup failed)'),
  success: z.boolean()
    .describe('Whether the operation succeeded for this task'),
  error: z.string().optional()
    .describe('Error message (present only when success=false)'),
  code: z.string().optional()
    .describe('Error code for disambiguation: "DISAMBIGUATION_REQUIRED"'),
  matchingIds: z.array(z.string()).optional()
    .describe('Matching IDs when disambiguation required (task or tag IDs)')
});

export type BatchItemResult = z.infer<typeof BatchItemResultSchema>;
```

### Disambiguation in Batch Operations

For `assign_tags` and `remove_tags`, disambiguation can occur for both task names
AND tag names. When an identifier (task or tag) is ambiguous:

1. The per-item result includes `success: false`
2. The `error` field describes which identifier was ambiguous
3. The `code` field is set to `"DISAMBIGUATION_REQUIRED"`
4. The `matchingIds` array contains the IDs of all matching items

**Example per-item disambiguation error**:

```json
{
  "taskId": "MyTask",
  "taskName": "",
  "success": false,
  "error": "Ambiguous task name 'MyTask'. Found 3 matches.",
  "code": "DISAMBIGUATION_REQUIRED",
  "matchingIds": ["task_id_1", "task_id_2", "task_id_3"]
}
```

### Idempotency

- `assign_tags`: Adding a tag that's already assigned to a task is a no-op (no error)
- `remove_tags`: Removing a tag that isn't present on a task is a no-op (no error)

Both operations report `success: true` for idempotent cases.

## Complete Response Schemas (Discriminated Unions)

All tools use discriminated unions on the `success` field for type-safe response handling.

### list_tags Response

```typescript
import { z } from 'zod';
import { TagSchema } from './shared/tag.js';

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

### create_tag Response

```typescript
import { z } from 'zod';

export const CreateTagSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Created tag ID'),
  name: z.string().describe('Created tag name')
});

export const CreateTagErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export const CreateTagResponseSchema = z.discriminatedUnion('success', [
  CreateTagSuccessSchema,
  CreateTagErrorSchema
]);

export type CreateTagResponse = z.infer<typeof CreateTagResponseSchema>;
```

### edit_tag Response

```typescript
import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';

export const EditTagSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Edited tag ID'),
  name: z.string().describe('Current tag name (may be updated)')
});

export const EditTagErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

// edit_tag can return disambiguation error OR standard error
export const EditTagResponseSchema = z.union([
  EditTagSuccessSchema,
  DisambiguationErrorSchema,
  EditTagErrorSchema
]);

export type EditTagResponse = z.infer<typeof EditTagResponseSchema>;
```

### delete_tag Response

```typescript
import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';

export const DeleteTagSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Deleted tag ID (captured before deletion)'),
  name: z.string().describe('Deleted tag name (captured before deletion)')
});

export const DeleteTagErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

// delete_tag can return disambiguation error OR standard error
export const DeleteTagResponseSchema = z.union([
  DeleteTagSuccessSchema,
  DisambiguationErrorSchema,
  DeleteTagErrorSchema
]);

export type DeleteTagResponse = z.infer<typeof DeleteTagResponseSchema>;
```

### assign_tags Response

```typescript
import { z } from 'zod';
import { BatchItemResultSchema } from './shared/batch-result.js';

export const AssignTagsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(BatchItemResultSchema)
    .describe('Per-task results in same order as input taskIds')
});

export const AssignTagsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export const AssignTagsResponseSchema = z.discriminatedUnion('success', [
  AssignTagsSuccessSchema,
  AssignTagsErrorSchema
]);

export type AssignTagsResponse = z.infer<typeof AssignTagsResponseSchema>;
```

### remove_tags Response

```typescript
import { z } from 'zod';
import { BatchItemResultSchema } from './shared/batch-result.js';

export const RemoveTagsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(BatchItemResultSchema)
    .describe('Per-task results in same order as input taskIds')
});

export const RemoveTagsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export const RemoveTagsResponseSchema = z.discriminatedUnion('success', [
  RemoveTagsSuccessSchema,
  RemoveTagsErrorSchema
]);

export type RemoveTagsResponse = z.infer<typeof RemoveTagsResponseSchema>;
```

## Identifier Resolution Order

For tools that accept ID or name identifiers, the lookup order is:

1. **Try ID first**: Use `Tag.byIdentifier(id)` or `Task.byIdentifier(id)`
2. **Fall back to name**: If ID lookup returns null, search by name using
   `flattenedTags.filter()` or `flattenedTasks.filter()`
3. **Check for disambiguation**: If name search returns multiple matches,
   return disambiguation error

This order ensures that IDs (which are unambiguous) are always preferred when the
input happens to match both an ID and a name
