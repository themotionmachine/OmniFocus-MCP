# Data Model: Forecast Tools

**Branch**: `015-forecast` | **Date**: 2026-03-18

## Entities

### ForecastDayOutput

Represents a single calendar day's forecast data as returned by the MCP server.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| date | string (ISO 8601) | Yes | The calendar date queried (from input, not from ForecastDay.date which may be distant for aggregate nodes) |
| name | string | Yes | Display name (e.g., "Monday", "Today", "Past") |
| kind | ForecastDayKind | Yes | Day classification enum |
| badgeCount | number (int >= 0) | Yes | Number of due items |
| badgeStatus | ForecastDayStatus | Yes | Badge status classification |
| deferredCount | number (int >= 0) | Yes | Number of items becoming available |

**Notes**:
- `date` uses the queried date (input parameter), not `forecastDay.date` which returns distant dates for Past/DistantFuture aggregate nodes
- `badgeCount` for Past/DistantFuture nodes reflects ALL items in that aggregate category, not a single day
- `badgeStatus` is derived from `badgeKind()` function call (parentheses required)

### ForecastDayKind (Enum)

Classification of a forecast day node.

| Value | Description |
|-------|-------------|
| Day | A regular calendar day |
| Today | The current day |
| Past | Aggregate node for all past items |
| FutureMonth | A day in a future month |
| DistantFuture | Aggregate node for distant future items |

**Source**: `ForecastDay.Kind.*` OmniJS enum constants.

### ForecastDayStatus (Enum)

Badge status classification for a forecast day.

| Value | Description |
|-------|-------------|
| Available | Items are available (not overdue, not due soon) |
| DueSoon | Items are due soon |
| NoneAvailable | No items due or deferred |
| Overdue | Items are overdue |

**Source**: `ForecastDay.Status.*` OmniJS enum constants, accessed via `forecastDay.badgeKind()`.

## Relationships

```text
get_forecast_range ──returns──> ForecastDayOutput[]
get_forecast_day   ──returns──> ForecastDayOutput
select_forecast_days ──uses──> ForecastDay (OmniJS internal, not exposed)
```

All entities are read-only projections of OmniFocus internal state. No write operations. No state transitions. Forecast data is derived from task due dates and defer dates.

## Validation Rules

| Rule | Scope | Description |
|------|-------|-------------|
| ISO 8601 date format | All date inputs | Dates must parse as valid ISO 8601 strings |
| Start <= End | get_forecast_range | startDate must not be after endDate |
| Max 90-day range | get_forecast_range | endDate - startDate must not exceed 90 days |
| Non-empty dates array | select_forecast_days | At least 1 date required |
| Max 90 dates | select_forecast_days | Array size capped at 90 entries |
| badgeCount >= 0 | ForecastDayOutput | Badge count is never negative |
| deferredCount >= 0 | ForecastDayOutput | Deferred count is never negative |
