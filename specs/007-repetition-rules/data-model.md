# Data Model: Repetition Rules

**Feature**: Phase 7 - Repetition Rule Management
**Date**: 2026-03-17
**Source**: [spec.md](./spec.md), [research.md](./research.md)

## Overview

This document defines the data entities, relationships, and validation rules
for the Repetition Rule tools. All entities map to OmniFocus Omni Automation
API objects.

---

## Entity Definitions

### RepetitionRuleData (Projection)

Data returned when reading a task's or project's repetition rule. Captures
all available properties, with v4.7+ fields conditionally present.

| Field | Type | Zod Schema | Description |
|-------|------|------------|-------------|
| `ruleString` | string | `z.string()` | ICS RRULE format (e.g., `FREQ=WEEKLY;BYDAY=MO`) |
| `isRepeating` | boolean | `z.literal(true)` | Always `true` when rule exists |
| `scheduleType` | ScheduleType | `z.enum([...]).nullable()` | v4.7+ only — null on older versions |
| `anchorDateKey` | AnchorDateKey | `z.enum([...]).nullable()` | v4.7+ only — null on older versions |
| `catchUpAutomatically` | boolean | `z.boolean().nullable()` | v4.7+ only — null on older versions |
| `method` | RepetitionMethod | `z.string().nullable()` | DEPRECATED — included for backwards compat |

**Field Notes:**

- `scheduleType`, `anchorDateKey`, `catchUpAutomatically`: Use `.nullable()`
  (not `.optional()`). Fields are always PRESENT in the response but null on
  pre-v4.7 OmniFocus. This matches the established `TaskFullSchema` pattern
  where `plannedDate: z.string().nullable().describe('...v4.7+, null if
  unsupported')`. No version indicator field needed — null values ARE the
  version signal.
- `method`: Deprecated legacy field. Included for users on older versions who
  may reference it. Returns string name of enum value or null.
- `isRepeating`: Convenience boolean; always `true` in RepetitionRuleData
  (when no rule exists, the entire object is replaced by a `hasRule: false`
  indicator in the response).

**OmniJS Extraction Pattern:**

```javascript
var rule = task.repetitionRule;
var data = {
  ruleString: rule.ruleString,
  isRepeating: true,
  method: rule.method ? rule.method.name : null
};

// v4.7+ fields (conditional)
if (isV47Plus) {
  data.scheduleType = rule.scheduleType ? rule.scheduleType.name : null;
  data.anchorDateKey = rule.anchorDateKey ? rule.anchorDateKey.name : null;
  data.catchUpAutomatically = rule.catchUpAutomatically;
}
```

---

### ItemIdentifier (Input)

Identifies a task or project for repetition operations. Supports both task
and project IDs — the OmniJS script resolves which entity type the ID belongs
to.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Task or project OmniFocus ID |

**Resolution Logic (OmniJS):**

```javascript
// Try task first, then project
var task = Task.byIdentifier(id);
if (!task) {
  var project = Project.byIdentifier(id);
  if (project) {
    task = project.task;  // root task holds repetition rule
  }
}
```

**Validation Rules:**

1. `id` must be a non-empty string
2. If ID matches neither a task nor a project → NOT_FOUND error
3. For projects, the operation targets `project.task` (root task)

---

### PresetName (Enum)

Named shorthand for common recurrence patterns. Generated server-side in
TypeScript — the OmniJS script receives the computed ICS string.

| Value | ICS String | Optional Params |
|-------|-----------|-----------------|
| `daily` | `FREQ=DAILY` | — |
| `weekdays` | `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` | — |
| `weekly` | `FREQ=WEEKLY` | `days` → appends `BYDAY=...` |
| `biweekly` | `FREQ=WEEKLY;INTERVAL=2` | `days` → appends `BYDAY=...` |
| `monthly` | `FREQ=MONTHLY` | `dayOfMonth` → appends `BYMONTHDAY=...` |
| `monthly_last_day` | `FREQ=MONTHLY;BYMONTHDAY=-1` | — |
| `quarterly` | `FREQ=MONTHLY;INTERVAL=3` | `dayOfMonth` → appends `BYMONTHDAY=...` |
| `yearly` | `FREQ=YEARLY` | — |

**Optional Parameters:**

- `days`: Array of day abbreviations (`MO`, `TU`, `WE`, `TH`, `FR`, `SA`, `SU`).
  Applicable to `weekly` and `biweekly` presets. Appends `BYDAY=` component.
- `dayOfMonth`: Integer 1-31. Applicable to `monthly` and `quarterly` presets.
  Appends `BYMONTHDAY=` component.

---

### ScheduleType (Enum)

Maps to `Task.RepetitionScheduleType` (v4.7+).

| Value | OmniJS Enum | Description |
|-------|-------------|-------------|
| `Regularly` | `Task.RepetitionScheduleType.Regularly` | Repeats from assigned dates |
| `FromCompletion` | `Task.RepetitionScheduleType.FromCompletion` | Calculates next from completion |
| `None` | `Task.RepetitionScheduleType.None` | No repetition |

---

### AnchorDateKey (Enum)

Maps to `Task.AnchorDateKey` (v4.7+).

| Value | OmniJS Enum | Description |
|-------|-------------|-------------|
| `DueDate` | `Task.AnchorDateKey.DueDate` | Anchors to due date (default) |
| `DeferDate` | `Task.AnchorDateKey.DeferDate` | Anchors to defer date |
| `PlannedDate` | `Task.AnchorDateKey.PlannedDate` | Anchors to planned date |

---

## Validation Rules

### Zod Pattern Conventions

These patterns are grounded in the established codebase contracts
(`src/contracts/task-tools/`, `src/contracts/review-tools/`):

| Zod Pattern | Semantic | Use Case |
|-------------|----------|----------|
| `z.string().min(1)` | Required non-empty string | `id`, `ruleString` — rejects empty strings at validation |
| `z.string().optional()` | Input field that can be omitted | set_advanced_repetition optional params |
| `z.string().nullable()` | Response field that can be null | v4.7+ response fields (null = unsupported version) |
| `z.enum([...])` | Exhaustive string literal union | PresetName, ScheduleType, AnchorDateKey, DayAbbreviation |
| `z.discriminatedUnion('success', [...])` | Response union | All tool responses (success: true/false) |

**Key design decision**: For set_advanced_repetition input params, `.optional()`
is used (not `.nullable()`). Omitted fields trigger read-from-existing-rule
merge. There is no semantic distinction between "not provided" and "null" —
both mean "use existing value." This matches the codebase pattern in
`src/contracts/task-tools/` where `.optional()` is for inputs and `.nullable()`
is for response values.

**Version-conditional response fields**: Use `.nullable()` with version note in
`.describe()`, matching `TaskFullSchema` pattern (e.g.,
`plannedDate: z.string().nullable().describe('...v4.7+, null if unsupported')`).
No version indicator field in responses — null values ARE the version signal.

### get_repetition Input

| Field | Type | Default | Zod Schema | Error |
|-------|------|---------|------------|-------|
| `id` | string | — | `z.string().min(1)` | "id is required" |

### set_repetition Input

| Field | Type | Default | Zod Schema | Error |
|-------|------|---------|------------|-------|
| `id` | string | — | `z.string().min(1)` | "id is required" |
| `ruleString` | string | — | `z.string().min(1)` | "ruleString is required" |

### clear_repetition Input

| Field | Type | Default | Zod Schema | Error |
|-------|------|---------|------------|-------|
| `id` | string | — | `z.string().min(1)` | "id is required" |

### set_common_repetition Input

| Field | Type | Default | Zod Schema | Error |
|-------|------|---------|------------|-------|
| `id` | string | — | `z.string().min(1)` | "id is required" |
| `preset` | PresetName | — | `z.enum(['daily', 'weekdays', ...])` | "Invalid preset. Must be one of: daily, weekdays, weekly, biweekly, monthly, monthly_last_day, quarterly, yearly" |
| `days` | string[] | — | `z.array(z.enum(['MO', ...])).optional()` | "Invalid day: '{day}'. Must be one of: MO, TU, WE, TH, FR, SA, SU" |
| `dayOfMonth` | number | — | `z.number().int().min(1).max(31).optional()` | "Invalid dayOfMonth: must be 1-31" |

**Cross-field Validation:**

- `days` is only valid with `weekly` or `biweekly` preset; silently ignored for
  others (not a validation error — follows the principle of least surprise for
  callers who may pass extra params)
- `dayOfMonth` is only valid with `monthly` or `quarterly` preset; silently
  ignored for others
- `dayOfMonth` values >28 may cause months to be skipped per RFC 5545 §3.3.10
  (e.g., `BYMONTHDAY=31` skips Feb, Apr, Jun, Sep, Nov). Use the
  `monthly_last_day` preset for "last day of month" behavior.

### set_advanced_repetition Input

| Field | Type | Default | Zod Schema | Error |
|-------|------|---------|------------|-------|
| `id` | string | — | `z.string().min(1)` | "id is required" |
| `ruleString` | string | — | `z.string().min(1).optional()` | — |
| `scheduleType` | ScheduleType | — | `z.enum(['Regularly', 'FromCompletion', 'None']).optional()` | "Invalid scheduleType. Must be one of: Regularly, FromCompletion, None" |
| `anchorDateKey` | AnchorDateKey | — | `z.enum(['DueDate', 'DeferDate', 'PlannedDate']).optional()` | "Invalid anchorDateKey. Must be one of: DueDate, DeferDate, PlannedDate" |
| `catchUpAutomatically` | boolean | — | `z.boolean().optional()` | — |

**Cross-field Validation:**

- If task has no existing rule AND `ruleString` is not provided → error:
  "ruleString is required when the task has no existing repetition rule"
- Requires OmniFocus v4.7+ — returns version error on older versions
- All optional params use `.optional()` (absent = merge from existing rule).
  There is no distinct "explicit null" semantic.

---

## API Response Formats

### get_repetition Response

```typescript
// Success — rule exists
{
  success: true,
  id: string,        // resolved task ID (even for project inputs)
  name: string,      // task/project name
  hasRule: true,
  rule: RepetitionRuleData
}

// Success — no rule
{
  success: true,
  id: string,
  name: string,
  hasRule: false,
  rule: null
}

// Error
{
  success: false,
  error: string
}
```

### set_repetition / set_common_repetition / set_advanced_repetition Response

```typescript
// Success
{
  success: true,
  id: string,        // resolved task ID
  name: string,
  ruleString: string  // the ICS rule string that was set
}

// Error
{
  success: false,
  error: string
}
```

### clear_repetition Response

```typescript
// Success
{
  success: true,
  id: string,
  name: string
}

// Error
{
  success: false,
  error: string
}
```

---

## Relationships

```text
┌──────────────────────────┐
│       Task/Project       │
├──────────────────────────┤
│ id: string               │
│ name: string             │
│ repetitionRule?          │──────┐
└──────────────────────────┘      │
         │                        │ 0..1
         │ project.task           │
         │ (root task)            ▼
         │              ┌──────────────────────────┐
         │              │   Task.RepetitionRule     │
         │              ├──────────────────────────┤
         │              │ ruleString: String (r/o)  │
         │              │ method: Method (r/o, dep) │
         │              │ scheduleType: Type (r/o)  │ ← v4.7+
         │              │ anchorDateKey: Key (r/o)  │ ← v4.7+
         │              │ catchUpAutomatically (r/o)│ ← v4.7+
         │              └──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│       Project            │
├──────────────────────────┤
│ task: Task (root)        │ ← repetition rule lives here
└──────────────────────────┘
```

---

## OmniJS Object Mapping

| TypeScript Type | OmniJS Property | Notes |
|-----------------|-----------------|-------|
| `id` (resolved) | `task.id.primaryKey` | UUID string |
| `name` | `task.name` | String |
| `ruleString` | `task.repetitionRule.ruleString` | ICS format |
| `scheduleType` | `task.repetitionRule.scheduleType.name` | v4.7+ enum name |
| `anchorDateKey` | `task.repetitionRule.anchorDateKey.name` | v4.7+ enum name |
| `catchUpAutomatically` | `task.repetitionRule.catchUpAutomatically` | Boolean |
| `method` | `task.repetitionRule.method.name` | Deprecated enum name |
| Project resolution | `Project.byIdentifier(id).task` | Root task |
