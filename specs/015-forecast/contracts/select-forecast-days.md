# Contract: select_forecast_days

**Tool Name**: `select_forecast_days`
**Category**: UI navigation (side effect: changes visible Forecast perspective)
**FR Coverage**: FR-006, FR-007, FR-008, FR-009, FR-010

## Input Schema

```typescript
// src/contracts/forecast-tools/select-forecast-days.ts
import { z } from 'zod';

export const SelectForecastDaysInputSchema = z.object({
  dates: z
    .array(z.string())
    .min(1, 'At least one date is required')
    .max(90, 'Maximum 90 dates allowed')
    .describe(
      'Array of dates in ISO 8601 format (YYYY-MM-DD) to navigate to. Interpreted as local time.'
    )
});

export type SelectForecastDaysInput = z.infer<typeof SelectForecastDaysInputSchema>;
```

## Output Schema (Success)

```typescript
export const SelectForecastDaysSuccessSchema = z.object({
  success: z.literal(true),
  selectedDates: z
    .array(z.string())
    .describe('Dates that were selected in the Forecast perspective (ISO 8601)'),
  selectedCount: z
    .number()
    .int()
    .min(1)
    .describe('Number of dates selected'),
  warning: z
    .string()
    .describe(
      'UI state change warning. Always present. Informs AI assistant that the visible OmniFocus Forecast perspective was changed.'
    )
});

export type SelectForecastDaysSuccess = z.infer<typeof SelectForecastDaysSuccessSchema>;
```

## Output Schema (Error)

```typescript
export const SelectForecastDaysErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z
    .string()
    .optional()
    .describe(
      'Error code: INVALID_DATE, NO_WINDOW, PERSPECTIVE_SWITCH_FAILED, EMPTY_DATES'
    )
});

export type SelectForecastDaysError = z.infer<typeof SelectForecastDaysErrorSchema>;
```

## Response (Discriminated Union)

```typescript
export const SelectForecastDaysResponseSchema = z.discriminatedUnion('success', [
  SelectForecastDaysSuccessSchema,
  SelectForecastDaysErrorSchema
]);

export type SelectForecastDaysResponse = z.infer<typeof SelectForecastDaysResponseSchema>;
```

## Validation Rules

1. `dates` array must have at least 1 element (FR-010)
2. `dates` array must have at most 90 elements
3. Each date string must parse as a valid date
4. Invalid dates produce validation errors without altering UI state

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
    // Synchronous perspective switch; forecastDayForDate()/selectForecastDays() called immediately.
    var fdays = [];
    var selectedDates = [];
    dateStrings.forEach(function(dateStr) {
      var d = new Date(dateStr);
      var fday = win.forecastDayForDate(d);
      fdays.push(fday);
      selectedDates.push(d.toISOString());
    });
    win.selectForecastDays(fdays);
    return JSON.stringify({
      success: true,
      selectedDates: selectedDates,
      selectedCount: fdays.length,
      warning: 'This operation changed the visible Forecast perspective in OmniFocus to show the selected dates. The user may notice the view has changed.'
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e), code: 'PERSPECTIVE_SWITCH_FAILED' });
  }
})();
```

## UI State Warning (FR-007)

The `warning` field is **always present** in success responses. Fixed text:

> "This operation changed the visible Forecast perspective in OmniFocus to show the selected dates. The user may notice the view has changed."

This satisfies FR-007's requirement that AI assistants are explicitly informed about the UI side effect.
