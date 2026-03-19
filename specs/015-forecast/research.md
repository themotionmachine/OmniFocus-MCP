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

**Decision**: All OmniJS forecast scripts must auto-switch to Forecast perspective with `Timer.once(1, callback)` delay before calling any Forecast API methods.

**Rationale**: Both `forecastDayForDate()` and `selectForecastDays()` throw errors if the Forecast perspective is not active. The Forecast perspective must be set and a 1-second timer delay allows the perspective switch to complete before API calls. This pattern is documented in official OmniJS examples.

**Pattern**:
```javascript
var win = document.windows[0];
win.perspective = Perspective.BuiltIn.Forecast;
Timer.once(1, function() {
  // Forecast API calls safe here
  var fday = win.forecastDayForDate(targetDate);
});
```

**Alternatives considered**:
- Synchronous check-and-call: Not possible; perspective switch is asynchronous
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
