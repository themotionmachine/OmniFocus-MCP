# Feature Specification: Repetition Rule Management

**Feature Branch**: `007-repetition-rules`
**Created**: 2026-03-17
**Status**: Draft
**Input**: User description: "Repetition Rule Management for OmniFocus tasks and projects"

## Clarifications

### Session 2026-03-17

- Q: How should repetition tools detect v4.7+ capability — feature detection (`typeof Task.RepetitionScheduleType`), version detection (`app.userVersion.atLeast`), or both? → A: Version detection only via `app.userVersion.atLeast(new Version('4.7'))`, matching official docs and existing `setPlannedDate` pattern.
- Q: Which preset list is canonical for `set_common_repetition` — 4 (spec) or 8 (master plan)? → A: 8 presets: daily, weekdays, weekly, biweekly, monthly, monthly_last_day, quarterly, yearly.
- Q: Which constructor should `set_repetition` (basic ICS tool) use — legacy 2-param, version-detected 5-param, or always 5-param with nulls? → A: Always legacy 2-param: `new Task.RepetitionRule(ruleString, null)` for universal compatibility.
- Q: Should `set_advanced_repetition` require all v4.7+ params or allow partial specification? → A: All optional — pass `null` for unspecified params, let OmniFocus apply its defaults (DueDate anchor, Regularly schedule, no catch-up).
- Q: Should `set_advanced_repetition` require `ruleString` as input or read-then-merge from existing rule? → A: Read-then-merge — reads existing `ruleString`, `scheduleType`, `anchorDateKey`, `catchUpAutomatically` from current rule if not provided, constructs new rule with changes (matches c-command.com proven pattern).

### Session 2026-03-17 (API Contract Gap Resolution)

- Q: Should set_advanced_repetition optional params use `.optional()` (absent) or `.nullable()` (explicit null) in Zod? → A: `.optional()` — omitted fields trigger read-from-existing-rule merge. There is no semantic distinction between "not provided" and "null"; both mean "use existing value." This matches the codebase pattern where `.optional()` is for input fields that can be omitted and `.nullable()` is for response fields that can be null (e.g., task dates).
- Q: Should get_repetition v4.7+ response fields use `.nullable()`, `.optional()`, or a discriminated version union? → A: `.nullable()` with version note in `.describe()`, matching the established `TaskFullSchema` pattern (e.g., `plannedDate: z.string().nullable().describe('...v4.7+, null if unsupported')`). No version indicator field — null values ARE the version signal. Proven in `src/contracts/task-tools/shared/task.ts`.
- Q: Should get_repetition include a version indicator field so clients know which fields to expect? → A: No. Follow the established pattern: v4.7+ fields are `.nullable()` and return null when OmniFocus is pre-v4.7. No existing tool includes a version field in responses — version constraints are communicated through null values (reads) and error messages (writes).
- Q: How should `id` and `ruleString` handle empty strings — reject or treat as missing? → A: Reject with `z.string().min(1)`. Empty strings are invalid input that would cause silent OmniJS failures. The `id` field maps to `Task.byIdentifier()` / `Project.byIdentifier()` which cannot accept empty strings.
- Q: What happens when `dayOfMonth` exceeds a month's actual days (e.g., 31 in February)? → A: Per RFC 5545 §3.3.10, invalid dates "MUST be ignored and MUST NOT be counted as part of the recurrence set." OmniFocus treats ICS ruleStrings as RFC 5545-compliant. `BYMONTHDAY=31` skips months with fewer days (Feb, Apr, Jun, Sep, Nov). The `monthly_last_day` preset (`BYMONTHDAY=-1`) exists specifically for "last day of month" use cases. Accept 1-31 at validation; document skipping behavior in tool description.

### Session 2026-03-17 (Error Handling Gap Resolution)

- Q: Does version detection happen inside OmniJS or server-side in TypeScript? → A: Inside OmniJS. The OmniFocus version can only be queried at runtime via `app.userVersion`. Confirmed by `setPlannedDate.ts` which embeds the version check in the generated OmniJS script string, not in TypeScript.
- Q: What is the distinction between "version gating" and "version degradation" for repetition tools? → A: Two distinct strategies: (1) **Version gating** — set_advanced_repetition returns `{ success: false, error: "...requires v4.7+" }` and does nothing on pre-v4.7. (2) **Version degradation** — get_repetition works on all versions but returns null for v4.7+ fields (scheduleType, anchorDateKey, catchUpAutomatically) on pre-v4.7. The other 3 tools (set_repetition, clear_repetition, set_common_repetition) have NO version dependency — they use the legacy 2-param constructor.
- Q: Should version check execute before or after item resolution in set_advanced_repetition? → A: Version check FIRST, before item resolution. Confirmed by `setPlannedDate.ts` ordering: (1) version check, (2) migration check, (3) task resolution. This avoids unnecessary OmniFocus operations on incompatible versions.
- Q: Should repetition tools use error codes (e.g., NOT_FOUND, VERSION_ERROR) or flat error strings? → A: Flat `{ success: false, error: string }` for all 5 tools. Error codes (`code` field) are only used in batch operations (review-tools) and DISAMBIGUATION_REQUIRED (name-based lookups). Repetition tools are single-item, ID-only operations — no disambiguation, no batch — so flat errors match the codebase pattern.
- Q: What happens during read-then-merge when the existing rule has null properties (e.g., legacy rule missing scheduleType)? → A: set_advanced_repetition is v4.7+ only, so it only runs on OmniFocus that supports the 5-param constructor. If an existing rule was created with the legacy constructor and has null scheduleType/anchorDateKey, the merge passes null to the 5-param constructor, letting OmniFocus apply its defaults (Regularly schedule, DueDate anchor). This is the documented behavior from the c-command.com pattern.
- Q: Are per-tool OmniJS error scenarios enumerated? → A: They should be. Per tool: **get_repetition** — NOT_FOUND only; **set_repetition** — NOT_FOUND, invalid ICS string (OmniJS constructor throws); **clear_repetition** — NOT_FOUND only (idempotent on no-rule); **set_common_repetition** — NOT_FOUND, invalid ICS (shouldn't occur with preset-generated strings); **set_advanced_repetition** — VERSION_ERROR, NOT_FOUND, missing ruleString when no existing rule, OmniJS constructor error.

### Session 2026-03-17 (Type Safety Gap Resolution)

- Q: How should OmniJS enum values be extracted in repetition tool scripts — `.name` property or conditional comparison? → A: Use `.name` property for reads (e.g., `rule.scheduleType ? rule.scheduleType.name : null`). This matches `getProjectsForReview.ts` which uses `project.status.name`. For writes (set_advanced_repetition), use `Task.RepetitionScheduleType.Regularly` directly in the script — the enum constant is referenced by name, not by string. Confirmed by existing patterns in `editTag.ts` and `getTask.ts`.
- Q: What casing convention do repetition enum values use? → A: PascalCase, matching the majority codebase pattern. `Task.RepetitionScheduleType.Regularly.name` returns `'Regularly'`, `Task.AnchorDateKey.DueDate.name` returns `'DueDate'`. This is consistent with `ProjectStatus` (`'Active'`, `'OnHold'`) and `TaskStatus` (`'Available'`, `'Blocked'`). Note: `TagStatus` is the outlier using camelCase (`'active'`, `'onHold'`) but repetition enums follow the majority.
- Q: Should TypeScript types be inferred from Zod schemas or defined separately? → A: Inferred via `z.infer<typeof Schema>`. This is the established pattern — e.g., `src/contracts/task-tools/shared/task.ts` exports both schemas and inferred types. No separate TypeScript interfaces needed.
- Q: Is the `escapeForJS()` pattern documented for repetition primitives? → A: Follow the established per-primitive duplication pattern. `escapeForJS()` escapes `\ " \n \r \t` in that order (backslash first to avoid double-escaping). Defined locally in each primitive, NOT shared. Standard ICS rule strings (`FREQ=WEEKLY;BYDAY=MO`) contain no special characters, but user-provided ruleString input must still be escaped for safety. Confirmed across 26+ existing primitives.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read Repetition Rule (Priority: P1)

As a user managing recurring tasks, I want to read the current repetition rule
on a task or project so I can understand its recurrence pattern and decide
whether it needs adjustment.

**Why this priority**: Reading is the foundation — users must understand the
current state before they can modify it. This delivers immediate value by
surfacing repetition details that are otherwise hidden behind the OmniFocus UI.

**Independent Test**: Can be fully tested by calling `get_repetition` with a
task or project ID and verifying the returned rule details match OmniFocus.
Delivers value even without the write tools.

**Acceptance Scenarios**:

1. **Given** a task has a weekly repetition rule (e.g., `FREQ=WEEKLY;BYDAY=MO`),
   **When** I call `get_repetition` with the task's ID,
   **Then** I receive the ICS rule string, schedule type, and whether it is repeating.

2. **Given** a task has no repetition rule,
   **When** I call `get_repetition` with the task's ID,
   **Then** I receive a response indicating no repetition rule is set.

3. **Given** a project has a repetition rule,
   **When** I call `get_repetition` with the project's ID,
   **Then** I receive the repetition details for the project's root task.

4. **Given** an ID that does not match any task or project,
   **When** I call `get_repetition`,
   **Then** I receive a clear error indicating the item was not found.

---

### User Story 2 - Set Repetition Rule via ICS String (Priority: P1)

As a power user, I want to set a repetition rule on a task or project using a
standard ICS recurrence string so I can define precise, arbitrary recurrence
patterns programmatically.

**Why this priority**: This is the core write operation that enables all
recurring task management. ICS strings are the universal format OmniFocus uses
internally, making this the most flexible and reliable approach.

**Independent Test**: Can be tested by calling `set_repetition` with a known
ICS string, then verifying via `get_repetition` that the rule was applied.

**Acceptance Scenarios**:

1. **Given** a non-repeating task,
   **When** I call `set_repetition` with `ruleString: "FREQ=DAILY"`,
   **Then** the task becomes repeating with a daily rule.

2. **Given** a task already has a weekly rule,
   **When** I call `set_repetition` with `ruleString: "FREQ=MONTHLY;BYMONTHDAY=1"`,
   **Then** the previous rule is replaced with the monthly rule.

3. **Given** a project ID,
   **When** I call `set_repetition` with a valid ICS string,
   **Then** the repetition rule is applied to the project's root task.

4. **Given** an ICS string that OmniFocus cannot interpret,
   **When** I call `set_repetition`,
   **Then** I receive an error from OmniFocus (we do not pre-validate ICS strings).

---

### User Story 3 - Clear Repetition Rule (Priority: P2)

As a user, I want to clear (remove) the repetition rule from a task or project
so I can make it non-recurring without deleting and recreating it.

**Why this priority**: Clearing is the complement to setting — without it, users
cannot undo a repetition rule. However, it is simpler and lower-risk than the
set operations.

**Independent Test**: Can be tested by clearing a known repeating task and
verifying it is no longer repeating.

**Acceptance Scenarios**:

1. **Given** a task with a daily repetition rule,
   **When** I call `clear_repetition` with the task's ID,
   **Then** the task's repetition rule is removed and it is no longer repeating.

2. **Given** a task with no repetition rule,
   **When** I call `clear_repetition`,
   **Then** the operation succeeds without error (idempotent).

3. **Given** a project ID,
   **When** I call `clear_repetition`,
   **Then** the repetition rule is removed from the project's root task.

---

### User Story 4 - Set Common Repetition Presets (Priority: P2)

As a user who doesn't know ICS syntax, I want to use named presets like "daily",
"weekly", or "monthly" to set repetition rules so I can quickly configure
common recurrence patterns without learning ICS format.

**Why this priority**: Convenience layer that dramatically lowers the barrier to
entry. Most recurring tasks fall into a handful of common patterns. This tool
generates the correct ICS string internally, shielding users from format details.

**Independent Test**: Can be tested by calling `set_common_repetition` with each
supported preset and verifying the resulting ICS rule via `get_repetition`.

**Acceptance Scenarios**:

1. **Given** a task and a preset of "daily",
   **When** I call `set_common_repetition`,
   **Then** the task receives a `FREQ=DAILY` repetition rule.

2. **Given** a task and a preset of "weekly" with specified days (e.g., Monday,
   Wednesday, Friday),
   **When** I call `set_common_repetition`,
   **Then** the task receives a `FREQ=WEEKLY;BYDAY=MO,WE,FR` rule.

3. **Given** a task and a preset of "monthly" with a specific day (e.g., 15th),
   **When** I call `set_common_repetition`,
   **Then** the task receives a `FREQ=MONTHLY;BYMONTHDAY=15` rule.

4. **Given** a task and a preset of "yearly",
   **When** I call `set_common_repetition`,
   **Then** the task receives a `FREQ=YEARLY` rule.

5. **Given** an unrecognized preset name,
   **When** I call `set_common_repetition`,
   **Then** I receive a validation error listing the supported presets.

---

### User Story 5 - Set Advanced Repetition (v4.7+) (Priority: P3)

As a power user on OmniFocus v4.7 or later, I want to configure advanced
repetition features like from-completion scheduling, anchor dates, and automatic
catch-up so I can define sophisticated recurrence patterns that adapt to my
actual task completion behavior.

**Why this priority**: Advanced features that depend on OmniFocus v4.7+. Not
available to all users, but provides significant value for those who need
completion-based repetition (e.g., "repeat 3 days after I finish" rather than
"repeat every 3 days regardless").

**Independent Test**: Can be tested by calling `set_advanced_repetition` on
OmniFocus v4.7+ and verifying the schedule type, anchor date key, and catch-up
settings via `get_repetition`.

**Acceptance Scenarios**:

1. **Given** OmniFocus v4.7+ and a task,
   **When** I call `set_advanced_repetition` with `scheduleType: "FromCompletion"`,
   **Then** the task's repetition rule uses from-completion scheduling.

2. **Given** OmniFocus v4.7+ and a task,
   **When** I call `set_advanced_repetition` with `anchorDateKey: "DueDate"`,
   **Then** the repetition rule anchors to the task's due date.

3. **Given** OmniFocus v4.7+ and a task,
   **When** I call `set_advanced_repetition` with `catchUpAutomatically: true`,
   **Then** missed recurrences are automatically caught up.

4. **Given** OmniFocus prior to v4.7,
   **When** I call `set_advanced_repetition`,
   **Then** I receive a clear error indicating this feature requires v4.7+.

5. **Given** OmniFocus v4.7+ and a task with an existing rule,
   **When** I call `set_advanced_repetition` to change only the schedule type,
   **Then** the existing ICS rule string, anchor date key, and catch-up setting
   are preserved via read-then-merge while the schedule type changes.

6. **Given** OmniFocus v4.7+ and a task with no existing rule,
   **When** I call `set_advanced_repetition` without providing a `ruleString`,
   **Then** I receive an error indicating a `ruleString` is required when no
   existing rule exists to merge from.

---

### Edge Cases

- What happens when setting a repetition rule on a completed task? The rule is
  set but does not trigger until the task is marked incomplete or a new
  occurrence is created.
- What happens when clearing a rule on a task that is mid-recurrence? The
  current instance remains; no future occurrences are generated.
- What happens when the OmniJS script execution returns empty output? This
  indicates a silent failure — the tool wraps all OmniJS in try-catch and
  reports the failure.
- What happens when a project ID is provided but the project has no root task?
  Return an error — projects in OmniFocus always have a root task, so this
  would indicate a data integrity issue.
- How does `set_common_repetition` interact with `set_advanced_repetition`?
  They both set the same `repetitionRule` property — the last call wins.
- What happens when `set_advanced_repetition` is called without `ruleString` on
  a task with no existing rule? Error — `ruleString` is required when there is
  no existing rule to read from (read-then-merge has nothing to read).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST retrieve the current repetition rule for a task or
  project, returning the ICS rule string, whether it is repeating, and (on
  v4.7+) the schedule type, anchor date key, and catch-up setting.

- **FR-002**: System MUST set a repetition rule on a task or project given a raw
  ICS recurrence string, passing it through to OmniFocus without validation.

- **FR-003**: System MUST clear (remove) the repetition rule from a task or
  project, making it non-recurring.

- **FR-004**: System MUST support 8 named presets for common recurrence
  patterns: daily, weekdays (`FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`), weekly
  (with optional day selection), biweekly (`FREQ=WEEKLY;INTERVAL=2`), monthly
  (with optional day-of-month), monthly_last_day (`FREQ=MONTHLY;BYMONTHDAY=-1`),
  quarterly (`FREQ=MONTHLY;INTERVAL=3`), and yearly, generating the correct
  ICS string internally.

- **FR-005**: System MUST support advanced v4.7+ repetition parameters
  (schedule type, anchor date key, catch-up behavior), all optional with
  OmniFocus defaults applied for unspecified params. System MUST detect
  OmniFocus version via `app.userVersion.atLeast(new Version('4.7'))`,
  returning a clear error when called on unsupported versions.

- **FR-006**: System MUST accept items by ID. When a project ID is provided, the
  operation MUST target the project's root task (which holds the repetition rule
  in OmniFocus's data model).

- **FR-007**: System MUST return structured JSON responses from all OmniJS
  scripts, with success/failure status and descriptive error messages.

- **FR-008**: All tools MUST validate input parameters using Zod schemas before
  executing OmniJS scripts.

### Key Entities

- **RepetitionRule**: A recurrence definition consisting of an ICS rule string
  (e.g., `FREQ=WEEKLY;BYDAY=MO`), an optional schedule type (Regularly,
  FromCompletion, None), an optional anchor date key (DeferDate, DueDate,
  PlannedDate), and an optional catch-up flag.

- **Task/Project**: The items that can have a repetition rule. Projects hold
  their repetition rule on their root task.

- **Common Preset**: A named shorthand (daily, weekdays, weekly, biweekly,
  monthly, monthly_last_day, quarterly, yearly) that maps to a specific ICS
  rule string pattern.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can read the repetition rule of any task or project in a
  single tool call and receive a complete, structured response.

- **SC-002**: Users can set any valid ICS recurrence rule on a task or project
  and verify it was applied via `get_repetition`.

- **SC-003**: Users can remove a repetition rule from a task or project in a
  single tool call, making it non-recurring.

- **SC-004**: Users unfamiliar with ICS syntax can configure the 8 most common
  recurrence patterns using named presets.

- **SC-005**: Users on OmniFocus v4.7+ can configure advanced repetition
  features; users on earlier versions receive a clear, actionable error.

- **SC-006**: All 5 tools pass contract validation tests, unit tests, and
  type-checking without errors.

## Assumptions

- OmniFocus always has a root task for every project (consistent with existing
  tool behavior in the codebase).
- The ICS rule string format used by OmniFocus follows standard iCalendar
  RRULE syntax (RFC 5545), but we treat it as opaque — OmniFocus is the
  authority on what is valid.
- Version detection for v4.7+ features uses `app.userVersion.atLeast(new
  Version('4.7'))`, matching the official OmniAutomation docs and the existing
  `setPlannedDate` primitive pattern.
- The `Task.RepetitionRule` constructor has two forms: legacy 2-param
  (`ruleString, method`) and v4.7+ 5-param (`ruleString, method, scheduleType,
  anchorDateKey, catchUpAutomatically`). The `method` and `scheduleType`/
  `anchorDateKey` params are mutually exclusive — providing both throws an error.
- `set_repetition` and `set_common_repetition` use the legacy 2-param
  constructor with `null` method for universal compatibility. Only
  `set_advanced_repetition` uses the 5-param constructor (v4.7+ only).

## Scope Boundaries

### In Scope

- Reading, setting, clearing repetition rules on individual tasks and projects
- Common preset convenience tool for daily/weekly/monthly/yearly patterns
- Advanced v4.7+ repetition parameters (schedule type, anchor date, catch-up)
- Version detection with graceful degradation
- Zod contract definitions and full TDD test coverage

### Out of Scope

- Parsing or validating ICS rule strings (pass-through to OmniFocus)
- Batch operations across multiple tasks/projects (single item per call)
- Serialization/deserialization of RepetitionRule objects beyond OmniJS
- Notification-based repetition (separate OmniFocus feature)
- Modifying repeat *count* or *until* parameters via presets (use raw ICS)
