# Feature Specification: Forecast Tools

**Feature Branch**: `015-forecast`
**Created**: 2026-03-18
**Status**: Draft
**Input**: User description: "Forecast tools for querying forecast data and navigating the Forecast perspective via MCP"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Forecast Overview for a Date Range (Priority: P1)

As a GTD practitioner, I want to get a forecast overview for a date range so I can see what is due and deferred across the next week or any custom range. This is the most fundamental forecast capability -- it answers the daily question "what does my upcoming week look like?" and powers weekly review workflows.

**Why this priority**: This is the core discovery tool. Without a range overview, users cannot assess their upcoming workload or plan effectively. Every other forecast tool builds on the mental model this one establishes.

**Independent Test**: Can be fully tested by requesting a forecast for a date range and verifying that each day in the range returns its date, display name, day kind, badge count, badge status, and deferred count. Delivers immediate value for daily and weekly review workflows.

**Acceptance Scenarios**:

1. **Given** the user requests a forecast with no date parameters, **When** the system processes the request, **Then** it returns forecast data for today plus the next 7 days (8 days total), with each day including date, name, kind, badge count, badge status, and deferred count.
2. **Given** the user requests a forecast with a specific start date and end date, **When** the system processes the request, **Then** it returns forecast data for every day in that range (inclusive), ordered chronologically.
3. **Given** the user requests a forecast with only a start date, **When** the system processes the request, **Then** it returns forecast data for 7 days starting from the specified date.
4. **Given** the user requests a forecast for a range that includes today, **When** the system returns results, **Then** the entry for today has its kind identified as "Today" and all other days have their appropriate kind values.
5. **Given** the user requests a forecast for a range entirely in the past, **When** the system returns results, **Then** past days are included with their kind identified as "Past" and their badge/deferred counts reflect the actual state.
6. **Given** the user requests a forecast for a range where no tasks are due or deferred on any day, **When** the system returns results, **Then** each day still appears in the response with badge count and deferred count both showing zero.

---

### User Story 2 - Detailed Forecast for a Specific Day (Priority: P2)

As a GTD practitioner, I want to get detailed forecast data for a specific day so I can understand exactly what is due, what is deferred, and the badge status for that date. This supports focused daily planning -- "what exactly is on my plate for Tuesday?"

**Why this priority**: While the range overview gives a summary, this tool provides the focused detail needed for per-day planning. It is the natural follow-up after scanning the weekly overview and has high standalone value for "what is due today?" queries.

**Independent Test**: Can be fully tested by requesting forecast data for a single date and verifying the response includes all forecast day properties (date, name, kind, badge count, badge status, deferred count). Delivers value for daily planning without requiring any other forecast tool.

**Acceptance Scenarios**:

1. **Given** the user requests forecast data for today, **When** the system processes the request, **Then** it returns the forecast day details including date, name ("Today"), kind ("Today"), badge count, badge status, and deferred count.
2. **Given** the user requests forecast data for a specific future date, **When** the system processes the request, **Then** it returns the forecast day with kind "Day" and accurate badge and deferred counts.
3. **Given** the user requests forecast data for a date with overdue items, **When** the system returns the result, **Then** the badge status reflects "Overdue".
4. **Given** the user requests forecast data for a date with no due or deferred items, **When** the system returns the result, **Then** badge count is zero, deferred count is zero, and badge status reflects "NoneAvailable".
5. **Given** the user requests forecast data using an invalid date format, **When** the system processes the request, **Then** it returns a clear validation error indicating the expected date format.

---

### User Story 3 - Navigate Forecast Perspective to Specific Days (Priority: P3)

As a GTD practitioner, I want to navigate the Forecast perspective to specific days so the AI assistant can show me exactly the dates I am discussing. This bridges the AI conversation with the visual OmniFocus interface.

**Why this priority**: This is a UI navigation convenience that enhances the experience but does not provide new data. It depends on the user having OmniFocus visible and is a side-effect operation. Valuable but not essential for data-driven workflows.

**Independent Test**: Can be fully tested by requesting navigation to one or more specific dates and verifying the Forecast perspective visually shows those dates selected. Delivers value as a standalone "show me this day" command.

**Acceptance Scenarios**:

1. **Given** the user requests navigation to a single date, **When** the system processes the request, **Then** the Forecast perspective navigates to show that specific date selected.
2. **Given** the user requests navigation to multiple dates, **When** the system processes the request, **Then** the Forecast perspective navigates to show all specified dates selected.
3. **Given** the user requests navigation to a date, **When** the system processes the request, **Then** the response includes a clear warning that this operation changed the visible UI state in OmniFocus.
4. **Given** the user requests navigation with an invalid date, **When** the system processes the request, **Then** it returns a validation error without altering the current Forecast perspective state.
5. **Given** the user requests navigation to a date far in the future, **When** the system processes the request, **Then** the Forecast perspective navigates to that date (the system does not impose an artificial range limit).

---

### Edge Cases

- What happens when the start date is after the end date in a range request? The system must return a validation error indicating the start date must be before or equal to the end date.
- What happens when the date range spans an extremely large period (e.g., 365+ days)? The system should impose a reasonable maximum range limit and return an error if exceeded, to prevent performance degradation.
- What happens when OmniFocus is not running and a forecast query is made? The system returns an error consistent with other tools' behavior when OmniFocus is unavailable.
- What happens when the Forecast perspective is not the active perspective and any forecast tool is called? Both `forecastDayForDate()` and `selectForecastDays()` throw errors if Forecast is not active. The OmniJS script auto-switches to Forecast perspective before querying.
- What happens when `select_forecast_days` is called with an empty list of dates? The system must return a validation error requiring at least one date.
- How does the system handle dates at timezone boundaries (e.g., 23:59 vs 00:00)? Dates are interpreted as full calendar days in the user's local timezone, consistent with how OmniFocus handles dates.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a way to retrieve forecast data for a configurable date range, defaulting to today plus 7 days when no range is specified.
- **FR-002**: System MUST return the following properties for each forecast day: date, display name, day kind classification, badge count, badge status, and deferred count.
- **FR-003**: System MUST support day kind classifications: Day, Today, Past, FutureMonth, and DistantFuture.
- **FR-004**: System MUST support badge status values: Available, DueSoon, NoneAvailable, and Overdue.
- **FR-005**: System MUST provide a way to retrieve detailed forecast data for a single specific date.
- **FR-006**: System MUST provide a way to navigate the Forecast perspective to one or more specified dates.
- **FR-007**: System MUST clearly warn AI assistants that the navigation operation changes the user's visible UI state, so they can inform the user before or after invoking it.
- **FR-008**: System MUST accept date parameters in ISO 8601 format, interpreted as local time consistent with OmniFocus date handling.
- **FR-009**: System MUST validate all date inputs and return clear error messages for invalid formats or illogical ranges (e.g., start date after end date).
- **FR-010**: System MUST require at least one date when navigating the Forecast perspective.
- **FR-011**: System MUST impose a maximum date range limit to prevent performance issues when querying forecast data over excessively large ranges.
- **FR-012**: System MUST return forecast days in chronological order when returning a range.

### Key Entities

- **ForecastDay**: Represents a single calendar day in the forecast. Key attributes: date, display name (e.g., "Monday", "Today"), day kind (Day, Today, Past, FutureMonth, DistantFuture), badge count (number of due items), badge status (Available, DueSoon, NoneAvailable, Overdue), and deferred count (number of items becoming available).
- **DateRange**: Represents a time period for querying forecast data. Key attributes: start date, end date, with a sensible default (today + 7 days) when not fully specified.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can retrieve a weekly forecast overview in a single request, receiving per-day summaries for all days in the range.
- **SC-002**: Users can query any specific date and receive complete forecast details (badge count, badge status, deferred count, day kind, display name) in a single request.
- **SC-003**: Users can navigate the OmniFocus Forecast perspective to any set of dates through a single AI assistant command.
- **SC-004**: All forecast queries for ranges up to 30 days complete and return results without noticeable delay to the user.
- **SC-005**: 100% of invalid date inputs produce clear, actionable error messages that guide the user to correct their request.
- **SC-006**: The navigation tool's response always includes an explicit acknowledgment that the UI state was changed, ensuring no silent side effects.

## Assumptions

- OmniFocus must be running for all forecast operations (consistent with all other tools in the MCP server).
- The default forecast range of "today + 7 days" aligns with typical GTD weekly review workflows.
- A maximum date range limit of 90 days is a reasonable default to prevent performance issues while supporting quarterly planning horizons. This is an implementation-time decision and can be adjusted.
- **CRITICAL**: Both `forecastDayForDate()` AND `selectForecastDays()` throw errors if Forecast is not the current perspective. ALL OmniJS scripts for forecast tools MUST first switch to `window.perspective = Perspective.BuiltIn.Forecast` before calling either method. The script should auto-switch to Forecast perspective silently (Option A from Clarify Session 2). **NOTE**: The `Timer.once(1, callback)` pattern from official OmniJS examples is designed for plugin/URL-scheme contexts and is incompatible with this MCP server's synchronous `evaluateJavascript` execution model (see Session 3, item 1). Scripts MUST attempt the synchronous approach (set perspective, then immediately call Forecast APIs) and handle any perspective-not-ready errors via try-catch with PERSPECTIVE_SWITCH_FAILED error code. Implementers MUST verify this approach in OmniFocus Script Editor.
- Badge status is derived at query time from the current state of tasks (it is not a stored value).
- The navigation tool operates on the frontmost OmniFocus window.

## Clarifications (from API Research)

### Session 1: ForecastDay API Behavior (2026-03-18)

1. **`forecastDayForDate(date)` is a DocumentWindow method** — NOT a static/global method. Access via `document.windows[0].forecastDayForDate(targetDate)`. All forecast data queries require a window reference. There is no `document.forecast` collection.
2. **Date iteration pattern** — Construct dates using `Calendar.current.startOfDay(now)` + `DateComponents` + `Calendar.current.dateByAddingDateComponents()`, then query each date individually via `window.forecastDayForDate(date)`. Loop over the range, incrementing via DateComponents. **Day count calculation**: Compute `dayCount = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1` where both dates are midnight-normalized via `Calendar.current.startOfDay()`. Millisecond arithmetic is safe for day-counting between midnight-normalized dates (DST-off-by-one only applies to variable-length period addition). Then iterate `for (var i = 0; i < dayCount; i++)` with `dc.day = i` and `Calendar.current.dateByAddingDateComponents(startDay, dc)` to advance the cursor.
3. **Complete ForecastDay properties** — `date` (Date r/o), `name` (String r/o), `kind` (ForecastDay.Kind r/o), `badgeCount` (Number r/o), `deferredCount` (Number r/o), plus `badgeKind()` (function returning ForecastDay.Status). Class property: `badgeCountsIncludeDeferredItems` (Boolean r/w) — determines whether badge counts include deferred items. **Decision**: This class property controls a global Forecast preference and MUST NOT be modified by any forecast tool (read-only observation). The implementation MUST NOT read or set this property; it is documented here for completeness only. The separate `badgeCount` and `deferredCount` instance properties already provide the data breakdown needed by AI assistants.
4. **`badgeKind()` always returns a value** — The `ForecastDay.Status` enum includes `NoneAvailable` for days with no items. It never returns null/undefined.
5. **`forecastDay.date` returns a JavaScript Date object** — per API: `var date → Date read-only`. For Past/DistantFuture kinds, the returned date may be years from current time.
6. **`selectForecastDays(fdays)` accepts an array of ForecastDay objects** (not Date objects). Must first obtain ForecastDay via `forecastDayForDate()`, then pass to `selectForecastDays()`.
7. **Forecast perspective switching** — The Forecast perspective must be active for `selectForecastDays()`. Official examples use `Timer.once(1, callback)` after setting perspective. **SUPERSEDED by Session 3, item 1**: Timer.once is incompatible with this MCP server's evaluateJavascript execution model. Use synchronous IIFE pattern instead.

### Session 2: Forecast Navigation & Edge Cases (2026-03-18)

1. **`selectForecastDays()` throws if Forecast not active** — Official API: "This will throw an error if Forecast is not the current perspective in this window." Does NOT auto-switch. Script must switch first.
2. **`forecastDayForDate()` ALSO throws if Forecast not active** — Same constraint. Both data and navigation require Forecast perspective. Decision: auto-switch in all OmniJS scripts.
3. **Past/DistantFuture are aggregate nodes, not individual days** — "If this day's kind is Past or DistantFuture the date returned will be years from the current time." Past is a single node for all past items, not one node per past day. Same for DistantFuture.
4. **`ForecastDay.Kind` is complete** — Day, Today, Past, FutureMonth, DistantFuture. The `all` property returns the complete array. No undocumented values.
5. **Empty days still navigate** — `selectForecastDays()` works with ForecastDay objects regardless of badge count. No throw on empty days.
6. **Timer.once pattern in official examples** — Official OmniJS examples on omni-automation.com use `Timer.once(1, callback)` after setting `window.perspective = Perspective.BuiltIn.Forecast` to allow the perspective switch to complete. The delay value of 1 second is a fixed convention from official examples (not configurable). **IMPORTANT**: This pattern is designed for OmniJS plugin/URL-scheme execution contexts. In this MCP server's execution model (`app.evaluateJavascript()` via JXA), `evaluateJavascript` returns synchronously -- any value returned inside a `Timer.once` callback is discarded because the JXA context has already returned. See Session 3 below for the resolution.

### Session 3: Execution Model & Remaining API Details (2026-03-19)

1. **Timer.once is incompatible with evaluateJavascript execution model** — The MCP server executes OmniJS via JXA `app.evaluateJavascript(script)`, which is synchronous. It returns whatever the script body evaluates to. `Timer.once(1, callback)` schedules the callback to fire AFTER `evaluateJavascript` has already returned, so any `return JSON.stringify(...)` inside the callback is discarded. **Decision**: All forecast OmniJS scripts MUST use the standard synchronous IIFE pattern without Timer.once. The perspective switch (`window.perspective = Perspective.BuiltIn.Forecast`) is set synchronously, then `forecastDayForDate()` is called immediately in the same synchronous execution. If this throws because the perspective has not yet taken effect, the outer try-catch captures the error and returns a PERSPECTIVE_SWITCH_FAILED error code. Implementers MUST verify in OmniFocus Script Editor whether the synchronous approach works or whether an alternative execution strategy is needed.
2. **Date input/output format asymmetry** — Date inputs are specified in ISO 8601 format (YYYY-MM-DD) interpreted as local time (consistent with OmniFocus date handling per FR-008). Date outputs use JavaScript `Date.toISOString()` which produces UTC strings (e.g., `2026-03-18T00:00:00.000Z` for midnight local time). This asymmetry is intentional: input format is user-friendly, output format is machine-parseable. AI assistants should be aware that output dates are UTC and may show the previous day for timezones west of GMT.
3. **badgeKind() for deferred-only days** — Per official API documentation, `NoneAvailable` means "There are no available tasks on the node's day. The node's badgeCount is guaranteed to be zero." A day with only deferred items (not yet available) returns `NoneAvailable` with `badgeCount = 0` but `deferredCount > 0`. This is the expected behavior: `badgeKind()` reflects available/due task status, not deferred items.
4. **PERSPECTIVE_SWITCH_FAILED conditions** — This error code is returned when the perspective switch to Forecast fails or when `forecastDayForDate()`/`selectForecastDays()` throws despite the perspective being set. Possible causes: perspective switch not yet effective (race condition in synchronous execution), OmniFocus UI in a state that prevents perspective changes, or the Forecast perspective is unavailable. The error message MUST include the underlying OmniJS exception text to aid debugging.

## Out of Scope

- Modifying forecast data (forecast is derived from task due dates and defer dates -- users should modify tasks via existing task tools).
- Calendar event integration (OmniFocus Automation JavaScript does not expose calendar data).
- Forecast preferences or settings (deferred to future settings-related specifications).
- Filtering forecast results by project, tag, or other task attributes (users should use existing task query tools for filtered views).
- Historical forecast snapshots or trend analysis.
