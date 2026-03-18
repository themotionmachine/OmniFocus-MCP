# Data Model: Notifications

**Feature**: 006-notifications
**Date**: 2026-03-17

## Entities

### TaskIdentifier

Reused from `src/contracts/task-tools/shared/disambiguation.ts` pattern.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | One of id/name | OmniFocus task ID (takes precedence) |
| `name` | string | One of id/name | Task name (triggers disambiguation if ambiguous) |

**Validation**: At least one of `id` or `name` must be provided. `id` takes precedence.

### NotificationOutput

Returned by `list_notifications` for each notification on a task. Kind-conditional shape.

#### Base Fields (all kinds)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `index` | number | No | 0-based position in `task.notifications` array |
| `kind` | string enum | No | "Absolute", "DueRelative", "DeferRelative", "Unknown" |
| `initialFireDate` | ISO 8601 string | No | Computed fire datetime (universal, adjusts with due/defer) |
| `nextFireDate` | ISO 8601 string | Yes | Next fire time; null if already fired and non-repeating |
| `isSnoozed` | boolean | No | Whether notification has been snoozed |
| `repeatInterval` | number | Yes | Seconds between repeats; null if non-repeating |

#### Absolute-Only Fields

| Field | Type | Description |
|-------|------|-------------|
| `absoluteFireDate` | ISO 8601 string | The absolute fire datetime (writable for snooze) |

#### Relative-Only Fields (DueRelative, DeferRelative)

| Field | Type | Description |
|-------|------|-------------|
| `relativeFireOffset` | number | Offset in seconds from due/defer date (negative = before) |

### NotificationKind Enum

Maps 1:1 with `Task.Notification.Kind.*` constants in OmniJS.

| Value | OmniJS Constant | Description |
|-------|-----------------|-------------|
| `"Absolute"` | `Task.Notification.Kind.Absolute` | Fires at specific date/time |
| `"DueRelative"` | `Task.Notification.Kind.DueRelative` | Fires relative to due date |
| `"DeferRelative"` | `Task.Notification.Kind.DeferRelative` ⚠️ | Fires relative to defer date |
| `"Unknown"` | `Task.Notification.Kind.Unknown` | Invalid state |

> **DeferRelative Enum Status**: The official `Task.Notification.Kind` enum
> listing shows only 3 values: Absolute, DueRelative, Unknown. DeferRelative is
> NOT in the enum listing, but IS referenced in property documentation on the
> same page — `relativeFireOffset` says it "throws if kind is not DueRelative
> **or DeferRelative**" and `initialFireDate` references "due or defer-relative
> notifications". This documentation inconsistency strongly indicates
> DeferRelative exists at runtime but was omitted from the enum listing.
> **Verification**: run `Task.Notification.Kind.all` in Script Editor to
> enumerate all runtime values. **Defensive implementation**: check
> `Task.Notification.Kind.DeferRelative` existence at runtime; if absent, map
> to "Unknown". See research.md §Decision 8 for full analysis and verification
> script.

### Preset Enum

Named presets for `add_standard_notifications`.

| Preset | Offsets (seconds) | Notifications Added |
|--------|-------------------|---------------------|
| `"day_before"` | -86400 | 1 |
| `"hour_before"` | -3600 | 1 |
| `"15_minutes"` | -900 | 1 |
| `"week_before"` | -604800 | 1 |
| `"standard"` | -86400, -3600 | 2 |

## Relationships

```text
Task (1) ──── (0..*) Notification
  │                      │
  ├── id                 ├── index (0-based position)
  ├── name               ├── kind (Absolute|DueRelative|DeferRelative|Unknown)
  ├── dueDate ───────────├── relativeFireOffset (seconds, if relative)
  ├── deferDate ─────────├── absoluteFireDate (if absolute)
  └── notifications[]    ├── initialFireDate (computed, universal)
                         ├── nextFireDate (computed, nullable)
                         ├── isSnoozed (read-only)
                         └── repeatInterval (seconds, read-only)
```

### Pre-condition: effectiveDueDate

The OmniJS API validates `task.effectiveDueDate` (not `task.dueDate`) when
adding relative notifications. `effectiveDueDate` includes inherited due dates
from containing projects/action groups. `dueDate` is task-local only.

Pre-check in OmniJS scripts MUST use:

```javascript
if (!task.effectiveDueDate) {
  // error: no effective due date
}
```

### relativeFireOffset Base Date

The `relativeFireOffset` value is relative to different dates depending on kind:

- **DueRelative**: offset from `task.effectiveDueDate`
- **DeferRelative**: offset from `task.effectiveDeferDate`

The `kind` field in the response tells the consumer which base date applies.

## OmniJS Property Access Rules

| Property | Absolute | DueRelative | DeferRelative | Unknown |
|----------|----------|-------------|---------------|---------|
| `kind` | ✅ | ✅ | ✅ | ✅ |
| `initialFireDate` | ✅ | ✅ | ✅ | ✅ |
| `nextFireDate` | ✅ | ✅ | ✅ | ✅ |
| `isSnoozed` | ✅ | ✅ | ✅ | ✅ |
| `repeatInterval` | ✅ | ✅ | ✅ | ✅ |
| `absoluteFireDate` | ✅ | ❌ THROWS | ❌ THROWS | ❌ THROWS |
| `relativeFireOffset` | ❌ THROWS | ✅ | ✅ | ❌ THROWS |

**Critical**: Always check `kind` before accessing conditional properties.

## State Transitions

Notifications have no explicit state machine. Key behaviors:

1. **Creation**: `addNotification(Date)` → Absolute; `addNotification(Number)` → DueRelative
2. **Snooze**: Set `absoluteFireDate` on Absolute notification → `isSnoozed` becomes true
3. **Removal**: `removeNotification(object)` — requires object reference, not index
4. **Due date change**: DueRelative notifications auto-adjust `initialFireDate`
5. **Index shift**: Removing notification at index N shifts all indices > N down by 1
