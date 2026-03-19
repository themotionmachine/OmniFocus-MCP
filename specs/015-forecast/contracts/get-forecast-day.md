# Contract: get_forecast_day

**Tool Name**: `get_forecast_day`
**Category**: Read-only forecast query
**FR Coverage**: FR-002, FR-003, FR-004, FR-005, FR-008, FR-009

## Shared Schema Reuse Decision

This tool reuses the exact same `ForecastDayOutputSchema` as `get_forecast_range`. There are NO extended detail fields for single-day queries. The OmniJS `forecastDayForDate(date)` API returns identical `ForecastDay` objects regardless of whether called once or in a loop -- the complete property set is `date`, `name`, `kind`, `badgeCount`, `deferredCount`, and `badgeKind()`. User Story 2's "detailed forecast data" refers to the full ForecastDayOutput shape (all 6 fields) as the complete detail for a day, not additional fields beyond what the range query returns. The difference between `get_forecast_day` and `get_forecast_range` is scope (single day vs. range), not detail level.

## Input Schema

```typescript
// src/contracts/forecast-tools/get-forecast-day.ts
import { z } from 'zod';
import { ForecastDayOutputSchema } from './shared/index.js';

export const GetForecastDayInputSchema = z.object({
  date: z
    .string()
    .optional()
    .describe(
      'Date in ISO 8601 format (YYYY-MM-DD). Default: today. Interpreted as local time.'
    )
});

export type GetForecastDayInput = z.infer<typeof GetForecastDayInputSchema>;
```

## Output Schema (Success)

```typescript
export const GetForecastDaySuccessSchema = z.object({
  success: z.literal(true),
  day: ForecastDayOutputSchema.describe('Forecast data for the requested date')
});

export type GetForecastDaySuccess = z.infer<typeof GetForecastDaySuccessSchema>;
```

## Output Schema (Error)

```typescript
export const GetForecastDayErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z
    .string()
    .optional()
    .describe(
      'Error code: INVALID_DATE, NO_WINDOW, PERSPECTIVE_SWITCH_FAILED'
    )
});

export type GetForecastDayError = z.infer<typeof GetForecastDayErrorSchema>;
```

## Response (Discriminated Union)

```typescript
export const GetForecastDayResponseSchema = z.discriminatedUnion('success', [
  GetForecastDaySuccessSchema,
  GetForecastDayErrorSchema
]);

export type GetForecastDayResponse = z.infer<typeof GetForecastDayResponseSchema>;
```

## Validation Rules

1. If `date` provided, must parse as valid date
2. Default `date` = today when omitted

## Date Format Asymmetry

Date input uses `YYYY-MM-DD` format interpreted as local time (per FR-008). The `day.date` output field uses `Date.toISOString()` which produces a UTC string. This asymmetry is intentional and documented in the data model. AI assistants should note that the output date may display a different calendar date for timezones west of GMT.

## OmniJS Pattern

**NOTE**: Uses synchronous IIFE pattern. Timer.once is NOT used because `evaluateJavascript` returns synchronously (see research.md item 11).

```javascript
(function() {
  try {
    var win = document.windows[0];
    if (!win) {
      return JSON.stringify({ success: false, error: 'No OmniFocus window is open', code: 'NO_WINDOW' });
    }
    win.perspective = Perspective.BuiltIn.Forecast;
    // Synchronous perspective switch; forecastDayForDate() called immediately.
    var cal = Calendar.current;
    var targetDate = cal.startOfDay(new Date(dateStr));
    var fday = win.forecastDayForDate(targetDate);
    return JSON.stringify({
      success: true,
      day: {
        date: targetDate.toISOString(),
        name: fday.name,
        kind: kindToString(fday.kind),
        badgeCount: fday.badgeCount,
        badgeStatus: statusToString(fday.badgeKind()),
        deferredCount: fday.deferredCount
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e), code: 'PERSPECTIVE_SWITCH_FAILED' });
  }
})();
```
