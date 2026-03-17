# Feature Specification: Review System

**Feature Branch**: `005-review-system`
**Created**: 2025-12-30
**Status**: Approved
**Phase**: 5 of 20
**Tools**: 3 (`get_projects_for_review`, `mark_reviewed`, `set_review_interval`)

## Overview

The Review System provides tools for managing OmniFocus's GTD-style periodic
project review workflow. Reviews are a core GTD practice ensuring projects
remain relevant, actionable, and properly prioritized.

### Business Value

- **GTD Compliance**: Enables the "Weekly Review" practice central to GTD methodology
- **Project Health**: Identifies stale projects that need attention
- **Workflow Automation**: AI assistants can prompt users about overdue reviews
- **Batch Operations**: Process multiple project reviews efficiently

### Phase 4 Context

This phase builds on Phase 4 (Project Management) which established:

- Project CRUD operations (`list_projects`, `get_project`, `create_project`, `edit_project`, `delete_project`, `move_project`)
- Review status filtering via `reviewStatus` parameter ('due', 'upcoming', 'any')
- Project status management (active, on hold, done, dropped)

Phase 5 adds dedicated review-specific tools for more granular control.

## Clarifications

### Session 2025-12-30

- Q: When setting interval on project without one, what should initial `nextReviewDate` be? → A: Today + interval (first review is one interval away)
- Q: Should `set_review_interval` support batch operations (multiple projects at once)? → A: Yes, batch support with same interval applied to all projects (consistency with `mark_reviewed`)

### Critical API Discovery

Research revealed important constraints in the OmniFocus Omni Automation API:

1. **No `markReviewed()` method exists** - contrary to initial assumptions
2. **`lastReviewDate` is READ-ONLY** - cannot be set via scripts
3. **`nextReviewDate` is WRITABLE** - this is the mechanism for "marking reviewed"
4. **ReviewInterval uses value object semantics** - must reassign entire object

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get Projects Due for Review (Priority: P1)

As a GTD practitioner, I want to retrieve all projects that are due for review
so that I can conduct my weekly review efficiently and ensure no project is
overlooked.

**Why this priority**: This is the foundational tool - users must be able to
identify which projects need review before they can mark them reviewed or
adjust intervals. Without this, the other tools have no context.

**Independent Test**: Can be fully tested by calling `get_projects_for_review`
and verifying it returns projects where `nextReviewDate <= today`. Delivers
immediate value by surfacing overdue reviews.

**Acceptance Scenarios**:

1. **Given** projects exist with various `nextReviewDate` values,
   **When** I call `get_projects_for_review` with no parameters,
   **Then** I receive only projects where `nextReviewDate` is today or earlier.

2. **Given** I want to plan ahead for reviews,
   **When** I call `get_projects_for_review` with `includeFuture: true` and
   `futureDays: 7`,
   **Then** I receive projects due within the next 7 days, sorted by review date.

3. **Given** I have projects in multiple folders,
   **When** I call `get_projects_for_review` with `folderId: "abc123"`,
   **Then** I receive only due-for-review projects within that folder hierarchy.

4. **Given** some projects have `reviewInterval` set to `null` (no review),
   **When** I call `get_projects_for_review`,
   **Then** those projects are excluded from results (they have no review schedule).

5. **Given** I want to see all reviewable projects regardless of due status,
   **When** I call `get_projects_for_review` with `includeAll: true`,
   **Then** I receive all projects that have a review interval configured.

---

### User Story 2 - Mark Project as Reviewed (Priority: P2)

As a GTD practitioner, I want to mark a project as reviewed so that its next
review date is calculated and I can track my review progress.

**Why this priority**: After identifying projects for review (P1), users need
to mark them complete. This is the core action of the review workflow.

**Independent Test**: Can be tested by calling `mark_reviewed` on a project
and verifying `nextReviewDate` advances by the configured `reviewInterval`.

**Acceptance Scenarios**:

1. **Given** a project with `reviewInterval: {steps: 1, unit: 'weeks'}`,
   **When** I call `mark_reviewed` with the project ID,
   **Then** `nextReviewDate` is set to 7 days from today.

2. **Given** a project with `reviewInterval: {steps: 2, unit: 'months'}`,
   **When** I call `mark_reviewed`,
   **Then** `nextReviewDate` is set to 2 months from today.

3. **Given** a project with no review interval (`reviewInterval: null`),
   **When** I call `mark_reviewed`,
   **Then** I receive an error indicating the project has no review schedule.

4. **Given** a project that was already reviewed today,
   **When** I call `mark_reviewed` again,
   **Then** `nextReviewDate` advances from today (not from the old date).

5. **Given** I want to mark multiple projects reviewed,
   **When** I call `mark_reviewed` with an array of project IDs,
   **Then** each project is processed and I receive per-project results.

6. **Given** a batch contains some invalid project IDs,
   **When** I call `mark_reviewed` with the batch,
   **Then** valid projects are marked reviewed and invalid ones return errors.

---

### User Story 3 - Set Review Interval (Priority: P3)

As a GTD practitioner, I want to configure how often a project should be
reviewed so that important projects get more frequent attention and stable
projects require less overhead.

**Why this priority**: While important, most projects use default intervals.
This tool enables customization but isn't required for basic review workflow.

**Independent Test**: Can be tested by calling `set_review_interval` and
verifying the project's `reviewInterval` property changes accordingly.

**Acceptance Scenarios**:

1. **Given** a project with any current review interval,
   **When** I call `set_review_interval` with `{steps: 2, unit: 'weeks'}`,
   **Then** the project's `reviewInterval` is updated to bi-weekly.

2. **Given** a project with a review interval,
   **When** I call `set_review_interval` with `interval: null`,
   **Then** the project no longer appears in review lists (review disabled).

3. **Given** I set a new review interval,
   **When** the interval is longer than time until current `nextReviewDate`,
   **Then** `nextReviewDate` is NOT automatically recalculated (preserves scheduled review).

4. **Given** I want to set interval AND immediately recalculate next review,
   **When** I call `set_review_interval` with `recalculateNextReview: true`,
   **Then** `nextReviewDate` is set to today + new interval.

5. **Given** I provide an invalid unit (e.g., 'hours'),
   **When** I call `set_review_interval`,
   **Then** I receive a validation error listing valid units.

6. **Given** I provide steps: 0 or negative,
   **When** I call `set_review_interval`,
   **Then** I receive a validation error (steps must be positive integer).

7. **Given** I want to set the same review interval on multiple projects,
   **When** I call `set_review_interval` with an array of project IDs and an interval,
   **Then** each project is processed and I receive per-project results.

8. **Given** a batch contains some invalid project IDs,
   **When** I call `set_review_interval` with the batch,
   **Then** valid projects are updated and invalid ones return errors.

---

### Edge Cases

- **Dropped/Completed Projects**: Should `get_projects_for_review` include them?
  Decision: Exclude by default, but provide `includeInactive: true` option.

- **Projects with `nextReviewDate` in the past**: These are overdue and MUST
  appear in default results, sorted oldest-first for prioritization.

- **Timezone handling**: All dates use local timezone (OmniFocus behavior).
  API accepts ISO 8601 strings and interprets as local time.

- **Review interval edge cases**:
  - Setting interval on project without one: Creates schedule, sets `nextReviewDate` to today + interval (first review is one interval away)
  - Removing interval (`null`): Clears `nextReviewDate`, removes from review workflow

- **Batch operation partial failures**: Follow established pattern - process all
  items, return per-item results with success/failure status.

---

## Requirements *(mandatory)*

### Functional Requirements - get_projects_for_review

- **FR-001**: Tool MUST return projects where `nextReviewDate <= today` by default
- **FR-002**: Tool MUST support `includeFuture` parameter to include upcoming reviews
- **FR-003**: Tool MUST support `futureDays` parameter (default: 7) when `includeFuture` is true
- **FR-004**: Tool MUST support `folderId` filter to scope results to a folder hierarchy
- **FR-004a**: Tool MUST support `folderName` filter as alternative to `folderId` (exact match, `folderId` takes precedence if both provided)
- **FR-005**: Tool MUST support `includeAll` parameter to return all reviewable projects
- **FR-006**: Tool MUST support `includeInactive` parameter to include dropped/completed projects
- **FR-007**: Tool MUST exclude projects with `reviewInterval: null` (no review schedule)
- **FR-008**: Tool MUST sort results by `nextReviewDate` ascending (most overdue first)
- **FR-008a**: Tool MUST use `name` (alphabetical) as secondary sort when `nextReviewDate` is identical
- **FR-008b**: Sort MUST be stable (consistent ordering across calls with same data)
- **FR-009**: Tool MUST return: `id`, `name`, `nextReviewDate`, `lastReviewDate`, `reviewInterval`, `status`, `flagged`, `remainingCount`
- **FR-010**: Tool MUST support `limit` parameter for pagination (default: 100, max: 1000)
- **FR-011**: Tool MUST return `totalCount` indicating total matching projects BEFORE limit is applied (enables pagination awareness)
- **FR-011a**: Tool MUST return `dueCount` indicating projects where `nextReviewDate <= today`
- **FR-011b**: Tool MUST return `upcomingCount` indicating projects where `nextReviewDate > today` (only meaningful when `includeFuture` or `includeAll` is true)

### Functional Requirements - mark_reviewed

- **FR-012**: Tool MUST accept an array of project identifiers (each with id or name), minimum 1, maximum 100
- **FR-013**: Tool MUST calculate `nextReviewDate` as `today + reviewInterval`
- **FR-014**: Tool MUST return error if project has no `reviewInterval` configured
- **FR-015**: Tool MUST support both ID and name-based project lookup
- **FR-016**: Tool MUST return disambiguation error when name matches multiple projects
- **FR-017**: Tool MUST return updated project data including new `nextReviewDate`
- **FR-018**: Tool MUST process batch operations with per-item results
- **FR-019**: Tool MUST NOT fail entire batch if some items fail
- **FR-020**: Tool MUST preserve original array indices in batch results

### Functional Requirements - set_review_interval

- **FR-021**: Tool MUST accept `interval` as `{steps: number, unit: string}` or `null`
- **FR-022**: Tool MUST validate `unit` is one of: 'days', 'weeks', 'months', 'years'
- **FR-023**: Tool MUST validate `steps` is a positive integer (>= 1, <= 365)
- **FR-024**: Tool MUST support `null` interval to disable reviews for a project
- **FR-025**: Tool MUST support `recalculateNextReview` parameter (default: false)
- **FR-026**: When `recalculateNextReview: true`, MUST set `nextReviewDate` to today + interval
- **FR-027**: When setting interval on project without one, MUST set initial `nextReviewDate` to today + interval
- **FR-028**: Tool MUST return updated project data including new `reviewInterval`
- **FR-029**: Tool MUST support both ID and name-based project lookup
- **FR-030**: Tool MUST return disambiguation error when name matches multiple projects
- **FR-030a**: Tool MUST accept an array of project identifiers (each with id or name), minimum 1, maximum 100
- **FR-030b**: Tool MUST apply the same interval to all projects in batch operations
- **FR-030c**: Tool MUST process batch operations with per-item results
- **FR-030d**: Tool MUST NOT fail entire batch if some items fail
- **FR-030e**: Tool MUST preserve original array indices in batch results

### Error Handling Requirements

- **FR-031**: All tools MUST return structured error responses with `success: false`
- **FR-032**: Error responses MUST include actionable `error` message
- **FR-033**: Disambiguation errors MUST include `candidates` array with matching projects

### Filter Behavior

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeFuture` | boolean | `false` | Include projects with future `nextReviewDate` |
| `futureDays` | number | `7` | Days ahead to include when `includeFuture: true` |
| `folderId` | string | - | Scope to folder hierarchy (AND with other filters) |
| `folderName` | string | - | Scope to folder by name (exact match; `folderId` takes precedence) |
| `includeAll` | boolean | `false` | Return all reviewable projects regardless of date |
| `includeInactive` | boolean | `false` | Include dropped/completed projects |
| `limit` | number | `100` | Maximum results (1-1000) |

**Filter Logic**: All filters combine with AND logic. A project must satisfy
ALL specified filters to be included.

#### Order of Operations

Filters are applied in this sequence:

1. **Filter**: Apply all filter criteria (AND logic)
2. **Sort**: Order by `nextReviewDate` ascending, then `name` alphabetical
3. **Limit**: Truncate to `limit` results (after filtering and sorting)

The `totalCount` reflects the count AFTER filtering but BEFORE limit is applied.

#### Parameter Valid Ranges

| Parameter | Type | Valid Range | Validation |
|-----------|------|-------------|------------|
| `limit` | integer | 1-1000 | Error if < 1, > 1000, or non-integer |
| `futureDays` | integer | 1+ | Error if < 1; no enforced maximum |
| `folderId` | string | Valid OmniFocus ID | Error if folder not found |
| `folderName` | string | Exact match | Error if folder not found |

#### futureDays Behavior

- **Boundary inclusivity**: `futureDays=7` includes projects with `nextReviewDate` up to and INCLUDING today + 7 days (midnight of day 7)
- **When `includeFuture=false`**: The `futureDays` parameter is IGNORED (no error)
- **Default (no filters)**: Returns `nextReviewDate <= today` (overdue + due today)
- **Calculation basis**: All date comparisons use start-of-day (midnight) normalization

#### includeAll Behavior and Precedence

- `includeAll=true` overrides date-based filtering (`includeFuture`, `futureDays` are ignored)
- `includeAll=true` does NOT override:
  - `folderId` (folder scoping still applies)
  - `includeInactive` (status filtering still applies)
  - `reviewInterval=null` exclusion (still excludes non-reviewable projects)
- Precedence: `includeAll` takes effect BEFORE date filters are considered

#### includeInactive and Status Definitions

| Status | Active? | Default Behavior | With `includeInactive=true` |
|--------|---------|------------------|----------------------------|
| Active | Yes | Included | Included |
| On Hold | Yes | Included | Included |
| Done | No | Excluded | Included |
| Dropped | No | Excluded | Included |

**Note**: "On Hold" is considered ACTIVE (not inactive) because it's a temporary pause, not a terminal state. Projects on hold may still need review.

#### Folder Scoping (folderId / folderName)

- Scopes to specified folder and ALL nested subfolders (recursive, unlimited depth)
- `folderId` takes precedence over `folderName` if both provided
- `folderName` uses exact match via `flattenedFolders.byName()`
- Invalid `folderId` or `folderName`: Returns error (not empty results)
- `folderId: null` (explicitly passed): Treated as "all folders" (no scoping)
- `folderId: ""` (empty string): Validation error
- Omitted both: All folders (no scoping)

#### Empty Results Behavior

- Zero matching projects: Returns `{ success: true, projects: [], totalCount: 0 }`
- All filters apply, no matches: Returns empty array (not an error)
- `totalCount` is consistently returned even when 0

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| Project not found | `Project not found: {identifier}` |
| Multiple matches | `Multiple projects match '{name}'. Use ID for precision.` |
| No review interval | `Project '{name}' has no review interval configured` |
| Invalid unit | `Invalid interval unit: '{unit}'. Must be one of: days, weeks, months, years` |
| Invalid steps | `Invalid interval steps: must be a positive integer (1-365)` |
| Folder not found (by ID) | `Folder not found: {folderId}` |
| Folder not found (by name) | `Folder not found: {folderName}` |
| Empty folderId | `Invalid folderId: cannot be empty string` |
| Limit below minimum | `Invalid limit: {value}. Must be between 1 and 1000` |
| Limit above maximum | `Invalid limit: {value}. Must be between 1 and 1000` |
| Limit not an integer | `Invalid limit: must be an integer` |
| futureDays below minimum | `Invalid futureDays: {value}. Must be >= 1` |

---

## Key Entities

### ReviewInterval

Represents the cadence for project reviews.

- **steps**: Positive integer count of units (e.g., 2)
- **unit**: Time unit - 'days', 'weeks', 'months', 'years'
- **Semantics**: Value object - must reassign entire object to modify
- **null value**: Indicates project has no review schedule

### Review Date Properties

- **nextReviewDate**: Date when project is next due for review (WRITABLE)
- **lastReviewDate**: Date when project was last reviewed (READ-ONLY)
- **Format**: ISO 8601 date strings in API, native Date in OmniFocus

### Project Review States

| State | nextReviewDate | Appears in Default Results |
|-------|---------------|---------------------------|
| Overdue | Past date | Yes (prioritized) |
| Due Today | Today | Yes |
| Upcoming | Future date | Only with `includeFuture` |
| No Schedule | null | Never (no `reviewInterval`) |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `get_projects_for_review` returns correct projects in < 500ms for databases with 500+ projects
- **SC-002**: `mark_reviewed` correctly calculates `nextReviewDate` for all interval units (days, weeks, months, years)
- **SC-003**: Batch `mark_reviewed` processes 50 projects with 100% accuracy on per-item results
- **SC-004**: All three tools pass contract validation with Zod schemas
- **SC-005**: All tools handle disambiguation correctly (name matches multiple → error with candidates)
- **SC-006**: `set_review_interval` with `null` correctly removes project from review workflow
- **SC-007**: Integration tests verify round-trip: create interval → mark reviewed → verify date calculation

### Definition of Done

- [ ] All functional requirements (FR-001 through FR-036, including FR-004a, FR-008a, FR-008b, FR-011a, FR-011b, FR-030a through FR-030e) implemented
- [ ] Contract tests validate input/output schemas
- [ ] Unit tests cover all acceptance scenarios
- [ ] Integration tests verify OmniFocus interaction
- [ ] Tools registered in MCP server
- [ ] README updated with new tools
- [ ] CLAUDE.md updated with phase status

---

## API Reference

### OmniFocus Omni Automation Properties

```javascript
// Project review properties
project.nextReviewDate      // Date | null (WRITABLE)
project.lastReviewDate      // Date | null (READ-ONLY)
project.reviewInterval      // ReviewInterval | null (WRITABLE - value object)

// ReviewInterval structure
{
  steps: 1,                 // Positive integer
  unit: 'weeks'             // 'days' | 'weeks' | 'months' | 'years'
}

// To "mark reviewed" - set nextReviewDate using Calendar API (RECOMMENDED)
var today = Calendar.current.startOfDay(new Date());
var dc = new DateComponents();
// Map unit to DateComponents property (NOTE: DateComponents has NO .week property)
// Use dc.day = steps * 7 for weeks
switch (project.reviewInterval.unit) {
  case 'days':   dc.day   = project.reviewInterval.steps; break;
  case 'weeks':  dc.day   = project.reviewInterval.steps * 7; break;
  case 'months': dc.month = project.reviewInterval.steps; break;
  case 'years':  dc.year  = project.reviewInterval.steps; break;
}
project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);

// DateComponents unit mapping (NOTE: no .week property exists)
// reviewInterval.unit   → DateComponents property
// 'days'               → dc.day = steps
// 'weeks'              → dc.day = steps * 7
// 'months'             → dc.month = steps
// 'years'              → dc.year = steps

// To change interval - reassign entire object
project.reviewInterval = { steps: 2, unit: 'weeks' };

// To disable reviews
project.reviewInterval = null;
project.nextReviewDate = null;
```

### Date Calculation Pattern (Critical)

**DO use Calendar/DateComponents API:**

```javascript
// Correct: Handles month/year boundaries properly
var today = Calendar.current.startOfDay(new Date());
var dc = new DateComponents();
dc.month = 2;  // For "2 months" interval
var nextDate = Calendar.current.dateByAddingDateComponents(today, dc);
project.nextReviewDate = nextDate;
```

**DO NOT use millisecond arithmetic:**

```javascript
// WRONG: Fails for months/years (variable days)
var ms = project.reviewInterval.steps * 30 * 24 * 60 * 60 * 1000;
project.nextReviewDate = new Date(today.getTime() + ms);
```

The `Calendar.current.dateByAddingDateComponents()` method properly handles:

- Months with different day counts (28-31)
- Leap years
- Daylight saving time transitions

### DateComponents Unit Mapping

| reviewInterval.unit | DateComponents property |
|---------------------|------------------------|
| `'days'`            | `dc.day = steps`               |
| `'weeks'`           | `dc.day = steps * 7`           |
| `'months'`          | `dc.month = steps`             |
| `'years'`           | `dc.year = steps`              |

> **Note**: `DateComponents` has NO `.week` property. Weeks must use
> `dc.day = steps * 7`. This was confirmed via `Object.getOwnPropertyNames(new DateComponents())`
> in OmniFocus Script Editor.

### Date Calculation Test Cases (Validation Examples)

These concrete examples define expected behavior for implementation validation:

#### Standard Calculations

| Today | Interval | Expected Result | Notes |
|-------|----------|-----------------|-------|
| 2025-12-30 | {steps: 7, unit: 'days'} | 2026-01-06 | Year boundary crossing |
| 2025-12-30 | {steps: 1, unit: 'weeks'} | 2026-01-06 | Same as 7 days |
| 2025-12-30 | {steps: 2, unit: 'weeks'} | 2026-01-13 | 14 days |
| 2025-12-30 | {steps: 1, unit: 'months'} | 2026-01-30 | Standard month addition |
| 2025-12-30 | {steps: 1, unit: 'years'} | 2026-12-30 | Standard year addition |

#### Month Boundary Edge Cases (Calendar API Required)

| Today | Interval | Expected Result | Why Calendar API |
|-------|----------|-----------------|------------------|
| 2025-01-31 | {steps: 1, unit: 'months'} | 2025-02-28 | Feb has 28 days; clamps to last day |
| 2025-01-31 | {steps: 2, unit: 'months'} | 2025-03-31 | March has 31 days; preserves day |
| 2025-01-31 | {steps: 3, unit: 'months'} | 2025-04-30 | April has 30 days; clamps to last day |
| 2025-03-31 | {steps: 1, unit: 'months'} | 2025-04-30 | April has 30 days; clamps to last day |
| 2025-05-31 | {steps: 1, unit: 'months'} | 2025-06-30 | June has 30 days; clamps to last day |

#### Leap Year Edge Cases (Calendar API Required)

| Today | Interval | Expected Result | Why Calendar API |
|-------|----------|-----------------|------------------|
| 2024-02-29 | {steps: 1, unit: 'years'} | 2025-02-28 | 2025 not leap year; clamps to Feb 28 |
| 2024-02-29 | {steps: 4, unit: 'years'} | 2028-02-29 | 2028 is leap year; preserves Feb 29 |
| 2024-01-31 | {steps: 1, unit: 'months'} | 2024-02-29 | 2024 is leap year; Feb has 29 days |
| 2025-01-31 | {steps: 1, unit: 'months'} | 2025-02-28 | 2025 not leap year; Feb has 28 days |

#### Year Boundary Edge Cases

| Today | Interval | Expected Result | Notes |
|-------|----------|-----------------|-------|
| 2025-12-15 | {steps: 1, unit: 'months'} | 2026-01-15 | Year boundary handled automatically |
| 2025-11-30 | {steps: 2, unit: 'months'} | 2026-01-30 | Year boundary with month addition |
| 2025-12-31 | {steps: 1, unit: 'days'} | 2026-01-01 | New Year's boundary |

### Calendar API Error Handling

#### Input Validation (Before Calendar API)

Errors caught BEFORE reaching Calendar API calculation:

| Scenario | Error Handling | Error Message |
|----------|---------------|---------------|
| `reviewInterval` is `null` | Reject with error | "Project '{name}' has no review interval configured" |
| `reviewInterval.steps` <= 0 | Reject with error | "Invalid interval steps: must be a positive integer" |
| `reviewInterval.unit` invalid | Reject with error | "Invalid interval unit: '{unit}'. Must be one of: days, weeks, months, years" |
| Project not found | Reject with error | "Project not found: {identifier}" |

#### Calendar API Behavior (Edge Cases)

The Calendar/DateComponents API handles these automatically:

| Input | Behavior | Result |
|-------|----------|--------|
| `dc.day = 0` | No change | Returns input date unchanged |
| `dc.day = -7` | Subtracts 7 days | Valid (moves date backward) |
| `dc.month = -1` | Subtracts 1 month | Valid (moves date backward) |
| Large values (e.g., `dc.year = 1000`) | Calculates far future | May exceed JavaScript Date range |

#### Exception Handling Requirements

- **FR-034**: Implementation MUST wrap Calendar API calls in try-catch
- **FR-035**: Calendar API exceptions MUST be surfaced as structured errors
- **FR-036**: Implementation MUST NOT allow negative `steps` values (validate before API call)

```javascript
// Required error handling pattern
try {
  var today = Calendar.current.startOfDay(new Date());
  var dc = new DateComponents();
  // ... set DateComponents ...
  var nextDate = Calendar.current.dateByAddingDateComponents(today, dc);
  project.nextReviewDate = nextDate;
} catch (e) {
  return JSON.stringify({
    success: false,
    error: "Date calculation failed: " + (e.message || String(e))
  });
}
```

#### Date Range Limits

| Constraint | Value | Handling |
|------------|-------|----------|
| JavaScript Date minimum | -8,640,000,000,000,000 ms | Calendar API returns null |
| JavaScript Date maximum | 8,640,000,000,000,000 ms | Calendar API returns null |
| Practical limit | ~±285,000 years from epoch | Implementation should validate |

**Note**: For practical purposes, the contract enforces a maximum `steps`
value of **365** to prevent accidental extreme values (e.g., 365 years
covers any reasonable review cadence).

### Important Constraints

1. **No `markReviewed()` method** - must calculate and set `nextReviewDate` manually
2. **`lastReviewDate` is read-only** - OmniFocus updates this automatically when
   user marks reviewed in the app, but scripts cannot set it
3. **Value object semantics** - modifying `reviewInterval.steps` directly doesn't
   work; must reassign the entire object
4. **OmniFocus 3.11+ required** - `reviewInterval` property was added in version 3.11
5. **OmniFocus 3.0+ for Calendar API** - `Calendar.current` and `DateComponents` require 3.0+
6. **Use `Calendar.current.startOfDay()`** - normalizes time component for consistent date comparisons
7. **OmniFocus 3.0+ for filter()** - `flattenedProjects.filter()` requires OmniFocus 3.0+
8. **Tool naming vs implementation** - The `mark_reviewed` tool is named semantically
   (matching GTD terminology), but technically sets `nextReviewDate` since no
   `markReviewed()` method exists in the API
9. **`lastReviewDate` API ambiguity** - The official OmniAutomation API reference at
   OF-API.html does NOT mark `lastReviewDate` as read-only (unlike `flattenedTasks`,
   `hasChildren`, `parentFolder` which all carry explicit `r/o` tags). However,
   empirical testing during research (see research.md) confirmed it is effectively
   read-only from scripts. OmniFocus updates it internally when the user marks
   reviewed via the UI (Shift-Cmd-R). Treat as READ-ONLY for implementation safety.

---

## Out of Scope

- Review perspectives/views (UI concerns)
- Review statistics/analytics
- Reminder notifications for overdue reviews
- Automatic review scheduling based on project activity
- Integration with OmniFocus's built-in Review perspective
