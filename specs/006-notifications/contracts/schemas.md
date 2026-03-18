# Contract Schemas: Notifications

**Feature**: 006-notifications
**Purpose**: Design reference for Zod schema implementation.

## Shared Schemas

### TaskIdentifierSchema

```typescript
// src/contracts/notification-tools/shared/task-identifier.ts
// NOTE: Uses .min(1) to reject empty/whitespace-only strings,
// following the pattern established by delete-project.ts and delete-tag.ts
export const TaskIdentifierSchema = z
  .object({
    taskId: z.string().min(1).optional().describe('Task ID (takes precedence)'),
    taskName: z.string().min(1).optional().describe('Task name (disambiguation if ambiguous)')
  })
  .refine((d) => d.taskId !== undefined || d.taskName !== undefined, {
    message: 'At least one of taskId or taskName is required'
  });
```

### NotificationKindSchema

```typescript
// src/contracts/notification-tools/shared/notification.ts
export const NotificationKindSchema = z.enum([
  'Absolute',
  'DueRelative',
  'DeferRelative',
  'Unknown'
]);
```

### NotificationOutputSchema

```typescript
const NotificationBaseSchema = z.object({
  index: z.number().int().min(0),
  kind: NotificationKindSchema,
  initialFireDate: z.string().describe('ISO 8601 computed fire datetime'),
  nextFireDate: z.string().nullable().describe('ISO 8601 next fire time; null if already fired'),
  isSnoozed: z.boolean(),
  repeatInterval: z.number().nullable().describe('Seconds between repeats; null if non-repeating')
});

const AbsoluteNotificationSchema = NotificationBaseSchema.extend({
  kind: z.literal('Absolute'),
  absoluteFireDate: z.string().describe('ISO 8601 absolute fire datetime')
});

const RelativeNotificationSchema = NotificationBaseSchema.extend({
  kind: z.enum(['DueRelative', 'DeferRelative']),
  relativeFireOffset: z.number().describe('Offset in seconds from due/defer date')
});

const UnknownNotificationSchema = NotificationBaseSchema.extend({
  kind: z.literal('Unknown')
});

export const NotificationOutputSchema = z.discriminatedUnion('kind', [
  AbsoluteNotificationSchema,
  RelativeNotificationSchema,
  UnknownNotificationSchema
]);
```

## Design Decisions

### Discriminated Union Field Requiredness

In Zod discriminated unions, each variant's fields are **required within that variant** by default.
For `add_notification` input: when `type: "absolute"`, `dateTime` is required (not optional);
when `type: "relative"`, `offsetSeconds` is required (not optional). This is enforced by Zod's
type system — no additional refinement needed.

### RelativeNotificationSchema Grouping

`DueRelative` and `DeferRelative` are grouped into a single `RelativeNotificationSchema` variant
because they share the same additional field (`relativeFireOffset`). The consumer distinguishes
which base date applies via the `kind` field (DueRelative → due date, DeferRelative → defer date).
This grouping is intentional and simplifies the discriminated union from 4 to 3 variants.

### ISO 8601 Convention

Following established codebase convention (task-tools, project-tools, review-tools):

- **Input**: Accept any string parseable by JavaScript `new Date()` — no profile restriction.
  Schema uses `z.string()` with "ISO 8601" description.
- **Output**: Always full datetime from OmniJS `.toISOString()` (e.g., "2025-01-15T09:00:00.000Z").

### Remove Response Convention

`remove_notification` returns `{ removedIndex, remainingCount }` without the removed notification's
full details. This follows the established delete/remove pattern: `delete_project` returns
`{ id, name, message }`, `delete_tag` returns `{ id, name }` — identification + confirmation,
not the full deleted object (which no longer exists).

## Tool Schemas

### list_notifications

```typescript
// Input
{ taskId?: string, taskName?: string }  // at least one required

// Success
{
  success: true,
  taskId: string,
  taskName: string,
  count: number,
  notifications: NotificationOutput[]
}

// Error
{ success: false, error: string }
// or DisambiguationError { success: false, error: string, code: "DISAMBIGUATION_REQUIRED", matchingIds: string[] }
```

### add_notification

```typescript
// Input (absolute)
{ taskId?: string, taskName?: string, type: "absolute", dateTime: string }

// Input (relative)
{ taskId?: string, taskName?: string, type: "relative", offsetSeconds: number }

// Success
{
  success: true,
  taskId: string,
  taskName: string,
  notification: NotificationOutput  // the added notification
}
```

### remove_notification

```typescript
// Input
{ taskId?: string, taskName?: string, index: number }

// Success
{
  success: true,
  taskId: string,
  taskName: string,
  removedIndex: number,
  remainingCount: number
}
```

### add_standard_notifications

```typescript
// Input
{ taskId?: string, taskName?: string, preset: "day_before" | "hour_before" | "15_minutes" | "week_before" | "standard" }

// Success
{
  success: true,
  taskId: string,
  taskName: string,
  addedCount: number,
  notifications: NotificationOutput[]  // the added notifications
}
```

### snooze_notification

```typescript
// Input
{ taskId?: string, taskName?: string, index: number, snoozeUntil: string }

// Success
{
  success: true,
  taskId: string,
  taskName: string,
  notification: NotificationOutput  // the snoozed notification (updated)
}

// Kind error
{ success: false, error: "Cannot snooze notification at index {N}: only Absolute notifications can be snoozed (this notification is {kind})" }
```
