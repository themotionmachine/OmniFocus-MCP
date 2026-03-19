# Contract: get_forecast_range

**Tool Name**: `get_forecast_range`
**Category**: Read-only forecast query
**FR Coverage**: FR-001, FR-002, FR-003, FR-004, FR-008, FR-009, FR-011, FR-012

## Input Schema

```typescript
// src/contracts/forecast-tools/get-forecast-range.ts
import { z } from 'zod';
import { ForecastDayOutputSchema } from './shared/index.js';

export const GetForecastRangeInputSchema = z.object({
  startDate: z
    .string()
    .optional()
    .describe(
      'Start date in ISO 8601 format (YYYY-MM-DD). Default: today. Interpreted as local time.'
    ),
  endDate: z
    .string()
    .optional()
    .describe(
      'End date in ISO 8601 format (YYYY-MM-DD). Default: startDate + 7 days. Interpreted as local time.'
    )
});

export type GetForecastRangeInput = z.infer<typeof GetForecastRangeInputSchema>;
```

## Output Schema (Success)

```typescript
export const GetForecastRangeSuccessSchema = z.object({
  success: z.literal(true),
  days: z
    .array(ForecastDayOutputSchema)
    .describe('Forecast days in chronological order'),
  totalDays: z
    .number()
    .int()
    .min(0)
    .describe('Total number of days in the range'),
  startDate: z
    .string()
    .describe('Effective start date used (ISO 8601)'),
  endDate: z
    .string()
    .describe('Effective end date used (ISO 8601)')
});

export type GetForecastRangeSuccess = z.infer<typeof GetForecastRangeSuccessSchema>;
```

## Output Schema (Error)

```typescript
export const GetForecastRangeErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z
    .string()
    .optional()
    .describe(
      'Error code: INVALID_DATE, INVALID_RANGE, RANGE_TOO_LARGE, NO_WINDOW, PERSPECTIVE_SWITCH_FAILED'
    )
});

export type GetForecastRangeError = z.infer<typeof GetForecastRangeErrorSchema>;
```

## Response (Discriminated Union)

```typescript
export const GetForecastRangeResponseSchema = z.discriminatedUnion('success', [
  GetForecastRangeSuccessSchema,
  GetForecastRangeErrorSchema
]);

export type GetForecastRangeResponse = z.infer<typeof GetForecastRangeResponseSchema>;
```

## Error Code Rationale

The concept of "invalid date range" is decomposed into distinct error codes following the established codebase convention of one code per distinct validation condition (see `src/contracts/status-tools/shared/batch.ts` for precedent):

| Error Code | Condition | Validation Layer |
|------------|-----------|-----------------|
| INVALID_DATE | A date string does not parse as a valid ISO 8601 date | Primitive (semantic) |
| INVALID_RANGE | `startDate` is after `endDate` (illogical range) | Primitive (semantic) |
| RANGE_TOO_LARGE | Range exceeds 90-day maximum limit | Primitive (semantic) |
| NO_WINDOW | No OmniFocus window is open (`document.windows[0]` is falsy) | OmniJS (runtime) |
| PERSPECTIVE_SWITCH_FAILED | Forecast perspective switch failed or `forecastDayForDate()` threw despite switch; includes underlying OmniJS exception text | OmniJS (runtime) |

The informal term "INVALID_DATE_RANGE" maps to two distinct codes: INVALID_RANGE (logical constraint) and RANGE_TOO_LARGE (size constraint). This separation gives AI assistants actionable guidance -- an INVALID_RANGE means "swap start/end dates" while RANGE_TOO_LARGE means "narrow the range."

## Validation Rules

1. If `startDate` provided, must parse as valid date
2. If `endDate` provided, must parse as valid date
3. If both provided, `startDate` must be <= `endDate`
4. Range must not exceed 90 days
5. Default `startDate` = today when omitted
6. Default `endDate` = startDate + 7 days when omitted

## Date Format Asymmetry

Date inputs use `YYYY-MM-DD` format interpreted as local time (per FR-008). Date outputs in the `days` array and the `startDate`/`endDate` echo fields use `Date.toISOString()` which produces UTC strings. This asymmetry is intentional and documented in the data model. AI assistants should note that output dates may display a different calendar date for timezones west of GMT.

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
    // If perspective not yet effective, catch block returns PERSPECTIVE_SWITCH_FAILED.
    var cal = Calendar.current;
    var start = cal.startOfDay(new Date(startDateStr));
    var end = cal.startOfDay(new Date(endDateStr));
    var dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    var days = [];
    var dc = new DateComponents();
    for (var i = 0; i < dayCount; i++) {
      dc.day = i;
      var date = cal.dateByAddingDateComponents(start, dc);
      var fday = win.forecastDayForDate(date);
      days.push({
        date: date.toISOString(),
        name: fday.name,
        kind: kindToString(fday.kind),
        badgeCount: fday.badgeCount,
        badgeStatus: statusToString(fday.badgeKind()),
        deferredCount: fday.deferredCount
      });
    }
    return JSON.stringify({
      success: true,
      days: days,
      totalDays: days.length,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e), code: 'PERSPECTIVE_SWITCH_FAILED' });
  }
})();
```
