---
paths:
  - "src/tools/**/batch*.ts"
  - "src/tools/primitives/batchAddItems.ts"
  - "src/tools/primitives/batchRemoveItems.ts"
  - "src/tools/definitions/batchAddItems.ts"
  - "src/tools/definitions/batchRemoveItems.ts"
---

# Batch Operations Patterns

## Cycle Detection

1. Build dependency graph from `tempId` → `parentTempId` references
2. Run DFS to detect cycles
3. Mark cyclic items as failed BEFORE processing
4. Process remaining items in topological order (parents before children)

## ID Mapping

- `parentTaskId`: Reference existing task by real OmniFocus ID
- `parentTaskName`: Find existing task by name (fallback)
- `parentTempId`: Reference task created in same batch
- Build `tempId` → `realId` map as items are created

## Hierarchy Ordering

- Process parents before children
- Use `hierarchyLevel` as ordering hint (0=root, 1=child)
- Validate parent references exist before submission

## Partial Failure Handling

- One invalid item should NOT fail the whole batch
- Store each result at original array index
- Always check individual result statuses

## Batch Processing Flow

1. Items with cycles in `tempId` references fail immediately
2. Items with unknown `parentTempId` (not in batch, not real ID) fail immediately
3. Remaining items sorted by dependency
4. Items processed in order, building `tempId` → real ID map
5. Each item's result stored at original array index
