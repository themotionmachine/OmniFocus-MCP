# API Workaround Requirements Quality Checklist

**Purpose**: Validate that OmniJS API constraints, workarounds, and edge cases are fully and clearly specified
**Created**: 2026-03-17
**Updated**: 2026-03-17 (all gaps remediated via official OmniAutomation docs research)
**Feature**: [spec.md](../spec.md) | [research.md](../research.md) | [data-model.md](../data-model.md)
**Focus**: Index-to-object translation, seconds convention, absoluteFireDate manipulation, no-due-date handling, DeferRelative vs DueRelative
**Depth**: Standard | **Audience**: Implementation reviewer

---

## Index-to-Object Translation (remove_notification)

- [x] CHK001 - Is the requirement that `removeNotification()` takes an object reference (not an index) explicitly stated with enough clarity for an implementor unfamiliar with OmniJS? [Clarity, Spec §FR-021 + §API Reference §1] — ✅ Was already specified in FR-021 and API Reference §1. Now expanded with OOB behavior in §1.
- [x] CHK002 - Does the spec define behavior when `task.notifications[index]` returns undefined (e.g., race condition or stale index)? [Edge Case, Gap] — ✅ RESOLVED: Added to Edge Cases and API Reference §1. JS `array[OOB]`→`undefined`; `removeNotification(undefined)` throws OmniJS error. Pre-validation required.
- [x] CHK003 - Are notification index shift semantics after removal (former index N+1 becomes N) specified as a user-facing constraint, not just an implementation detail? [Completeness, Spec §Edge Cases + §API Reference §9] — ✅ Was already in Edge Cases and API Reference §9.
- [x] CHK004 - Does the spec require users to call `list_notifications` before `remove_notification` or `snooze_notification` to obtain current indices, and is this documented as an explicit workflow requirement? [Completeness, Spec §Edge Cases] — ✅ Was already documented in Edge Cases: "Users should call `list_notifications` before `remove_notification` or `snooze_notification` to get current indices."

## Seconds Convention (relativeFireOffset / addNotification)

- [x] CHK005 - Is the unit discrepancy between official API docs ("minutes" for relativeFireOffset) and code examples (seconds) flagged with a mandatory verification gate before implementation? [Clarity, Spec §Clarifications Q3 + §API Reference note] — ✅ Was already flagged. Now reinforced with explicit contingency in API Reference §2.
- [x] CHK006 - Are preset offset values (FR-028: -86400, -3600, -900, -604800) defined in the same unit as `offsetSeconds` (FR-012) and `relativeFireOffset` (FR-004b), with explicit cross-reference? [Consistency, Spec §FR-028 + §FR-012 + §FR-004b] — ✅ All use seconds consistently. Preset table, FR-012, and FR-004b all specify seconds.
- [x] CHK007 - Is the acceptance criteria for confirming "unit is seconds" objectively measurable via the Script Editor verification script? [Measurability, Spec §API Reference note + research.md §Decision 2] — ✅ Verification script in quickstart.md and research.md §Decision 2.
- [x] CHK008 - Does the spec define a fallback strategy if Script Editor verification reveals the unit is actually minutes (e.g., which values change, which FRs are affected)? [Gap, Exception Flow] — ✅ RESOLVED: Added contingency to Clarifications Session 2 Q7, API Reference §2, and research.md §Decision 10. Explicit plan: ÷60 all presets, rename offsetSeconds→offsetMinutes.
- [x] CHK009 - Is the evidence chain (code examples → Task-to-Project script → task-notifications.html wording) documented clearly enough that a reviewer can independently verify the "seconds" conclusion? [Clarity, Spec §Clarifications Q3] — ✅ Full evidence chain in Clarifications Q3 and research.md §Decision 2.

## absoluteFireDate Manipulation (snooze)

- [x] CHK010 - Is the kind-conditional access constraint (absoluteFireDate throws on non-Absolute kinds) specified as a hard requirement with explicit kind-checking before access? [Completeness, Spec §FR-037a + §API Reference §3] — ✅ FR-037a and API Reference §3 both specify this.
- [x] CHK011 - Does the spec define the exact error message format when snooze is attempted on DueRelative vs DeferRelative vs Unknown, including the notification's actual kind in the message? [Clarity, Spec §Error Messages + §FR-037a] — ✅ Error Messages table includes: "Cannot snooze notification at index {index}: only Absolute notifications can be snoozed (this notification is {kind})".
- [x] CHK012 - Are the writability semantics of `absoluteFireDate` (writable) vs `initialFireDate` (read-only) clearly distinguished in the data model? [Clarity, Spec §Key Entities + data-model.md §Absolute-Only Fields] — ✅ Key Entities and data-model.md clearly mark r/o vs writable.
- [ ] CHK013 - Does the spec define what happens when `absoluteFireDate` is set to an invalid Date value (e.g., NaN, unparseable string)? [Edge Case, Gap] — ⚠️ NOT RESOLVABLE from docs. OmniJS behavior with invalid Date is undocumented. Added Script Editor verification note to API Reference §3. **Requires manual verification.**
- [x] CHK014 - Is the relationship between setting `absoluteFireDate` and `isSnoozed` becoming true defined as a spec-level requirement, or only as an implementation note? [Completeness, Spec §API Reference §7] — ✅ RESOLVED: Updated API Reference §7 to explicitly state this is spec-level behavior.

## Tasks Without Due Dates (relative notifications)

- [x] CHK015 - Are the "no due date" pre-condition requirements consistent in wording and behavior between `add_notification` (FR-013) and `add_standard_notifications` (FR-030)? [Consistency, Spec §FR-013 + §FR-030] — ✅ RESOLVED: Both now consistently say "task's `effectiveDueDate` is null".
- [x] CHK016 - Does the spec specify whether `effectiveDueDate` or `dueDate` is the correct property to check for the due-date pre-condition? [Clarity, Gap] — ✅ RESOLVED: FR-013, FR-030, Edge Cases, API Reference §12, data-model.md, and research.md §Decision 7 all specify `effectiveDueDate`. Source: API docs explicitly say "when this task's effectiveDueDate is not set."
- [x] CHK017 - Is the error message for "no due date" scenarios defined with sufficient specificity, including the task identifier (name or ID) in the message? [Clarity, Spec §Error Messages rows 3-4] — ✅ RESOLVED: Updated error messages to "no effective due date" with task name placeholder.
- [x] CHK018 - Does the spec address what happens to existing DueRelative notifications when a task's due date is removed after creation? [Edge Case, Gap] — ✅ RESOLVED: Added to Edge Cases and Clarifications Session 2 Q5. Per docs: `initialFireDate` "will change with its task object's due and defer dates." OmniFocus handles internally; out of scope for our tools.
- [x] CHK019 - Are requirements defined for `add_standard_notifications` on a task with a defer date but no due date (all presets are due-relative)? [Edge Case, Gap] — ✅ RESOLVED: Added to Edge Cases and Clarifications Session 2 Q6. API checks `effectiveDueDate`; having only a defer date fails.

## DeferRelative vs DueRelative Notification Kinds

- [x] CHK020 - Is the distinction between DeferRelative (offset from defer date) and DueRelative (offset from due date) explicitly defined in the data model with clear semantics for each? [Clarity, Spec §Key Entities + data-model.md §NotificationKind Enum] — ✅ RESOLVED: Added "relativeFireOffset Base Date" section to data-model.md with explicit DueRelative→due date, DeferRelative→defer date mapping.
- [x] CHK021 - Does the spec clearly document that DeferRelative notifications cannot be created via `add_notification` and explain why (OmniFocus manages these internally)? [Completeness, Spec §Assumptions §4 + §Out of Scope] — ✅ Documented in Assumptions §4, Edge Cases, and Out of Scope.
- [x] CHK022 - Are the `relativeFireOffset` semantics specified differently for DeferRelative (offset from defer date) vs DueRelative (offset from due date), or is this distinction left implicit? [Clarity, Gap] — ✅ RESOLVED: Added explicit documentation in data-model.md "relativeFireOffset Base Date" section and API Reference §4 and §14.
- [x] CHK023 - Is the "Unknown" notification kind defined with specific handling requirements for `list_notifications` output (e.g., what fields are returned)? [Completeness, Spec §FR-007 + contracts/schemas.md §UnknownNotificationSchema] — ✅ contracts/schemas.md defines `UnknownNotificationSchema` with base fields only (no absoluteFireDate, no relativeFireOffset).
- [x] CHK024 - Does the spec address how `snooze_notification` error messages distinguish between DeferRelative and DueRelative kinds in the rejection message? [Clarity, Spec §FR-037a + §Error Messages] — ✅ Error message template includes `{kind}` placeholder which resolves to the actual kind (DueRelative, DeferRelative, Unknown).
- [x] CHK025 - Are requirements defined for how `list_notifications` reports the date that `relativeFireOffset` is relative to (due date vs defer date) so the consumer knows which base date applies? [Gap, Completeness] — ✅ RESOLVED: The `kind` field serves this purpose (DueRelative=due date, DeferRelative=defer date). Documented in data-model.md "relativeFireOffset Base Date" section and API Reference §14.

## DeferRelative Enum Discovery (NEW — found during research)

- [ ] CHK029 - `DeferRelative` is NOT listed in the official `Task.Notification.Kind` enum (only Absolute, DueRelative, Unknown are documented). Does the spec flag this for Script Editor verification? [Completeness, research.md §Decision 8] — ✅ RESOLVED: Flagged in FR-007, Edge Cases, API Reference §10, data-model.md, and research.md §Decision 8. Includes fallback: if `Task.Notification.Kind.DeferRelative` doesn't exist, map to "Unknown".
- [x] CHK030 - Does the implementation plan account for DeferRelative potentially not existing as an enum constant, requiring string comparison instead? [Completeness, Gap] — ✅ RESOLVED: plan.md Phase 2 now includes "DeferRelative Enum Handling" section with dual detection strategy (enum constant comparison + string/toString fallback). Also in plan.md Open Items and risk register (upgraded to MEDIUM).

## Cross-Cutting API Constraint Coverage

- [x] CHK026 - Does the OmniJS Property Access Rules table in data-model.md cover all 7 properties across all 4 kinds, and is this table referenced by the spec requirements? [Completeness, data-model.md §OmniJS Property Access Rules] — ✅ Table covers all properties and all 4 kinds with ✅/❌ THROWS markers.
- [x] CHK027 - Are string escaping requirements (user-provided task names, datetime strings) specified for all values interpolated into OmniJS scripts? [Coverage, Gap] — ✅ RESOLVED: Added to Edge Cases ("String escaping in OmniJS") and API Reference §13.
- [x] CHK028 - Does the spec require try-catch wrapping for kind-conditional property access (absoluteFireDate, relativeFireOffset) in OmniJS scripts to prevent unhandled throws? [Completeness, Spec §FR-046 + §API Reference §3-4] — ✅ FR-046 requires all OmniJS scripts use try-catch with JSON.stringify returns. API Reference §3-4 specify kind-checking before access.

---

## Summary

| Status | Count | Items |
|--------|-------|-------|
| ✅ Resolved | 29 | CHK001-012, CHK014-030 |
| ⚠️ Requires Script Editor | 1 | CHK013 (invalid Date behavior — undocumented in OmniJS API) |
| **Total** | **30** | **30 items** |

**Key remediations applied**:
1. `effectiveDueDate` specified as the correct pre-condition property (FR-013, FR-030, data-model.md, research.md)
2. Seconds/minutes contingency plan documented (API Reference §2, research.md §Decision 10)
3. DeferRelative enum status flagged with verification requirement (FR-007, data-model.md, research.md §Decision 8)
4. Index OOB behavior documented (Edge Cases, API Reference §1, research.md §Decision 9)
5. relativeFireOffset base date disambiguation documented (data-model.md, API Reference §4/§14)
6. String escaping requirement added (Edge Cases, API Reference §13)
7. Due date removal behavior documented (Edge Cases, Clarifications)
8. Defer-only task behavior documented (Edge Cases, Clarifications)
