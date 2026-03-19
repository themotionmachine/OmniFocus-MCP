# Contract: get_forecast_day

**Tool Name**: `get_forecast_day`
**Category**: Read-only forecast query
**FR Coverage**: FR-002, FR-003, FR-004, FR-005, FR-008, FR-009

## Input Schema

```typescript
// src/contracts/forecast-tools/get-forecast-day.ts
import { z } from 'zod';

export const GetForecastDayInputSchema = z.object({
  date: z
    .string()
    .optional()
    .describe(
      'Date in ISO 8601 format (YYYY-MM-DD). Default: today. Interpreted as local time.'
    )
});
```

## Output Schema (Success)

```typescript
export const GetForecastDaySuccessSchema = z.object({
  success: z.literal(true),
  day: ForecastDayOutputSchema.describe('Forecast data for the requested date')
});
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
```

## Response (Discriminated Union)

```typescript
export const GetForecastDayResponseSchema = z.discriminatedUnion('success', [
  GetForecastDaySuccessSchema,
  GetForecastDayErrorSchema
]);
```

## Validation Rules

1. If `date` provided, must parse as valid date
2. Default `date` = today when omitted

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
        return JSON.stringify({ success: false, error: e.message || String(e) });
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```
