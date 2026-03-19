# Data Model: Window & UI Control

**Feature Branch**: `014-window-ui`
**Date**: 2026-03-18

## Entities

### WindowItemIdentifier

Identifies an item (task, project, folder, or tag) for UI operations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | No* | Item ID (preferred -- direct lookup across all 4 types) |
| `name` | `string` | No* | Item name (fallback -- may require disambiguation) |

*At least one of `id` or `name` must be a non-empty string.

**Validation**: `z.object().refine()` ensures at least one field present.

**Lookup Order (by ID)**: Project -> Folder -> Task -> Tag (via `byIdentifier`; projects first to avoid root-task ID collision)
**Lookup Order (by name)**: Explicit iteration over `flattenedProjects`, `flattenedFolders`, `flattenedTasks`, `flattenedTags` comparing `item.name === name`.

### WindowBatchItemResult

Per-item result for batch window operations (expand, collapse, select, etc.).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemId` | `string` | Yes | Resolved item ID (or input if lookup failed) |
| `itemName` | `string` | Yes | Item name (empty string if lookup failed) |
| `itemType` | `enum` | Yes | `'task' \| 'project' \| 'folder' \| 'tag'` |
| `success` | `boolean` | Yes | Whether the operation succeeded for this item |
| `error` | `string` | No | Error message (present only when success=false) |
| `code` | `string` | No | Status/error code |
| `candidates` | `array` | No | Matching items for disambiguation |

**Status Codes** (success=true): `ALREADY_EXPANDED`, `ALREADY_COLLAPSED`, `NO_NOTE`
**Error Codes** (success=false): `NOT_FOUND`, `NODE_NOT_FOUND`, `DISAMBIGUATION_REQUIRED`, `INVALID_TYPE`

### BatchSummary

Aggregate result counts for batch operations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total` | `number` | Yes | Total items in request |
| `succeeded` | `number` | Yes | Items that succeeded |
| `failed` | `number` | Yes | Items that failed |

**Invariant**: `total === succeeded + failed` (enforced by implementation).

### FocusTarget

An item that can be focused (projects and folders only).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | No* | Project or folder ID |
| `name` | `string` | No* | Project or folder name |

*At least one must be non-empty. Tasks and tags rejected with `INVALID_TYPE`.

### DisambiguationCandidate

A matching item returned when name lookup is ambiguous.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Item ID |
| `name` | `string` | Yes | Item display name |
| `type` | `enum` | Yes | `'task' \| 'project' \| 'folder' \| 'tag'` |

## Tool Schemas

### reveal_items

- **Input**: `items` (1-10 WindowItemIdentifier[])
- **Success**: `{ success: true, results: WindowBatchItemResult[], summary: BatchSummary }`
- **Error**: `{ success: false, error: string }`

### expand_items

- **Input**: `items` (1-50 WindowItemIdentifier[]), `completely` (boolean, optional)
- **Success**: `{ success: true, results: WindowBatchItemResult[], summary: BatchSummary }`
- **Error**: `{ success: false, error: string }`

### collapse_items

- **Input**: `items` (1-50 WindowItemIdentifier[]), `completely` (boolean, optional)
- **Success**: `{ success: true, results: WindowBatchItemResult[], summary: BatchSummary }`
- **Error**: `{ success: false, error: string }`

### expand_notes

- **Input**: `items` (1-50 WindowItemIdentifier[]), `completely` (boolean, optional)
- **Success**: `{ success: true, results: WindowBatchItemResult[], summary: BatchSummary }`
- **Error**: `{ success: false, error: string }`

### collapse_notes

- **Input**: `items` (1-50 WindowItemIdentifier[]), `completely` (boolean, optional)
- **Success**: `{ success: true, results: WindowBatchItemResult[], summary: BatchSummary }`
- **Error**: `{ success: false, error: string }`

### focus_items

- **Input**: `items` (1-50 FocusTarget[])
- **Success**: `{ success: true, results: WindowBatchItemResult[], summary: BatchSummary }`
- **Error**: `{ success: false, error: string }`

### unfocus

- **Input**: (none)
- **Success**: `{ success: true }`
- **Error**: `{ success: false, error: string }`

### select_items

- **Input**: `items` (1-100 WindowItemIdentifier[]), `extending` (boolean, optional, default false)
- **Success**: `{ success: true, results: WindowBatchItemResult[], summary: BatchSummary }`
- **Error**: `{ success: false, error: string }`

## State Transitions

### Focus State

```text
Unfocused (window.focus === null)
  --[focus_items(projects/folders)]--> Focused (window.focus === [Project, Folder, ...])
  --[unfocus]--> Unfocused (no-op, idempotent)

Focused (window.focus === [items])
  --[unfocus]--> Unfocused (window.focus = [])
  --[focus_items(new items)]--> Focused (replaces previous focus)
```

### Node Expand/Collapse State

```text
Collapsed (node.isExpanded === false)
  --[expand(false/null)]--> Expanded (immediate children visible)
  --[expand(true)]--> Fully Expanded (all descendants visible)
  --[collapse]--> Collapsed (no-op, idempotent)

Expanded (node.isExpanded === true)
  --[collapse(false/null)]--> Collapsed (immediate children hidden)
  --[collapse(true)]--> Fully Collapsed (all descendant levels collapsed)
  --[expand]--> Expanded (no-op, idempotent)
```

## Relationships

```text
DocumentWindow --(content)--> ContentTree (Tree)
ContentTree --(rootNode)--> TreeNode
TreeNode --(children)--> TreeNode[]
TreeNode --(object)--> Task | Project | Folder | Tag
DocumentWindow --(focus)--> Project[] | Folder[] | null
```
