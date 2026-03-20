# Data Model: TaskPaper Import/Export

**Branch**: `012-taskpaper` | **Date**: 2026-03-20

## Entities

### ParsedItem (Validation Output)

Represents a single parsed item from transport text, used by `validate_transport_text`.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Item name (task or project) |
| type | `'task' \| 'project'` | Whether item is a task or project header |
| depth | number (int, >= 0) | Indentation depth (0 = root) |
| tags | string[] | Tag names found on this item |
| dueDate | string \| null | ISO 8601 date string or null |
| deferDate | string \| null | ISO 8601 date string or null |
| doneDate | string \| null | ISO 8601 date string for completed items or null |
| flagged | boolean | Whether item is flagged |
| estimate | string \| null | Duration string (e.g., "30m", "1h") or null |
| note | string \| null | Note text or null (OmniJS empty string `""` normalized to `null`) |
| children | ParsedItem[] | Nested child items (recursive structure via `z.lazy()`) |

### ValidationSummary

Summary statistics from transport text validation.

| Field | Type | Description |
|-------|------|-------------|
| tasks | number (int, >= 0) | Total task count (including nested) |
| projects | number (int, >= 0) | Total project count |
| tags | number (int, >= 0) | Unique tag count |
| maxDepth | number (int, >= 0) | Maximum nesting depth |

### ValidationWarning

A warning about problematic content in transport text.

| Field | Type | Description |
|-------|------|-------------|
| line | number (int, >= 1) | 1-based line number |
| message | string | Description of the issue |
| content | string | The problematic line content |

### CreatedItem (Import Output)

Represents an item created during import.

| Field | Type | Description |
|-------|------|-------------|
| id | string | OmniFocus unique identifier |
| name | string | Item name |
| type | `'task' \| 'project'` | Item type |

### ImportSummary

Summary of items created during import.

| Field | Type | Description |
|-------|------|-------------|
| totalCreated | number (int, >= 0) | Total items created |
| tasks | number (int, >= 0) | Tasks created |
| projects | number (int, >= 0) | Projects created |
| movedToProject | boolean | Whether items were moved to a target project |

### ExportSummary

Summary of items included in export output.

| Field | Type | Description |
|-------|------|-------------|
| totalItems | number (int, >= 0) | Total items exported |
| tasks | number (int, >= 0) | Tasks exported |
| projects | number (int, >= 0) | Projects exported |
| maxDepth | number (int, >= 0) | Maximum nesting depth in output |

## Relationships

```text
validate_transport_text:
  Input: text (string) --> ParsedItem[] + ValidationSummary + ValidationWarning[]

import_taskpaper:
  Input: text (string), targetProjectId? (string)
  --> OmniJS byParsingTransportText --> recursive ID walk
  --> CreatedItem[] + ImportSummary

export_taskpaper:
  Input: projectId? | folderId? | taskIds? (string[]), status? (enum)
  --> OmniJS custom serializer --> recursive task tree walk
  --> transportText (string) + ExportSummary + ValidationWarning[]
```

## State Transitions

No state machines. Import is a one-shot create operation. Export is a read-only operation. Validation has no side effects.

## Validation Rules

- Transport text: must be non-empty and non-whitespace-only (for import and validation)
- Task IDs for export: 1-100 items (array bounds)
- Status filter: one of `['active', 'completed', 'dropped', 'all']`
- Exactly one export scope must be provided: `projectId` OR `folderId` OR `taskIds` (mutually exclusive)
- Target project ID for import: optional, validated via `Project.byIdentifier()` at runtime
