# Research: Notifications

**Date**: 2026-03-17
**Feature**: 006-notifications
**Source**: OmniAutomation official docs + code examples

## Decision 1: Notification Property Access Model

**Decision**: Use kind-conditional property access with `initialFireDate` as universal field.

**Rationale**: The OmniJS API enforces strict kind-based access:
- `absoluteFireDate` — ONLY Absolute kind; throws on DueRelative/DeferRelative
- `relativeFireOffset` — ONLY DueRelative/DeferRelative; throws on Absolute
- `initialFireDate` — Works for ALL kinds (read-only, dynamically computed)
- `nextFireDate` — Works for ALL kinds (null if fired and non-repeating)

**Alternatives considered**:
- Try-catch each property: Rejected — masks API design, fragile
- Always return null for inapplicable fields: Rejected — misleading

**Source**: [OmniJS API Reference](https://omni-automation.com/omnifocus/OF-API.html)

## Decision 2: Offset Unit is SECONDS

**Decision**: Use seconds for `addNotification(Number)` and `relativeFireOffset`.

**Rationale**: Official code examples on omni-automation.com consistently use seconds:
- `-300` → "5-minutes Before Due" (300 sec = 5 min)
- `-3600` → "hour before" (3600 sec = 1 hr)
- `-86400` → "day before" (86400 sec = 1 day)

The official Task-to-Project script passes `relativeFireOffset` directly to `addNotification()`
with no conversion, confirming both use the same unit.

The task-notifications.html page explicitly states: "provide a positive or negative integer,
indicating the number of **seconds** before (negative), or after (positive), to due date/time."

The `relativeFireOffset` API docs say "minutes" — this appears to be a documentation error.

**Alternatives considered**:
- Use minutes (per API docs text): Rejected — contradicted by all code examples
- Defer to implementation: Rejected — too risky, would create 60x errors

**Verification required**: Confirm in OmniFocus Script Editor during implementation:
```javascript
// In Script Editor, create a task with due date, then:
var task = flattenedTasks[0]; // pick a task with dueDate
task.addNotification(-3600);  // should be 1 hour before
var notif = task.notifications[task.notifications.length - 1];
console.log(notif.relativeFireOffset); // expect -3600 (seconds) or -60 (minutes)
```

## Decision 3: Snooze Restricted to Absolute Kind

**Decision**: `snooze_notification` only works on Absolute notifications.

**Rationale**: OmniJS throws when getting/setting `absoluteFireDate` on non-Absolute
notifications. There is no API to snooze relative notifications programmatically.

**Alternatives considered**:
- Convert relative to absolute (remove + add): Rejected — changes notification kind, surprising behavior
- Accept force flag: Rejected — adds complexity for uncommon case

**Source**: API docs: "Getting or setting this property throws an error if this notification's
kind is not absolute."

## Decision 4: Script Execution via stdin (No Temp Files)

**Decision**: Use `executeOmniJS(scriptContent)` which pipes via stdin.

**Rationale**: The codebase already uses stdin piping to `osascript`, not temp files.
This eliminates filesystem I/O and cleanup. All existing primitives follow this pattern.

**Alternatives considered**:
- Temp files with cleanup: Rejected — not the established pattern in the codebase

## Decision 5: Positive Offsets Are Valid

**Decision**: Accept any finite number for `offsetSeconds` (positive = after due, negative = before due).

**Rationale**: Official docs explicitly state: "provide a positive or negative integer,
indicating the number of seconds before (negative), or after (positive), to due date/time."

**Alternatives considered**:
- Restrict to negative only: Rejected — contradicts API documentation
- Warn on positive: Rejected — unnecessary; AI assistant can judge context

## Decision 6: Reuse Task Identifier + Disambiguation Pattern

**Decision**: Reuse the `id`/`name` identifier pattern and disambiguation error from task-tools.

**Rationale**: All existing task-operating tools use `id` (optional) + `name` (optional) with
at least one required. Disambiguation returns `DISAMBIGUATION_REQUIRED` code with `matchingIds`.
The notification tools operate on tasks, so the same pattern applies exactly.

**Source**: `src/contracts/task-tools/shared/disambiguation.ts`, `src/tools/primitives/appendNote.ts`

## Decision 7: Pre-condition Uses effectiveDueDate

**Decision**: Use `task.effectiveDueDate` (not `task.dueDate`) for the due-date pre-condition check.

**Rationale**: The official API explicitly states: "Specifying a due relative notification when
this task's **effectiveDueDate** is not set will result in an error." `effectiveDueDate` includes
inherited due dates from containing projects/action groups; `dueDate` is task-local only.

Note: Official code examples use `task.dueDate` for the guard check, but the API validates
`effectiveDueDate` internally. Using `effectiveDueDate` in our pre-check is more correct and
prevents confusing errors where a task inherits a due date from its container.

**Alternatives considered**:
- Use `task.dueDate` (matches code examples): Rejected — may miss inherited due dates
- Check both: Rejected — unnecessary, `effectiveDueDate` covers both

**Source**: task.html, OF-API.html — "Specifying a due relative notification when this task's
effectiveDueDate is not set will result in an error."

## Decision 8: DeferRelative Enum Status

**Decision**: Include DeferRelative in our Kind schema but flag for Script Editor verification.

**Rationale**: The official `Task.Notification.Kind` enum lists only 3 values: Absolute,
DueRelative, Unknown. DeferRelative is NOT listed. However:
- `relativeFireOffset` docs say it works for "DueRelative or DeferRelative"
- `initialFireDate` docs say "For due or defer-relative notifications, this date will change..."
- DeferRelative notifications exist at runtime (created when tasks have defer dates)

The official Task-to-Project script only handles Absolute and DueRelative, skipping DeferRelative
entirely. This suggests DeferRelative is a valid runtime kind but undocumented in the enum.

**Risk**: If `Task.Notification.Kind.DeferRelative` doesn't exist as an enum constant, these
notifications may report as "Unknown" kind. Implementation must handle this gracefully by
string-comparing the kind value rather than relying solely on the enum constant.

**Verification**: Check in Script Editor: `Task.Notification.Kind.DeferRelative` — does it exist?

**Source**: OF-API.html (Task.Notification.Kind section), task-notifications.html, task-to-project.html

## Decision 9: Index Bounds Pre-validation

**Decision**: Pre-validate notification index bounds in OmniJS scripts before calling
`removeNotification()` or accessing kind-conditional properties.

**Rationale**: JavaScript `array[outOfBounds]` returns `undefined`. Passing `undefined` to
`removeNotification()` throws a generic OmniJS error ("Supplying a notification that is not
in this task's notifications array...results in an error"). Our own bounds check provides
a much clearer error message with the actual count and valid range.

**Source**: task.html — `removeNotification` error description

## Decision 10: Seconds/Minutes Contingency

**Decision**: Proceed with seconds assumption; document explicit contingency plan if wrong.

**Rationale**: The evidence overwhelmingly supports seconds:
1. `-300` = "5-minutes Before Due" (300sec=5min; 300min=5hrs — makes no sense)
2. Task-to-Project script passes `relativeFireOffset` to `addNotification()` with no conversion
3. task-notifications.html explicitly says "seconds"

The only contradicting source is OF-API.html which says `relativeFireOffset` is "minutes".

**Contingency if verification reveals minutes**:
- Divide all preset offset values by 60 (-86400→-1440, -3600→-60, -900→-15, -604800→-10080)
- Rename `offsetSeconds` parameter to `offsetMinutes` in FR-012 and contracts
- Update FR-028 preset values accordingly
- Update all test expectations

**Source**: task-notifications.html, task-to-project.html, OF-API.html
