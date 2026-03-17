# Feature Specification: Notifications

**Feature Branch**: `006-notifications`
**Created**: 2026-03-17
**Status**: Draft
**Phase**: 6 of 20
**Tools**: 5 (`list_notifications`, `add_notification`, `remove_notification`, `add_standard_notifications`, `snooze_notification`)

## Overview

The Notifications feature provides tools for managing OmniFocus task notifications
(reminders) through the MCP server. Notifications alert users at specific times
or relative to task due/defer dates, forming an essential part of the GTD capture
and reminder workflow.

### Business Value

- **GTD Compliance**: Notifications ensure tasks surface at the right time, preventing items from falling through the cracks
- **Flexible Reminders**: Support for absolute dates, relative offsets, and presets covers all reminder strategies
- **AI-Powered Scheduling**: AI assistants can intelligently suggest and set reminders based on task context
- **Batch Presets**: Standard notification presets enable rapid setup of common reminder patterns

### Phase 5 Context

This phase builds on Phases 0-5 which established:

- Task CRUD operations (`list_tasks`, `get_task`, `set_planned_date`, `append_note`)
- Project management and review system
- Established OmniJS execution patterns, error handling, and batch operation conventions

Phase 6 adds dedicated notification management tools for per-task reminders.

## Clarifications

### Session 2026-03-17

- Q: What notification properties should `list_notifications` return given that `absoluteFireDate` throws on relative notifications and `relativeFireOffset` throws on absolute? → A: Return `initialFireDate` (universal) + `nextFireDate` + kind-conditional fields (`absoluteFireDate` for Absolute, `relativeFireOffset` for relative kinds)
- Q: How should `snooze_notification` handle relative (DueRelative/DeferRelative) notifications, given `absoluteFireDate` throws on them? → A: Restrict snooze to Absolute kind only; return error for relative kinds explaining the API limitation
- Q: `addNotification(Number)` code examples use seconds but `relativeFireOffset` docs say "minutes" — which unit? → A: Both use SECONDS (same unit). Evidence: (1) official Task-to-Project script passes `relativeFireOffset` directly to `addNotification()` with no conversion; (2) task-notifications.html explicitly states "provide a positive or negative integer, indicating the number of **seconds**". The "minutes" in the relativeFireOffset API docs is incorrect. Still flag for Script Editor verification during plan phase.
- Q: Should `add_notification` accept positive `offsetSeconds` values (after due date)? → A: Yes, per official docs: "provide a positive or negative integer, indicating the number of seconds before (negative), or after (positive), to due date/time". Accept any finite number.

## Assumptions

- Notifications are managed per-task (not per-project). To set notifications for project tasks, the AI assistant calls the tool for each task individually.
- `add_standard_notifications` appends preset notifications without clearing existing ones. Users call `remove_notification` first if they want to replace.
- `snooze_notification` accepts an absolute datetime (ISO 8601). "Snooze to a later time" means setting a specific future time.
- Only Absolute and DueRelative notifications can be added via `add_notification`. DeferRelative notifications are reported by `list_notifications` but creating them is out of scope (OmniFocus creates these internally when defer dates exist).
- Notification indices are 0-based, matching the order returned by `list_notifications` and `task.notifications` array order.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - List Task Notifications (Priority: P1)

As a GTD practitioner, I want to list all notifications on a task so I can see
what reminders are set and make informed decisions about adding or removing them.

**Why this priority**: This is the foundational tool - users must see existing
notifications before they can add, remove, or snooze them. Without visibility,
all other notification operations lack context.

**Independent Test**: Can be fully tested by calling `list_notifications` with
a task ID and verifying it returns the notification array with kind, fire date,
and offset details. Delivers immediate value by surfacing reminder state.

**Acceptance Scenarios**:

1. **Given** a task with two notifications (one absolute, one due-relative),
   **When** I call `list_notifications` with the task ID,
   **Then** I receive an array of 2 notifications, each with `index`, `kind`, `initialFireDate`, `isSnoozed`, and kind-conditional fields (`absoluteFireDate` for absolute, `relativeFireOffset` for relative).

2. **Given** a task with no notifications,
   **When** I call `list_notifications` with the task ID,
   **Then** I receive an empty array with `count: 0`.

3. **Given** a task identified by name,
   **When** I call `list_notifications` with the task name,
   **Then** I receive the same notification details as with an ID lookup.

4. **Given** a task name that matches multiple tasks,
   **When** I call `list_notifications` with that name,
   **Then** I receive a disambiguation error with candidate task IDs.

5. **Given** a snoozed notification,
   **When** I call `list_notifications`,
   **Then** the snoozed notification shows `isSnoozed: true` and the updated `initialFireDate` reflecting the snooze target time.

---

### User Story 2 - Add Notification (Priority: P1)

As a GTD practitioner, I want to add a notification at a specific date/time or
relative to the due date so I am reminded at the right moment.

**Why this priority**: Adding notifications is the core write operation. Users
need both absolute reminders ("remind me Tuesday at 9am") and relative
reminders ("1 hour before due") to cover all GTD reminder patterns.

**Independent Test**: Can be tested by calling `add_notification` and verifying
the task's notification array grows by one with the correct kind and fire date.

**Acceptance Scenarios**:

1. **Given** a task with ID "abc123",
   **When** I call `add_notification` with `type: "absolute"` and `dateTime: "2026-04-01T09:00:00"`,
   **Then** an Absolute notification is added firing at that exact time.

2. **Given** a task with a due date of "2026-04-01T17:00:00",
   **When** I call `add_notification` with `type: "relative"` and `offsetSeconds: -3600`,
   **Then** a DueRelative notification is added firing 1 hour before the due date.

3. **Given** a task WITHOUT a due date,
   **When** I call `add_notification` with `type: "relative"` and `offsetSeconds: -3600`,
   **Then** I receive an error: "Cannot add relative notification: task has no due date".

4. **Given** a valid task,
   **When** I call `add_notification` with `type: "absolute"` and a past datetime,
   **Then** the notification is added successfully (OmniFocus allows past notifications; they fire immediately).

5. **Given** a task identified by name,
   **When** I call `add_notification` with the name and notification details,
   **Then** the notification is added to the resolved task.

6. **Given** a task name matching multiple tasks,
   **When** I call `add_notification`,
   **Then** I receive a disambiguation error with candidate task IDs.

---

### User Story 3 - Remove Notification (Priority: P2)

As a GTD practitioner, I want to remove a specific notification from a task so I
can clean up reminders that are no longer relevant.

**Why this priority**: Removing notifications completes the CRUD cycle. Users
need to clean up outdated or unwanted reminders, especially when task timelines
change.

**Independent Test**: Can be tested by calling `remove_notification` with a task
ID and notification index, then verifying the notification array shrinks by one.

**Acceptance Scenarios**:

1. **Given** a task with 3 notifications,
   **When** I call `remove_notification` with `index: 1`,
   **Then** the second notification is removed and the remaining count is 2.

2. **Given** a task with 2 notifications,
   **When** I call `remove_notification` with `index: 5` (out of bounds),
   **Then** I receive an error: "Notification index 5 out of range (task has 2 notifications, valid indices: 0-1)".

3. **Given** a task with no notifications,
   **When** I call `remove_notification` with `index: 0`,
   **Then** I receive an error: "Task has no notifications to remove".

4. **Given** a task identified by name,
   **When** I call `remove_notification` with the name and index,
   **Then** the notification at that index is removed from the resolved task.

---

### User Story 4 - Add Standard Notification Presets (Priority: P2)

As a GTD practitioner, I want to add standard notification presets (day before,
hour before, 15 minutes, week before) for quick reminder setup without
calculating offsets manually.

**Why this priority**: Presets dramatically speed up the most common reminder
patterns. Most GTD users want "remind me the day before" without thinking in
minutes.

**Independent Test**: Can be tested by calling `add_standard_notifications` with
a preset name and verifying the correct relative notifications are added.

**Acceptance Scenarios**:

1. **Given** a task with a due date,
   **When** I call `add_standard_notifications` with `preset: "day_before"`,
   **Then** one DueRelative notification is added with offset -86400 seconds.

2. **Given** a task with a due date,
   **When** I call `add_standard_notifications` with `preset: "hour_before"`,
   **Then** one DueRelative notification is added with offset -3600 seconds.

3. **Given** a task with a due date,
   **When** I call `add_standard_notifications` with `preset: "15_minutes"`,
   **Then** one DueRelative notification is added with offset -900 seconds.

4. **Given** a task with a due date,
   **When** I call `add_standard_notifications` with `preset: "week_before"`,
   **Then** one DueRelative notification is added with offset -604800 seconds.

5. **Given** a task with a due date,
   **When** I call `add_standard_notifications` with `preset: "standard"`,
   **Then** two DueRelative notifications are added: -86400 (day before) and -3600 (hour before).

6. **Given** a task WITHOUT a due date,
   **When** I call `add_standard_notifications` with any preset,
   **Then** I receive an error: "Cannot add preset notifications: task has no due date".

7. **Given** a task that already has a -86400 offset notification,
   **When** I call `add_standard_notifications` with `preset: "day_before"`,
   **Then** a second -86400 notification is added (presets are additive, not idempotent).

---

### User Story 5 - Snooze Notification (Priority: P3)

As a GTD practitioner, I want to snooze a notification to a later time so I can
defer a reminder without removing it entirely.

**Why this priority**: Snoozing is a convenience operation. Users can achieve
the same result by removing and re-adding, but snooze preserves the notification
identity and is a familiar UX pattern.

**Independent Test**: Can be tested by calling `snooze_notification` with a task
ID, notification index, and target datetime, then verifying the notification's
`absoluteFireDate` is updated.

**Acceptance Scenarios**:

1. **Given** a task with a notification at index 0,
   **When** I call `snooze_notification` with `index: 0` and `snoozeUntil: "2026-04-01T14:00:00"`,
   **Then** the notification's `absoluteFireDate` is set to the snooze target time.

2. **Given** a task with a notification at index 0,
   **When** I call `snooze_notification` with `index: 3` (out of bounds),
   **Then** I receive an error: "Notification index 3 out of range (task has 1 notification, valid indices: 0-0)".

3. **Given** a snoozed notification,
   **When** I call `snooze_notification` again with a new time,
   **Then** the `absoluteFireDate` is updated to the new snooze time (re-snooze supported).

4. **Given** a snooze time in the past,
   **When** I call `snooze_notification`,
   **Then** the snooze is applied (OmniFocus allows past dates; the notification fires immediately).

5. **Given** a DueRelative notification at index 0,
   **When** I call `snooze_notification` with `index: 0`,
   **Then** I receive an error: "Cannot snooze notification at index 0: only Absolute notifications can be snoozed (this notification is DueRelative)".

---

### Edge Cases

- **Task not found**: All tools return "Task not found: {identifier}" when task ID/name is invalid.

- **Disambiguation**: All tools that accept task name follow the established
  disambiguation pattern — return error with candidates array when multiple tasks match.

- **Completed/Dropped tasks**: Notifications can be managed on tasks in any
  status. OmniFocus does not prevent notification operations on completed tasks.

- **Notification index stability**: Indices correspond to the order in
  `task.notifications` at the time of the call. Removing a notification shifts
  subsequent indices. Users should call `list_notifications` before
  `remove_notification` or `snooze_notification` to get current indices.

- **Duplicate notifications**: OmniFocus allows multiple notifications with the
  same fire date/offset. The tools do not deduplicate — this is the user's
  responsibility.

- **Relative offset sign convention**: Per official docs: "provide a positive or
  negative integer, indicating the number of seconds before (negative), or after
  (positive), to due date/time". Both positive and negative values are valid.
  All values are in seconds. **⚠️ Verify unit in Script Editor during plan phase.**

- **DeferRelative notifications**: These are created by OmniFocus when a task has
  a defer date. `list_notifications` reports them with `kind: "DeferRelative"`,
  but `add_notification` does not support creating them (OmniFocus manages these
  internally).

---

## Requirements *(mandatory)*

### Functional Requirements - list_notifications

- **FR-001**: Tool MUST accept task identifier as either `taskId` (string) or `taskName` (string)
- **FR-002**: Tool MUST return disambiguation error when `taskName` matches multiple tasks
- **FR-003**: Tool MUST return an array of notification objects for the specified task
- **FR-004**: Each notification object MUST include: `index` (number), `kind` (string), `initialFireDate` (ISO 8601 string), `nextFireDate` (ISO 8601 string or null), `isSnoozed` (boolean), `repeatInterval` (number or null, in seconds)
- **FR-004a**: When `kind` is "Absolute", notification object MUST additionally include `absoluteFireDate` (ISO 8601 string)
- **FR-004b**: When `kind` is "DueRelative" or "DeferRelative", notification object MUST additionally include `relativeFireOffset` (number, in seconds — same unit as `addNotification(Number)`; **⚠️ verify in Script Editor during plan phase**)
- **FR-005**: Tool MUST return `count` indicating total number of notifications
- **FR-006**: Tool MUST return `taskId` and `taskName` in the response for context
- **FR-007**: `kind` MUST be one of: "Absolute", "DueRelative", "DeferRelative", "Unknown"
- **FR-008**: Tool MUST return notifications in the same order as `task.notifications` array (index 0 = first notification)

### Functional Requirements - add_notification

- **FR-009**: Tool MUST accept task identifier as either `taskId` or `taskName`
- **FR-010**: Tool MUST accept `type` parameter: "absolute" or "relative"
- **FR-011**: When `type: "absolute"`, Tool MUST accept `dateTime` as ISO 8601 string
- **FR-012**: When `type: "relative"`, Tool MUST accept `offsetSeconds` as number (negative = before due; unit is seconds per OmniJS code examples)
- **FR-013**: When `type: "relative"`, Tool MUST return error if task has no due date
- **FR-014**: Tool MUST return the added notification details including its index in the notification array
- **FR-015**: Tool MUST validate `dateTime` is a parseable ISO 8601 string
- **FR-016**: Tool MUST validate `offsetSeconds` is a finite number
- **FR-017**: Tool MUST return disambiguation error when `taskName` matches multiple tasks

### Functional Requirements - remove_notification

- **FR-018**: Tool MUST accept task identifier as either `taskId` or `taskName`
- **FR-019**: Tool MUST accept `index` as a non-negative integer
- **FR-020**: Tool MUST validate `index` is within bounds of `task.notifications` array
- **FR-021**: Tool MUST internally retrieve `task.notifications[index]` and pass the object to `task.removeNotification()`
- **FR-022**: Tool MUST return error with bounds information when index is out of range
- **FR-023**: Tool MUST return error when task has no notifications
- **FR-024**: Tool MUST return remaining notification count after removal
- **FR-025**: Tool MUST return disambiguation error when `taskName` matches multiple tasks

### Functional Requirements - add_standard_notifications

- **FR-026**: Tool MUST accept task identifier as either `taskId` or `taskName`
- **FR-027**: Tool MUST accept `preset` parameter with values: "day_before", "hour_before", "15_minutes", "week_before", "standard"
- **FR-028**: Preset offsets MUST be: `day_before` = -86400 sec, `hour_before` = -3600 sec, `15_minutes` = -900 sec, `week_before` = -604800 sec (**⚠️ verify unit in Script Editor**)
- **FR-029**: Preset `standard` MUST add two notifications: -86400 sec AND -3600 sec
- **FR-030**: Tool MUST return error if task has no due date (all presets are due-relative)
- **FR-031**: Tool MUST return details of all added notifications including their indices
- **FR-032**: Tool MUST be additive (append to existing notifications, never clear)
- **FR-033**: Tool MUST return disambiguation error when `taskName` matches multiple tasks

### Functional Requirements - snooze_notification

- **FR-034**: Tool MUST accept task identifier as either `taskId` or `taskName`
- **FR-035**: Tool MUST accept `index` as a non-negative integer
- **FR-036**: Tool MUST accept `snoozeUntil` as ISO 8601 datetime string
- **FR-037**: Tool MUST set `absoluteFireDate` on the notification at the specified index
- **FR-037a**: Tool MUST validate the notification at the specified index has `kind` of Absolute; return error if kind is DueRelative, DeferRelative, or Unknown (OmniJS throws when setting `absoluteFireDate` on non-Absolute notifications)
- **FR-038**: Tool MUST validate `index` is within bounds of `task.notifications` array
- **FR-039**: Tool MUST validate `snoozeUntil` is a parseable ISO 8601 string
- **FR-040**: Tool MUST return updated notification details after snooze
- **FR-041**: Tool MUST support re-snoozing (snoozing an already-snoozed notification)
- **FR-042**: Tool MUST return disambiguation error when `taskName` matches multiple tasks

### Error Handling Requirements

- **FR-043**: All tools MUST return structured error responses with `success: false`
- **FR-044**: Error responses MUST include actionable `error` message
- **FR-045**: Disambiguation errors MUST include `candidates` array with matching tasks (id + name)
- **FR-046**: All OmniJS scripts MUST use try-catch with JSON.stringify returns

### Key Entities

- **Notification**: Represents a reminder attached to a task
  - `index`: Position in the task's notification array (0-based)
  - `kind`: Type of notification (Absolute, DueRelative, DeferRelative, Unknown)
  - `initialFireDate`: The computed fire datetime (universal, works for all kinds; dynamically adjusts for relative notifications when due/defer dates change)
  - `nextFireDate`: Next fire time (null if already fired and non-repeating)
  - `absoluteFireDate`: *(Absolute kind only)* The absolute fire datetime; throws if accessed on relative kinds
  - `relativeFireOffset`: *(DueRelative/DeferRelative only)* Offset from due/defer date; throws if accessed on Absolute kind
  - `isSnoozed`: Whether the notification has been snoozed (read-only)
  - `repeatInterval`: Seconds between repeats (null if non-repeating, read-only)

- **Preset**: A named configuration that maps to one or more relative notification offsets (in seconds)
  - `day_before`: -86400 seconds (24 * 60 * 60)
  - `hour_before`: -3600 seconds (60 * 60)
  - `15_minutes`: -900 seconds (15 * 60)
  - `week_before`: -604800 seconds (7 * 24 * 60 * 60)
  - `standard`: combination of day_before + hour_before

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| Task not found | `Task not found: {identifier}` |
| Multiple task matches | `Multiple tasks match '{name}'. Use ID for precision.` |
| No due date (relative) | `Cannot add relative notification: task '{name}' has no due date` |
| No due date (presets) | `Cannot add preset notifications: task '{name}' has no due date` |
| Index out of range | `Notification index {index} out of range (task has {count} notifications, valid indices: 0-{max})` |
| No notifications | `Task '{name}' has no notifications to remove` |
| Invalid preset | `Invalid preset: '{preset}'. Must be one of: day_before, hour_before, 15_minutes, week_before, standard` |
| Invalid type | `Invalid notification type: '{type}'. Must be one of: absolute, relative` |
| Invalid dateTime | `Invalid dateTime: cannot parse '{value}' as ISO 8601` |
| Invalid offsetSeconds | `Invalid offsetSeconds: must be a finite number` |
| Invalid snoozeUntil | `Invalid snoozeUntil: cannot parse '{value}' as ISO 8601` |
| Snooze non-absolute | `Cannot snooze notification at index {index}: only Absolute notifications can be snoozed (this notification is {kind})` |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 5 tools correctly manage notifications on tasks verified through integration testing
- **SC-002**: `list_notifications` returns accurate notification details including kind, fire dates, and snooze status
- **SC-003**: `add_notification` correctly creates both Absolute and DueRelative notification types
- **SC-004**: `add_standard_notifications` adds the correct number of notifications per preset (1 for single presets, 2 for "standard")
- **SC-005**: `remove_notification` reliably removes the notification at the specified index
- **SC-006**: `snooze_notification` correctly updates `absoluteFireDate` on targeted notifications
- **SC-007**: All tools pass contract validation with Zod schemas
- **SC-008**: All tools handle disambiguation correctly (name matches multiple tasks -> error with candidates)
- **SC-009**: Relative notification tools correctly reject tasks without due dates
- **SC-010**: Integration tests verify round-trip: add notification -> list -> verify -> remove -> verify

### Definition of Done

- [ ] All functional requirements (FR-001 through FR-046) implemented
- [ ] Contract tests validate input/output schemas for all 5 tools
- [ ] Unit tests cover all acceptance scenarios
- [ ] Integration tests verify OmniFocus interaction
- [ ] Tools registered in MCP server
- [ ] README updated with new tools
- [ ] CLAUDE.md updated with phase status

---

## API Reference

### OmniFocus Omni Automation Properties

```javascript
// Task notification properties
task.notifications                    // Array of Task.Notification objects (read-only array)
task.addNotification(dateOrOffset)    // Add notification: Date for absolute, Number for relative
task.removeNotification(notification) // Remove notification: takes notification OBJECT, not index

// Notification object properties (universal — work for all kinds)
notification.kind                     // Task.Notification.Kind enum (read-only)
notification.initialFireDate          // Date r/o - computed fire time; adjusts with due/defer dates for relative kinds
notification.nextFireDate             // Date or null r/o - next fire time; null if already fired and non-repeating
notification.isSnoozed               // Boolean r/o - whether notification has been snoozed
notification.repeatInterval           // Number - seconds between repeats (0 = no repeat)
notification.task                     // Task or null r/o - the owning task

// Kind-conditional properties (THROW if accessed on wrong kind!)
notification.absoluteFireDate         // Date - ONLY for Absolute kind; throws on relative kinds
notification.relativeFireOffset       // Number - ONLY for DueRelative/DeferRelative; throws on Absolute

// Task.Notification.Kind enum
Task.Notification.Kind.Absolute       // Fires at specific date/time
Task.Notification.Kind.DueRelative    // Fires relative to due date
Task.Notification.Kind.DeferRelative  // Fires relative to defer date
Task.Notification.Kind.Unknown        // Invalid state
```

> **⚠️ UNIT VERIFICATION REQUIRED**: Official code examples use **seconds** for
> `addNotification(Number)` (-300 = 5min, -3600 = 1hr, -86400 = 1day), but the
> `relativeFireOffset` property docs say "minutes". Must verify in OmniFocus Script
> Editor during plan phase. Spec assumes seconds based on code examples.

### Adding Notifications

```javascript
// Absolute notification - pass a Date object
var fireDate = new Date("2026-04-01T09:00:00");
task.addNotification(fireDate);

// Relative notification - pass SECONDS offset (NEGATIVE = before due)
task.addNotification(-3600);   // 1 hour before due date (60 * 60)
task.addNotification(-86400);  // 1 day before due date (24 * 60 * 60)
task.addNotification(-900);    // 15 minutes before due (15 * 60)

// NOTE: addNotification(Number) creates a DueRelative notification
// Unit is SECONDS per official code examples
// Throws error if task.effectiveDueDate is not set
```

### Removing Notifications

```javascript
// MUST retrieve notification object by index first
// task.removeNotification() takes an OBJECT, not an index
var notif = task.notifications[index];
task.removeNotification(notif);
```

### Snoozing Notifications (Absolute kind ONLY)

```javascript
// Set absoluteFireDate to postpone the notification
// ONLY works on Absolute notifications — throws on DueRelative/DeferRelative
var notif = task.notifications[index];
if (notif.kind !== Task.Notification.Kind.Absolute) {
  throw new Error("Cannot snooze: only Absolute notifications support absoluteFireDate");
}
notif.absoluteFireDate = new Date("2026-04-01T14:00:00");
// After this, notification.isSnoozed becomes true
```

### Preset Offset Definitions

| Preset | Offset (seconds) | Equivalent |
|--------|------------------|------------|
| `day_before` | -86400 | 24 hours before due (24 * 60 * 60) |
| `hour_before` | -3600 | 1 hour before due (60 * 60) |
| `15_minutes` | -900 | 15 minutes before due (15 * 60) |
| `week_before` | -604800 | 7 days before due (7 * 24 * 60 * 60) |
| `standard` | -86400, -3600 | Day before + hour before |

### Important Constraints

1. **`removeNotification()` takes an object, not an index** — must retrieve `task.notifications[index]` first and pass the notification object to `task.removeNotification()`
2. **`addNotification(Number)` uses SECONDS** — per official code examples (-300 = 5min, -3600 = 1hr, -86400 = 1day). ⚠️ Verify in Script Editor during plan phase.
3. **`absoluteFireDate` ONLY works on Absolute kind** — getting or setting throws on DueRelative/DeferRelative. Use `initialFireDate` for universal fire date access.
4. **`relativeFireOffset` ONLY works on relative kinds** — getting or setting throws on Absolute. Access conditionally based on `kind`.
5. **Negative offsets = before due date** — this is the OmniFocus convention. -3600 means "1 hour before due".
6. **`absoluteFireDate` is writable (Absolute only)** — this is the mechanism for snoozing. Setting it changes when the notification fires.
7. **`isSnoozed` is read-only** — becomes true automatically when `absoluteFireDate` is changed on an Absolute notification.
8. **`repeatInterval` is in seconds** — read-only; editing repeat intervals is out of scope.
9. **Notification indices shift after removal** — removing notification at index 1 causes the former index 2 to become index 1. Users should re-list after removal.
10. **DeferRelative notifications** — created by OmniFocus when defer dates exist. `list_notifications` reports them but `add_notification` does not create them.
11. **`initialFireDate` is the universal fire date** — read-only, works for all kinds. For relative notifications, dynamically adjusts when due/defer dates change.

---

## Out of Scope

- Notification repeat interval editing (complex; defer to future enhancement)
- Push notification integration (platform limitation - OmniJS controls in-app alerts only)
- DeferRelative notification creation (OmniFocus manages these internally)
- Batch notification operations across multiple tasks (use per-task calls)
- Notification deduplication (OmniFocus allows duplicates; user's responsibility)
