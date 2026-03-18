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

**Decision**: Include DeferRelative in our Kind schema with defensive runtime detection.

**Rationale**: The official `Task.Notification.Kind` enum listing shows only 3 values: Absolute,
DueRelative, Unknown. DeferRelative is NOT listed. However, the official property documentation
on the same page explicitly references it:

- `relativeFireOffset` docs: "throws an error if this notification's kind is not either DueRelative **or DeferRelative**"
- `initialFireDate` docs: "For **due or defer-relative** notifications, this date will change..."
- OF-API.html `relativeFireOffset` entry also confirms DeferRelative as a valid kind
- DeferRelative notifications exist at runtime (created when tasks have defer dates)

This documentation inconsistency (enum section omits it, property section references it) is a
classic docs-lagging-code pattern — the enum section was written first, and when DeferRelative
was added, only the property descriptions were updated.

**Confidence**: Medium-High that DeferRelative exists at runtime. Zero external code (GitHub,
forums, community plugins) was found using `Task.Notification.Kind.DeferRelative`, but the
official property docs referencing it is strong evidence.

**Verification script** (definitive test for Script Editor):

```javascript
(function() {
  try {
    var kinds = Task.Notification.Kind.all;
    var names = kinds.map(function(k) { return String(k); });
    return JSON.stringify({
      count: kinds.length,
      values: names,
      hasDeferRelative: typeof Task.Notification.Kind.DeferRelative !== 'undefined',
      deferRelativeValue: String(Task.Notification.Kind.DeferRelative || 'undefined')
    });
  } catch(e) {
    return JSON.stringify({ error: e.message || String(e) });
  }
})();
```

**Defensive implementation pattern**:

```javascript
var kindName;
if (notif.kind === Task.Notification.Kind.Absolute) kindName = 'Absolute';
else if (notif.kind === Task.Notification.Kind.DueRelative) kindName = 'DueRelative';
else if (Task.Notification.Kind.DeferRelative && notif.kind === Task.Notification.Kind.DeferRelative) kindName = 'DeferRelative';
else kindName = 'Unknown';
```

**Source**: OF-API.html (Task.Notification.Kind section + relativeFireOffset entry),
task-notifications.html (relativeFireOffset + initialFireDate property docs),
OmniGroup Forums (no DeferRelative usage found), GitHub community plugins (no usage found)

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

## Decision 11: Invalid Date Defense for absoluteFireDate

**Decision**: Validate Date objects with `isNaN(date.getTime())` at both TypeScript and OmniJS
layers before setting `absoluteFireDate`.

**Rationale**: The OmniJS Objective-C bridge performs strict JavaScript **type** validation —
passing a non-Date value (Number, String, null) throws a clear error ("Property requires a
Date, but was passed value of type X"). This was confirmed via OmniGroup forum thread where
`Date.setDate()` (returns Number, not Date) triggered this exact error on the `deferDate`
property (same bridge mechanism as `absoluteFireDate`).

However, the bridge does NOT validate Date **validity**. JavaScript's `new Date("invalid")`
creates a Date object (`instanceof Date === true`) with `getTime() === NaN`. This passes
the bridge's type check because it IS a Date. The behavior at the JavaScriptCore→NSDate
conversion is undefined — NSDate has no concept of "invalid" (every NSDate represents a
valid timestamp). A NaN timestamp has no NSDate equivalent.

Possible outcomes of passing an Invalid Date through the bridge:

1. JSC-to-NSDate conversion throws (best case, but undocumented)
2. Silent corruption (wrong fire date — epoch 0, distant past/future, or default)
3. Null assignment (bridge converts NaN to nil)
4. Application crash (unhandled exception in OmniFocus internals)

**Defensive pattern**:

```javascript
// In OmniJS script — defense-in-depth guard
var dateObj = new Date(dateString);
if (isNaN(dateObj.getTime())) {
  return JSON.stringify({
    success: false,
    error: "Invalid date value: " + dateString
  });
}
notification.absoluteFireDate = dateObj;
```

This follows the established pattern in `src/utils/dateFormatting.ts` (line 17) which uses
`Number.isNaN(date.getTime())` for validation.

**Source**: OmniGroup Forums (deferDate type error thread: discourse.omnigroup.com/t/deferdate-property-and-date-issue/59401),
omni-automation.com (Shared Date Class, Task Notifications), MDN (Date constructor specification)
