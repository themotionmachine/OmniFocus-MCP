# Quickstart: Forecast Tools

**Branch**: `015-forecast` | **Date**: 2026-03-18

## Prerequisites

- Node.js 24+
- pnpm (detected via `pnpm-lock.yaml`)
- OmniFocus running on macOS

## Setup

```bash
pnpm install
pnpm build
```

## New Tools

### 1. get_forecast_range

Query forecast data for a date range. Returns per-day summaries.

**Default** (today + 7 days):
```json
{}
```

**Custom range**:
```json
{
  "startDate": "2026-03-18",
  "endDate": "2026-03-25"
}
```

**Response**:
```json
{
  "success": true,
  "days": [
    {
      "date": "2026-03-18T00:00:00.000Z",
      "name": "Today",
      "kind": "Today",
      "badgeCount": 5,
      "badgeStatus": "DueSoon",
      "deferredCount": 2
    },
    {
      "date": "2026-03-19T00:00:00.000Z",
      "name": "Thursday",
      "kind": "Day",
      "badgeCount": 0,
      "badgeStatus": "NoneAvailable",
      "deferredCount": 0
    }
  ],
  "totalDays": 2,
  "startDate": "2026-03-18T00:00:00.000Z",
  "endDate": "2026-03-25T00:00:00.000Z"
}
```

### 2. get_forecast_day

Query detailed forecast data for a single date.

**Default** (today):
```json
{}
```

**Specific date**:
```json
{
  "date": "2026-03-20"
}
```

**Response**:
```json
{
  "success": true,
  "day": {
    "date": "2026-03-20T00:00:00.000Z",
    "name": "Friday",
    "kind": "Day",
    "badgeCount": 3,
    "badgeStatus": "Available",
    "deferredCount": 1
  }
}
```

### 3. select_forecast_days

Navigate the Forecast perspective to specific dates.

```json
{
  "dates": ["2026-03-18", "2026-03-19", "2026-03-20"]
}
```

**Response**:
```json
{
  "success": true,
  "selectedDates": [
    "2026-03-18T00:00:00.000Z",
    "2026-03-19T00:00:00.000Z",
    "2026-03-20T00:00:00.000Z"
  ],
  "selectedCount": 3,
  "warning": "This operation changed the visible Forecast perspective in OmniFocus to show the selected dates. The user may notice the view has changed."
}
```

## File Locations

| Category | Path |
|----------|------|
| Contracts | `src/contracts/forecast-tools/` |
| Definitions | `src/tools/definitions/getForecast*.ts`, `selectForecastDays.ts` |
| Primitives | `src/tools/primitives/getForecast*.ts`, `selectForecastDays.ts` |
| Contract tests | `tests/contract/forecast-tools/` |
| Unit tests | `tests/unit/forecast-tools/getForecast*.test.ts`, `selectForecastDays.test.ts` |

## Testing

```bash
# Run all tests
pnpm test

# Run forecast-specific tests
pnpm test -- --testPathPattern=forecast

# Run contract tests only
pnpm test -- --testPathPattern=contract/forecast

# Run unit tests only
pnpm test -- --testPathPattern=unit/forecast-tools
```

## TDD Workflow

1. Write contract tests for Zod schemas (verify they FAIL)
2. Implement Zod schemas in `src/contracts/forecast-tools/` (tests go GREEN)
3. Write unit tests for primitives (verify they FAIL)
4. Implement primitives in `src/tools/primitives/` (tests go GREEN)
5. Implement definitions in `src/tools/definitions/`
6. Register tools in `src/server.ts`
7. `pnpm build` and manual verification in OmniFocus
