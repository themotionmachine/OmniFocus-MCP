# Research: Forecast Tools

**Branch**: `015-forecast` | **Date**: 2026-03-18
**Status**: Complete (all unknowns resolved)

## Research Tasks

### 1. OmniJS Forecast API Access Pattern

**Decision**: Use `document.windows[0].forecastDayForDate(date)` for all forecast data access.

**Rationale**: `forecastDayForDate()` is a DocumentWindow method, not a static/global method. There is no `document.forecast` collection. All forecast data must be queried through a window reference, one date at a time via iteration.

**Alternatives considered**:
- Static/global ForecastDay collection: Does not exist in OmniJS API
- Batch query method: No batch API exists; must iterate dates individually

### 2. Forecast Perspective Auto-Switch Pattern

**Decision**: All OmniJS forecast scripts must auto-switch to Forecast perspective synchronously before calling any Forecast API methods. **UPDATED**: Timer.once pattern is NOT used (see item 11 for rationale).

**Rationale**: Both `forecastDayForDate()` and `selectForecastDays()` throw errors if the Forecast perspective is not active. The perspective switch is set synchronously via `window.perspective = Perspective.BuiltIn.Forecast`, then Forecast APIs are called immediately. Official OmniJS examples use `Timer.once(1, callback)` for plugin/URL-scheme contexts, but this is incompatible with the MCP server's JXA `evaluateJavascript` execution model (see item 11).

**Pattern**:
```javascript
var win = document.windows[0];
win.perspective = Perspective.BuiltIn.Forecast;
// Synchronous -- no Timer.once. If perspective not yet effective, catch block handles error.
var fday = win.forecastDayForDate(targetDate);
```

**Alternatives considered**:
- Timer.once(1, callback): Incompatible with evaluateJavascript; return value lost (see item 11)
- Skip perspective switch (assume already active): Unreliable; other tools may have changed the perspective
- Check current perspective first, skip switch if already Forecast: Adds complexity for marginal benefit; always switching is idempotent and simpler (KISS)

### 3. Date Iteration Pattern in OmniJS

**Decision**: Use `Calendar.current.startOfDay(now)` + `DateComponents` + `Calendar.current.dateByAddingDateComponents()` to iterate over date ranges.

**Rationale**: OmniJS uses the Omni Automation Calendar/DateComponents API for date arithmetic, not JavaScript's native Date math. This avoids timezone and DST edge cases.

**Pattern**:
```javascript
var cal = Calendar.current;
var start = cal.startOfDay(new Date("2026-03-18"));
var dc = new DateComponents();
for (var i = 0; i <= dayCount; i++) {
  dc.day = i;
  var date = cal.dateByAddingDateComponents(start, dc);
  var fday = win.forecastDayForDate(date);
  // process fday
}
```

**Alternatives considered**:
- JavaScript `Date.setDate(getDate() + 1)`: Fragile with DST transitions
- Millisecond addition (date + 86400000): Fails on DST days (23 or 25 hours)

### 4. ForecastDay Property Extraction

**Decision**: Extract all 6 properties per ForecastDay: `date`, `name`, `kind`, `badgeCount`, `badgeKind()`, `deferredCount`.

**Rationale**: These are the complete set of ForecastDay properties available in the OmniJS API (confirmed via Clarify Session 1). `badgeKind()` is a function call (not a property), returning `ForecastDay.Status` enum value.

**Key details**:
- `badgeKind()` always returns a value (never null); `NoneAvailable` is the zero-state
- `kind` is a `ForecastDay.Kind` enum value
- `date` returns a JavaScript Date object
- For `Past`/`DistantFuture` kinds, the returned date may be years from current time

**Alternatives considered**:
- Return only badge data: Insufficient for weekly overview use case
- Include task-level details: Out of scope per spec (users should use existing task query tools)

### 5. ForecastDay Enum Serialization

**Decision**: Serialize ForecastDay.Kind and ForecastDay.Status enum values using string name mapping in OmniJS, validated by Zod z.enum() on the TypeScript side.

**Rationale**: OmniJS enum values are objects, not strings. They need explicit mapping to string names for JSON serialization. This follows the pattern established in repetition-tools for ScheduleType/RepetitionMethod enums.

**ForecastDay.Kind values**: Day, Today, Past, FutureMonth, DistantFuture
**ForecastDay.Status values**: Available, DueSoon, NoneAvailable, Overdue

**OmniJS serialization pattern**:
```javascript
function kindToString(kind) {
  if (kind === ForecastDay.Kind.Day) return 'Day';
  if (kind === ForecastDay.Kind.Today) return 'Today';
  if (kind === ForecastDay.Kind.Past) return 'Past';
  if (kind === ForecastDay.Kind.FutureMonth) return 'FutureMonth';
  if (kind === ForecastDay.Kind.DistantFuture) return 'DistantFuture';
  return 'Unknown';
}

function statusToString(status) {
  if (status === ForecastDay.Status.Available) return 'Available';
  if (status === ForecastDay.Status.DueSoon) return 'DueSoon';
  if (status === ForecastDay.Status.NoneAvailable) return 'NoneAvailable';
  if (status === ForecastDay.Status.Overdue) return 'Overdue';
  return 'Unknown';
}
```

**Alternatives considered**:
- Use `.toString()` on enum values: Unreliable; format is implementation-dependent
- Use numeric indices: Fragile across OmniFocus versions

### 6. Past/DistantFuture Aggregate Node Handling

**Decision**: When iterating a date range, each date is queried individually via `forecastDayForDate()`. If the returned ForecastDay has `kind === Past` or `kind === DistantFuture`, it is still included in results with its actual kind value. The date field is taken from the queried date (input), not from the ForecastDay object's date property (which may be years away for aggregate nodes).

**Rationale**: Past and DistantFuture are aggregate nodes in the Forecast perspective, not individual day entries. When `forecastDayForDate()` returns a ForecastDay with `Past` kind, the badge count reflects ALL past items, not just that specific date. This is a characteristic of the OmniFocus API that must be documented for AI assistants.

**Alternatives considered**:
- Skip Past/DistantFuture days entirely: Loses information the user asked for
- Deduplicate aggregate nodes: Could lose valid date entries; simpler to include with kind annotation

### 7. selectForecastDays() Input Requirements

**Decision**: `selectForecastDays()` requires an array of ForecastDay objects (not Date objects). Must first obtain ForecastDay via `forecastDayForDate()` for each target date, then pass the array to `selectForecastDays()`.

**Rationale**: The OmniJS API signature is `selectForecastDays(fdays: ForecastDay[])`. Passing Date objects would throw a type error.

**Pattern**:
```javascript
var fdays = [];
dates.forEach(function(dateStr) {
  var d = new Date(dateStr);
  var fday = win.forecastDayForDate(d);
  fdays.push(fday);
});
win.selectForecastDays(fdays);
```

**Alternatives considered**: None; this is the only API available.

### 8. Maximum Range Limit

**Decision**: 90-day maximum range for `get_forecast_range`, validated in Zod schema and enforced server-side before OmniJS execution.

**Rationale**: Each day in the range requires a separate `forecastDayForDate()` call inside OmniJS. 90 days supports quarterly planning horizons while preventing performance degradation. The limit is enforced at the Zod validation level (before any OmniJS execution).

**Alternatives considered**:
- 30-day limit: Too restrictive for quarterly reviews
- 365-day limit: 365 individual API calls per request risks timeout
- No limit: Unbounded iteration is a performance risk

### 9. Default Date Range Behavior

**Decision**: When no dates are specified for `get_forecast_range`, default to today + 7 days (8 days total, inclusive of today).

**Rationale**: Aligns with typical GTD weekly review workflows. When only `startDate` is provided, default to 7 days from start. When only `endDate` is provided, default start to today.

**Alternatives considered**:
- 14-day default: Too broad for most daily planning
- 5-day (work week) default: Excludes weekends, which many GTD practitioners include

### 10. UI State Change Warning for select_forecast_days

**Decision**: The `select_forecast_days` response includes a `warning` field with text explicitly stating that the operation changed the visible UI state in OmniFocus.

**Rationale**: FR-007 requires clear warning that navigation changes UI state. This follows the same principle as `getPerspectiveView` which warns about perspective mismatches. The warning is always present in success responses (not optional).

**Alternatives considered**:
- Warning only in tool description: Not visible in response; AI assistant might not relay it
- Separate confirmation step: Over-engineered for a read/navigate operation (YAGNI)

### 11. Timer.once Incompatibility with evaluateJavascript (Checklist Gap Resolution)

**Decision**: Do NOT use `Timer.once(1, callback)` in OmniJS scripts executed via this MCP server. Use the standard synchronous IIFE pattern instead.

**Rationale**: The MCP server executes OmniJS via JXA `app.evaluateJavascript(script)` (see `src/utils/scriptExecution.ts`). This call is synchronous -- it blocks until the script body finishes and returns the last evaluated expression. `Timer.once(1, callback)` schedules the callback to fire 1 second AFTER `evaluateJavascript` has already returned. Any `return JSON.stringify(...)` inside the callback is discarded. No existing primitive in this codebase (50+ tools) uses Timer.once. The official examples on omni-automation.com that use Timer.once are designed for OmniJS plugin/URL-scheme execution contexts, not for the JXA embedding model.

**Implication**: The perspective switch (`window.perspective = Perspective.BuiltIn.Forecast`) must be set synchronously, followed by an immediate call to `forecastDayForDate()` in the same execution. If the synchronous approach fails because the perspective hasn't taken effect, the script catches the error and returns PERSPECTIVE_SWITCH_FAILED. Implementers MUST verify this in OmniFocus Script Editor before integration.

**Sources**:
- `src/utils/scriptExecution.ts` line 31: `const result = app.evaluateJavascript(...)` (synchronous)
- omni-automation.com/omnifocus/window.html: "scripts may occasionally incorporate the use of a Timer function to allow the window time to change views" (plugin context)
- discourse.omnigroup.com: `evaluateJavascript` returns synchronously in JXA context

**Alternatives considered**:
- Use Timer.once as shown in official examples: Incompatible with evaluateJavascript; return value lost
- Use a polling/retry loop inside the script: Over-engineered; try synchronous first, fail gracefully
- Use a different execution method (URL scheme): Would require architecture change; out of scope

### 12. dayCount Calculation Formula

**Decision**: Use millisecond arithmetic on midnight-normalized dates for day counting: `Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1`.

**Rationale**: The Calendar API prohibition (Constitution Principle III) applies to adding variable-length periods (months/years) where DST transitions cause off-by-one errors. Day counting between midnight-normalized dates (`Calendar.current.startOfDay()`) is safe with millisecond math because both dates are at 00:00:00. This pattern is consistent with `getProjectsForReview.ts` which uses `getTime()` for date comparisons. The `+1` makes the range inclusive of both start and end dates.

**Sources**:
- `src/tools/primitives/getProjectsForReview.ts`: Uses `getTime()` for date comparisons
- `specs/005-review-system/research.md`: Calendar API vs millisecond math guidance

### 13. badgeCountsIncludeDeferredItems Handling

**Decision**: Do NOT read or set `ForecastDay.badgeCountsIncludeDeferredItems` in any forecast tool. Document as out-of-scope.

**Rationale**: This is a class-level Boolean property (confirmed via omni-automation.com/omnifocus/forecast.html) that controls a global Forecast preference. Modifying it would change behavior for all of OmniFocus, not just the MCP query. The separate `badgeCount` and `deferredCount` instance properties already provide the data breakdown needed by AI assistants. Setting this property falls under "Forecast preferences or settings" which is explicitly out of scope.

**Sources**:
- omni-automation.com/omnifocus/forecast.html: "Determines whether or not badges on Forecast days include items that are not yet available"
- Spec Out of Scope: "Forecast preferences or settings (deferred to future settings-related specifications)"

### 14. badgeKind() for Deferred-Only Days

**Decision**: Document that `badgeKind()` returns `NoneAvailable` for days with only deferred items (no available tasks).

**Rationale**: Per official API documentation, `NoneAvailable` means "There are no available tasks on the node's day. The node's badgeCount is guaranteed to be zero." A day with only deferred items has `badgeCount = 0` and `deferredCount > 0`. The `badgeKind()` function reflects available/due task status only, not deferred items.

**Sources**:
- omni-automation.com/omnifocus/forecast.html: ForecastDay.Status.NoneAvailable definition
- omni-automation.com/omnifocus/OF-API.html: `NoneAvailable` -- "There are no available tasks"

### 15. Date Input/Output Format Asymmetry

**Decision**: Document the intentional asymmetry between local-time date inputs (YYYY-MM-DD) and UTC date outputs (`Date.toISOString()`).

**Rationale**: Input dates use YYYY-MM-DD interpreted as local time (consistent with OmniFocus, per FR-008). Output dates use JavaScript's `Date.toISOString()` which produces UTC strings. This means midnight local time may appear as a different (often previous) calendar date in UTC for timezones east of UTC (e.g., `2026-03-18` in UTC+8 becomes `2026-03-17T16:00:00.000Z`). This is documented as intentional; AI assistants should be aware of the timezone offset in output dates.
