# Data Model: Task Status & Completion

**Feature**: Phase 13 - Task Status & Completion
**Date**: 2026-03-17
**Source**: [spec.md](./spec.md), [research.md](./research.md)

## Overview

This document defines the data entities, relationships, and validation rules
for the Task Status & Completion tools. All entities map to OmniFocus Omni
Automation API objects.

---

## Entity Definitions

### ItemIdentifier (Input)

Identifies a task or project for single or batch operations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Conditional | OmniFocus item ID (preferred — direct lookup) |
| `name` | string | Conditional | Display name (fallback — may require disambiguation) |

**Validation Rules:**

1. At least one of `id` or `name` must be a non-empty string
2. If both provided, `id` takes precedence
3. Name lookups that match multiple items return disambiguation error

**Zod Schema:** New `ItemIdentifierSchema` in `status-tools/shared/`

---

### StatusBatchItemResult (Output)

Per-item result for batch lifecycle operations (mark_complete, mark_incomplete,
drop_items).

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `itemId` | string | No | Resolved item ID (or input if lookup failed) |
| `itemName` | string | No | Item name (empty string if lookup failed) |
| `itemType` | string | No | `'task'` or `'project'` |
| `success` | boolean | No | Whether operation succeeded for this item |
| `error` | string | Yes | Error message (only when `success: false`) |
| `code` | string | Yes | Error code (see table below) |
| `candidates` | Array<{id, name, type}> | Yes | Matching items for disambiguation |

**Error Codes:**

| Code | Meaning | Tools |
|------|---------|-------|
| `NOT_FOUND` | Item ID or name not found | All batch tools |
| `DISAMBIGUATION_REQUIRED` | Name matches multiple items | All batch tools |
| `VERSION_NOT_SUPPORTED` | OmniFocus version too old for operation | drop_items |
| `ALREADY_COMPLETED` | Item already completed (no-op success) | mark_complete |
| `ALREADY_DROPPED` | Item already dropped (no-op success) | drop_items |
| `ALREADY_ACTIVE` | Item already active (no-op success) | mark_incomplete |

**Note:** `ALREADY_*` codes appear on successful no-op results (`success: true`)
to indicate the operation was idempotent rather than a state change.

---

### MarkCompleteInput

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `items` | ItemIdentifier[] | required | Items to complete (1-100) |
| `completionDate` | string (ISO 8601) | null | Optional backdate; null = current date. Accepts both date-only (`2026-03-17`) and datetime (`2026-03-17T10:00:00Z`) formats — follows existing contract pattern (plain `z.string()`, no regex validation). Converted to OmniJS `Date` object internally via `new Date(string)`. |

---

### MarkIncompleteInput

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `items` | ItemIdentifier[] | required | Items to reopen (1-100) |

---

### DropItemsInput

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `items` | ItemIdentifier[] | required | Items to drop (1-100) |
| `allOccurrences` | boolean | true | Stop repeating (true) or drop current only (false). **Task-only** — ignored for projects, which use status assignment (`Project.Status.Dropped`) |

---

### SetProjectTypeInput

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | conditional | Project ID (preferred) |
| `name` | string | conditional | Project name (fallback) |
| `projectType` | string | required | `'sequential'`, `'parallel'`, or `'single-actions'` |

**Mutual Exclusion (matching Phase 4 edit_project):**

| `projectType` value | `sequential` | `containsSingletonActions` |
|---------------------|-------------|---------------------------|
| `'sequential'` | true | false (auto-clear) |
| `'parallel'` | false | false |
| `'single-actions'` | false (auto-clear) | true |

---

### GetNextTaskInput

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | conditional | Project ID (preferred) |
| `name` | string | conditional | Project name (fallback) |

---

### GetNextTaskSuccess

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | true | No | Literal true |
| `hasNext` | boolean | No | Whether a next task exists |
| `reason` | string | Yes | `'NO_AVAILABLE_TASKS'` or `'SINGLE_ACTIONS_PROJECT'` (when hasNext=false) |
| `task` | TaskDetails | Yes | Full task details (when hasNext=true) |

**TaskDetails fields** (reuse pattern from existing `get_task`):
- `id`, `name`, `note`, `completed`, `flagged`
- `dueDate`, `deferDate`, `completionDate`
- `tags` (array of {id, name})
- `project` ({id, name})
- `taskStatus` (Available, Blocked, Completed, Dropped, etc.)

---

### SetFloatingTimezoneInput

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | conditional | Item ID (preferred) |
| `name` | string | conditional | Item name (fallback) |
| `enabled` | boolean | required | Enable (true) or disable (false) floating timezone |

---

## State Transitions

### Task Lifecycle States

```text
              markComplete(date?)
┌──────────┐ ──────────────────────> ┌──────────┐
│  Active  │                         │Completed │
│Available │ <────────────────────── │          │
│  Next    │    markIncomplete()     └──────────┘
│  Blocked │
│  DueSoon │
│  Overdue │
└──────────┘
    │  ▲
    │  │ active = true
    │  │ (mark_incomplete detects dropped state)
    │  │
    ▼  │
┌──────────┐
│ Dropped  │    task.drop(allOccurrences)
│          │    or project.status = Dropped
└──────────┘
```

### Repeating Task Behavior

```text
markComplete(date?) on repeating task:
  ┌──────────┐     clone + complete     ┌──────────┐
  │ Original │ ──────────────────────> │  Clone   │
  │(repeats) │                         │Completed │
  │          │  original continues     └──────────┘
  └──────────┘

drop(allOccurrences=true) on repeating task:
  ┌──────────┐
  │ Original │ → Dropped, repetitionRule cleared
  │(stopped) │
  └──────────┘

drop(allOccurrences=false) on repeating task:
  ┌──────────┐     drop current     ┌──────────┐
  │ Original │ ──────────────────> │  Current │
  │(repeats) │                     │ Dropped  │
  │          │  next occurrence    └──────────┘
  └──────────┘  generated
```

---

## Validation Rules

### Batch Operations (mark_complete, mark_incomplete, drop_items)

| Field | Validation | Error |
|-------|------------|-------|
| `items` | Array, min 1, max 100 (enforced at Zod schema level via `.min(1).max(100)`, matching review-tools pattern) | "items must contain 1-100 entries" |
| Each `.id` | Must exist if provided | "Item not found: {id}" |
| Each `.name` | Must be unique if used | "Multiple items match '{name}'. Use ID." |
| `completionDate` | Valid ISO 8601 if provided | "Invalid date format: {value}" |
| `allOccurrences` | Boolean | Type validation |

### Single-Item Operations (set_project_type, get_next_task, set_floating_timezone)

| Field | Validation | Error |
|-------|------------|-------|
| `id` or `name` | At least one required | "Either id or name is required" |
| `projectType` | Enum member | "Invalid type. Must be: sequential, parallel, single-actions" |
| `enabled` | Boolean | Type validation |

---

## Relationships

```text
┌──────────────────────┐
│        Task          │
├──────────────────────┤
│ id: string           │
│ name: string         │
│ taskStatus: Status   │
│ completed: boolean   │
│ dropDate: Date?      │
│ completionDate: Date?│
│ active: boolean      │
│ shouldUseFloating-   │
│   TimeZone: boolean  │
│ repetitionRule?      │
└──────────────────────┘
         │
         │ root task of
         ▼
┌──────────────────────┐
│      Project         │
├──────────────────────┤
│ id: string           │
│ name: string         │
│ status: ProjStatus   │
│ sequential: boolean  │
│ containsSingleton-   │
│   Actions: boolean   │
│ nextTask: Task?      │ (read-only)
│ shouldUseFloating-   │
│   TimeZone: boolean  │
└──────────────────────┘
```

---

## API Response Formats

### Batch Response (mark_complete, mark_incomplete, drop_items)

```typescript
// Success (always returns array, even for partial failures)
// Each result corresponds to the input item at the same array index
// (matching review-tools pattern: batch.ts "Per-project results at original indices")
{
  success: true,
  results: StatusBatchItemResult[],  // results[i] corresponds to items[i]
  summary: {
    total: number,      // z.number().int().min(0)
    succeeded: number,  // z.number().int().min(0)
    failed: number      // z.number().int().min(0)
  }
}
// Runtime invariant: summary.total === summary.succeeded + summary.failed
// (Not expressible in Zod — enforced by implementation, matching review-tools pattern)

// Error (catastrophic — e.g., OmniFocus unreachable, version too old)
{
  success: false,
  error: string
}
```

### Single-Item Response (set_project_type, get_next_task, set_floating_timezone)

```typescript
// Success
{
  success: true,
  id: string,
  name: string,
  // Tool-specific fields...
}

// Disambiguation Error
// NOTE: Single-item tools use `matchingIds: string[]` (following existing
// DisambiguationErrorSchema from task-tools/project-tools/tag-tools).
// Batch tools use richer `candidates: [{id, name, type}]` because they
// need to report disambiguation per-item within the results array.
// This is an intentional pattern difference matching the existing codebase.
{
  success: false,
  error: string,
  code: "DISAMBIGUATION_REQUIRED",
  matchingIds: string[]   // z.array(z.string()).min(2) — IDs only, matches existing pattern
}

// Standard Error
{
  success: false,
  error: string
}
```

---

## OmniJS Object Mapping

| TypeScript Type | OmniJS Property | Notes |
|-----------------|-----------------|-------|
| `ItemIdentifier.id` | `Task.byIdentifier(id)` / `Project.byIdentifier(id)` | Try task first, then project |
| `StatusBatchItemResult.itemType` | Check `instanceof` or presence of `project` property | Tasks have `containingProject`, projects don't |
| `Task completed` | `task.completed` | Boolean |
| `Task dropped` | `task.dropDate !== null` | Has a drop date |
| `Project status` | `project.status` | `Project.Status.Active/OnHold/Done/Dropped` |
| `Floating TZ` | `item.shouldUseFloatingTimeZone` | Boolean, both Task and Project |
| `Project type` | `project.sequential` + `project.containsSingletonActions` | Two booleans determine type |
| `Next task` | `project.nextTask` | `Task` or `null` (read-only) |
