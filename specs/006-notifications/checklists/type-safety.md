# Type Safety Requirements Quality Checklist

**Purpose**: Validate that input/output validation, type constraints, and schema requirements are fully and clearly specified
**Created**: 2026-03-17
**Feature**: [spec.md](../spec.md) | [contracts/schemas.md](../contracts/schemas.md) | [data-model.md](../data-model.md)
**Focus**: Zod schemas for all 5 tools, ISO 8601 validation, index bounds checking, preset enum validation, seconds/minutes unit clarity
**Depth**: Standard | **Audience**: Implementation reviewer

---

## Zod Schema Completeness (Input Schemas)

- [x] CHK001 - Are input schema requirements defined for all 5 tools (list, add, remove, add_standard, snooze)? [Completeness, contracts/schemas.md] — ✅ All 5 tool input schemas documented with field types.
- [x] CHK002 - Is the TaskIdentifier schema (taskId/taskName with at-least-one refinement) consistently required across all 5 tools? [Consistency, Spec §FR-001/009/018/026/034] — ✅ All tools specify taskId/taskName with at-least-one constraint.
- [x] CHK003 - Is the `add_notification` input schema specified as a discriminated union on `type: "absolute" | "relative"` with type-conditional fields? [Completeness, contracts/schemas.md §add_notification] — ✅ Two input shapes documented: absolute (dateTime) and relative (offsetSeconds).
- [x] CHK004 - Does the `add_notification` input schema design explicitly specify that `dateTime` is REQUIRED when `type: "absolute"` and `offsetSeconds` is REQUIRED when `type: "relative"` (not optional in both cases)? [Clarity, contracts/schemas.md §add_notification] — ✅ RESOLVED: Added "Discriminated Union Field Requiredness" design decision to contracts/schemas.md. Zod discriminated union variants inherently require their fields — this is a language-level guarantee, not ambiguity.
- [x] CHK005 - Is the `preset` parameter for `add_standard_notifications` specified as a string enum with exactly 5 valid values? [Completeness, Spec §FR-027 + contracts/schemas.md §add_standard_notifications] — ✅ "day_before", "hour_before", "15_minutes", "week_before", "standard".
- [x] CHK006 - Is the `index` parameter for `remove_notification` and `snooze_notification` specified as a non-negative integer (not just "number")? [Clarity, Spec §FR-019/035] — ✅ Both specify "non-negative integer". Schema uses `z.number().int().min(0)` pattern.
- [x] CHK007 - Is `snoozeUntil` for `snooze_notification` specified with the same ISO 8601 validation requirements as `dateTime` for `add_notification`? [Consistency, Spec §FR-015/039] — ✅ Both specify "parseable ISO 8601 string".

## Zod Schema Completeness (Output Schemas)

- [x] CHK008 - Is the NotificationOutput schema specified as a discriminated union on `kind` with kind-conditional fields? [Completeness, contracts/schemas.md §NotificationOutputSchema] — ✅ Three variants: Absolute (absoluteFireDate), Relative (relativeFireOffset), Unknown (base only).
- [x] CHK009 - Are success response schemas defined for all 5 tools with `success: true` and tool-specific return fields? [Completeness, contracts/schemas.md] — ✅ All 5 success shapes documented.
- [x] CHK010 - Are error response schemas defined with `success: false` and structured error fields for all 5 tools? [Completeness, Spec §FR-043/044 + contracts/schemas.md] — ✅ Error shape includes success, error, and disambiguation variant with code + matchingIds.
- [x] CHK011 - Is the disambiguation error response (code: "DISAMBIGUATION_REQUIRED", matchingIds: string[]) specified consistently across all 5 tools? [Consistency, Spec §FR-002/017/025/033/042] — ✅ All tools specify disambiguation error requirement.
- [x] CHK012 - Does the `RelativeNotificationSchema` discriminant (`kind: z.enum(['DueRelative', 'DeferRelative'])`) support both DueRelative and DeferRelative in a single variant, and is this design decision documented given the DeferRelative enum uncertainty? [Clarity, contracts/schemas.md + research.md §Decision 8] — ✅ RESOLVED: Added "RelativeNotificationSchema Grouping" design decision to contracts/schemas.md. Grouping is intentional — both kinds share `relativeFireOffset`; `kind` field disambiguates which base date (due vs defer) applies.

## ISO 8601 Date Validation

- [x] CHK013 - Are ISO 8601 validation requirements specified for `dateTime` (add_notification) with explicit "parseable" criteria? [Clarity, Spec §FR-015] — ✅ FR-015: "Tool MUST validate dateTime is a parseable ISO 8601 string".
- [x] CHK014 - Are ISO 8601 validation requirements specified for `snoozeUntil` (snooze_notification) with explicit "parseable" criteria? [Clarity, Spec §FR-039] — ✅ FR-039: "Tool MUST validate snoozeUntil is a parseable ISO 8601 string".
- [x] CHK015 - Is "parseable ISO 8601" defined with sufficient precision — does it accept date-only ("2026-04-01"), datetime ("2026-04-01T09:00:00"), or datetime with timezone ("2026-04-01T09:00:00Z")? [Ambiguity, Spec §FR-015/039] — ✅ RESOLVED: Updated FR-015/039 to specify "accepts any format parseable by JavaScript `new Date()`". Added "ISO 8601 Convention" design decision to contracts/schemas.md documenting the established codebase pattern (all existing tools use same approach).
- [x] CHK016 - Are error messages for invalid ISO 8601 strings specified with the rejected value included? [Clarity, Spec §Error Messages] — ✅ "Invalid dateTime: cannot parse '{value}' as ISO 8601" and "Invalid snoozeUntil: cannot parse '{value}' as ISO 8601".
- [x] CHK017 - Are ISO 8601 strings in output schemas (`initialFireDate`, `nextFireDate`, `absoluteFireDate`) consistently specified as the same format? [Consistency, Spec §FR-004/004a + contracts/schemas.md] — ✅ All output date fields described as "ISO 8601 string".

## Notification Index Bounds Checking

- [x] CHK018 - Is the index validation requirement (non-negative integer, within bounds) specified for both `remove_notification` (FR-019/020) and `snooze_notification` (FR-035/038)? [Consistency, Spec §FR-019/020/035/038] — ✅ Both tools specify non-negative integer and bounds validation.
- [x] CHK019 - Is the error message for out-of-bounds index specified with both the invalid index AND the valid range? [Clarity, Spec §Error Messages] — ✅ "Notification index {index} out of range (task has {count} notifications, valid indices: 0-{max})".
- [x] CHK020 - Is the "no notifications" edge case (index 0 on empty array) specified separately from the general out-of-bounds case? [Completeness, Spec §FR-023] — ✅ FR-023 specifies separate error: "Task has no notifications to remove".
- [x] CHK021 - Is the "no notifications" error (FR-023) specified for `snooze_notification` as well, or only for `remove_notification`? [Gap, Spec §FR-023 vs §FR-038] — ✅ RESOLVED: Added FR-038a: "Tool MUST return error when task has no notifications: 'Task {name} has no notifications to snooze'". Added corresponding entry to Error Messages table.
- [x] CHK022 - Is the `index` field in the NotificationOutput schema specified as `z.number().int().min(0)` (non-negative integer), consistent with the input index constraints? [Consistency, contracts/schemas.md §NotificationBaseSchema] — ✅ Schema shows `index: z.number().int().min(0)`.

## Preset Name Validation

- [x] CHK023 - Are all 5 preset values explicitly enumerated in the requirements (day_before, hour_before, 15_minutes, week_before, standard)? [Completeness, Spec §FR-027] — ✅ All 5 listed in FR-027.
- [x] CHK024 - Is the error message for invalid preset names specified with the rejected value and the list of valid options? [Clarity, Spec §Error Messages] — ✅ "Invalid preset: '{preset}'. Must be one of: day_before, hour_before, 15_minutes, week_before, standard".
- [x] CHK025 - Are preset offset values specified with explicit second values AND human-readable equivalents for cross-checking? [Clarity, Spec §FR-028 + §Preset Offset Definitions table] — ✅ Table includes offset, equivalent (e.g., "24 hours before due (`24 * 60 * 60`)"), and preset name.
- [x] CHK026 - Is the "standard" preset's composite behavior (adds TWO notifications) specified with both offset values? [Completeness, Spec §FR-029] — ✅ FR-029: "Preset standard MUST add two notifications: -86400 sec AND -3600 sec".

## Seconds vs Minutes Unit Clarity

- [x] CHK027 - Is the parameter named `offsetSeconds` (not `offsetMinutes` or `offset`) to prevent unit ambiguity? [Clarity, Spec §FR-012 + contracts/schemas.md] — ✅ FR-012 uses `offsetSeconds` and contracts show `offsetSeconds: number`.
- [x] CHK028 - Is the `relativeFireOffset` output field documented as "in seconds" in the data model and schema descriptions? [Clarity, contracts/schemas.md §RelativeNotificationSchema + data-model.md] — ✅ Schema: "Offset in seconds from due/defer date". Data model: "Offset in seconds".
- [x] CHK029 - Are preset offset values (FR-028) expressed in seconds with parenthetical derivation (e.g., "-86400 sec (`24 * 60 * 60`)") for cross-checking? [Measurability, Spec §FR-028 + §Preset Offset Definitions] — ✅ Both FR-028 and the Preset table include derivation.
- [x] CHK030 - Is the seconds/minutes documentation error in the official API docs flagged with a verification gate in the requirements? [Completeness, Spec §API Reference §2 + §Clarifications] — ✅ Flagged in Clarifications Q3, API Reference §2, and research.md §Decision 2/10 with Script Editor verification requirement.
- [x] CHK031 - Is the contingency plan (if unit is actually minutes) documented with specific FRs and values that would change? [Completeness, Spec §Clarifications Session 2 Q7 + research.md §Decision 10] — ✅ Contingency documents: divide presets by 60, rename offsetSeconds→offsetMinutes, update FR-012/028.

## Input Validation Edge Cases

- [x] CHK032 - Is `offsetSeconds` specified to accept any finite number (positive and negative), with the sign convention documented? [Completeness, Spec §FR-016 + §Clarifications Q4] — ✅ FR-016: "finite number". Clarifications Q4: positive = after due, negative = before due.
- [x] CHK033 - Is validation for `taskId` string format specified (e.g., empty string handling, whitespace-only)? [Gap, Spec §FR-001] — ✅ RESOLVED: Updated TaskIdentifierSchema in contracts/schemas.md to use `z.string().min(1)`, following the established pattern from `delete-project.ts` and `delete-tag.ts` which both use `.min(1)` to reject empty strings.
- [x] CHK034 - Is validation for `taskName` string format specified (e.g., empty string handling, special characters, max length)? [Gap, Spec §FR-001] — ✅ RESOLVED: Same `.min(1)` pattern applied to `taskName`. No max length or special character restrictions needed (OmniFocus task names are arbitrary strings).
- [x] CHK035 - Is the `type` parameter for `add_notification` specified as an enum with exactly 2 valid values and an error message for invalid types? [Completeness, Spec §FR-010 + §Error Messages] — ✅ FR-010: "absolute" or "relative". Error: "Invalid notification type: '{type}'. Must be one of: absolute, relative".
- [x] CHK036 - Is the `repeatInterval` output field specified as `number | null` with null semantics (null = non-repeating)? [Clarity, Spec §FR-004 + contracts/schemas.md] — ✅ FR-004: "repeatInterval (number or null, in seconds)". Schema: `z.number().nullable()`.

## Schema Design Consistency

- [x] CHK037 - Is the TaskIdentifier schema reuse pattern documented as shared across all 5 tools (not duplicated per-tool)? [Consistency, contracts/schemas.md §Shared Schemas + plan.md §Phase 1] — ✅ Shared schemas in `src/contracts/notification-tools/shared/`.
- [x] CHK038 - Is the NotificationOutput schema reuse documented for tools that return notification details (list, add, add_standard, snooze)? [Consistency, contracts/schemas.md] — ✅ list, add, add_standard, and snooze all reference `NotificationOutput` / `NotificationOutput[]` in success response.
- [x] CHK039 - Are the `success: true/false` discriminator pattern requirements consistent with existing tool contracts (review-tools, task-tools)? [Consistency, Spec §FR-043 + plan.md §Constitution Check] — ✅ Follows established pattern from review-tools/task-tools.
- [x] CHK040 - Does the `remove_notification` success response include a `removedNotification` field with the details of what was removed, or only the `removedIndex`? [Completeness, contracts/schemas.md §remove_notification] — ✅ RESOLVED: Added "Remove Response Convention" design decision to contracts/schemas.md. This follows the established delete/remove pattern: `delete_project` returns `{id, name, message}`, `delete_tag` returns `{id, name}` — identification + confirmation, not the full deleted object.

---

## Summary

| Status | Count | Items |
|--------|-------|-------|
| ✅ Resolved | 40 | CHK001-040 |
| ⚠️ Gaps remaining | 0 | — |
| **Total** | **40** | **40 items** |

**All gaps remediated** (2026-03-17):

1. **CHK004** ✅ — Documented Zod discriminated union inherent requiredness in contracts/schemas.md
2. **CHK012** ✅ — Documented RelativeNotificationSchema grouping rationale in contracts/schemas.md
3. **CHK015** ✅ — Updated FR-015/039 with `new Date()` parsing convention; documented in contracts/schemas.md
4. **CHK021** ✅ — Added FR-038a ("no notifications to snooze") and error message to spec.md
5. **CHK033-034** ✅ — Updated TaskIdentifierSchema to use `.min(1)` following delete-project/delete-tag pattern
6. **CHK040** ✅ — Documented remove response convention (matches delete_project/delete_tag pattern)
