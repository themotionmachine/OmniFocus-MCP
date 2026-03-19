# Contract: get_forecast_range

**Tool Name**: `get_forecast_range`
**Category**: Read-only forecast query
**FR Coverage**: FR-001, FR-002, FR-003, FR-004, FR-008, FR-009, FR-011, FR-012

## Input Schema

```typescript
// src/contracts/forecast-tools/get-forecast-range.ts
import { z } from 'zod';

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
```

## Response (Discriminated Union)

```typescript
export const GetForecastRangeResponseSchema = z.discriminatedUnion('success', [
  GetForecastRangeSuccessSchema,
  GetForecastRangeErrorSchema
]);
```

## Validation Rules

1. If `startDate` provided, must parse as valid date
2. If `endDate` provided, must parse as valid date
3. If both provided, `startDate` must be <= `endDate`
4. Range must not exceed 90 days
5. Default `startDate` = today when omitted
6. Default `endDate` = startDate + 7 days when omitted

## OmniJS Pattern

```javascript
(function() {
  try {
    var win = document.windows[0];
    if (!win) {
      return JSON.stringify({ success: false, error: 'No OmniFocus window is open', code: 'NO_WINDOW' });
    }
    win.perspective = Perspective.BuiltIn.Forecast;
    Timer.once(1, function() {
      try {
        var cal = Calendar.current;
        var start = cal.startOfDay(new Date(startDateStr));
        var end = cal.startOfDay(new Date(endDateStr));
        var days = [];
        var dc = new DateComponents();
        for (var i = 0; i <= dayCount; i++) {
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
        return JSON.stringify({ success: false, error: e.message || String(e) });
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```
