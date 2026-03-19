# Quickstart: Bulk Operations

**Branch**: `010-bulk-operations` | **Date**: 2026-03-18

## Overview

6 new MCP tools for bulk task and section operations in OmniFocus:

| Tool | Purpose | Priority |
|------|---------|----------|
| `move_tasks` | Move 1-100 tasks to a new location | P1 |
| `duplicate_tasks` | Duplicate 1-100 tasks to a new location | P2 |
| `batch_update_tasks` | Update properties on 1-100 tasks | P2 |
| `convert_tasks_to_projects` | Convert 1-100 tasks to projects | P3 |
| `move_sections` | Move 1-100 sections (folders/projects) | P3 |
| `duplicate_sections` | Duplicate 1-100 sections | P4 |

## Implementation Order

1. **Shared contracts** (`src/contracts/bulk-tools/shared/`) - ItemIdentifier, BatchItemResult, Position schemas, PropertyUpdateSet
2. **move_tasks** - Foundation tool, establishes task position pattern
3. **duplicate_tasks** - Extends move pattern with newId/newName in results
4. **batch_update_tasks** - Property update pattern (widest input schema)
5. **convert_tasks_to_projects** - Conversion pattern (unique among the 6)
6. **move_sections** - Section position pattern (mirrors move_tasks for sections)
7. **duplicate_sections** - Extends section move with newId/newName

## File Layout

```text
src/contracts/bulk-tools/
  shared/
    index.ts              # Barrel export for shared schemas
    item-identifier.ts    # ItemIdentifier (per-domain copy)
    batch.ts              # BulkBatchItemResult, Summary
    task-position.ts      # TaskPosition schema
    section-position.ts   # SectionPosition schema
    property-update.ts    # PropertyUpdateSet schema
  move-tasks.ts
  duplicate-tasks.ts
  batch-update-tasks.ts
  convert-tasks-to-projects.ts
  move-sections.ts
  duplicate-sections.ts
  index.ts                # Barrel export

src/tools/definitions/
  moveTasks.ts
  duplicateTasks.ts
  batchUpdateTasks.ts
  convertTasksToProjects.ts
  moveSections.ts
  duplicateSections.ts

src/tools/primitives/
  moveTasks.ts
  duplicateTasks.ts
  batchUpdateTasks.ts
  convertTasksToProjects.ts
  moveSections.ts
  duplicateSections.ts

tests/
  contract/
    bulk-tools/
      shared.contract.test.ts
      move-tasks.contract.test.ts
      duplicate-tasks.contract.test.ts
      batch-update-tasks.contract.test.ts
      convert-tasks-to-projects.contract.test.ts
      move-sections.contract.test.ts
      duplicate-sections.contract.test.ts
  unit/
    primitives/
      moveTasks.test.ts
      duplicateTasks.test.ts
      batchUpdateTasks.test.ts
      convertTasksToProjects.test.ts
      moveSections.test.ts
      duplicateSections.test.ts
  integration/
    bulk-operations.integration.test.ts
```

## TDD Workflow (per tool)

```text
1. Write contract tests for Zod schemas --> verify FAIL
2. Implement contracts in src/contracts/bulk-tools/ --> tests GREEN
3. Write unit tests for primitive --> verify FAIL
4. Implement primitive in src/tools/primitives/ --> tests GREEN
5. Implement definition in src/tools/definitions/ --> wire up
6. Register tool in server.ts
7. pnpm build && pnpm test
8. Manual verification in OmniFocus Script Editor
```

## Key Patterns to Follow

### Batch Primitive Pattern (from dropItems.ts)

```typescript
export async function moveTasks(params: MoveTasksInput): Promise<MoveTasksResponse> {
  const script = generateMoveTasksScript(params);
  const result = await executeOmniJS(script);
  // Use Zod .parse() to narrow unknown -> typed response (NEVER use `as Type`)
  return MoveTasksResponseSchema.parse(result);
}

export function generateMoveTasksScript(params: MoveTasksInput): string {
  // Serialize item identifiers for embedding in OmniJS
  const itemIdentifiers = params.items.map((item) => ({
    id: item.id ?? '',
    name: item.name ?? ''
  }));

  return `(function() {
  try {
    var items = ${JSON.stringify(itemIdentifiers)};
    var results = [];
    var succeeded = 0;
    var failed = 0;

    // Pre-validate target (FR-016)
    // ... resolve target position ...

    items.forEach(function(identifier) {
      // ... resolve item, move, record result ...
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: { total: items.length, succeeded: succeeded, failed: failed }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
  })();`;
}
```

### Definition Handler Pattern (from markComplete.ts)

```typescript
export const schema = MoveTasksInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await moveTasks(args);
    if (result.success) {
      // Format per-item results for MCP text response
      return { content: [{ type: 'text' as const, text: formattedMessage }] };
    }
    return { content: [{ type: 'text' as const, text: result.error }], isError: true };
  } catch (err) {
    // ...
  }
}
```

## Critical Constraints

- All OmniJS bulk API calls are one-item-at-a-time within a single script execution
- Target validation happens before the item loop (FR-016)
- `duplicateTasks()` copies are reset to active/incomplete (FR-011)
- `batch_update_tasks` processes tag removals before additions (FR-014)
- `plannedDate` and `clearPlannedDate` require v4.7+ version gating
- `convert_tasks_to_projects` checks for already-a-project root tasks (FR-012)
- Maximum 100 items per batch (FR-009)
