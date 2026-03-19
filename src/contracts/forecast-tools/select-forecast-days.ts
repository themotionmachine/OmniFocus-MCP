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

export const SelectForecastDaysSuccessSchema = z.object({
  success: z.literal(true),
  selectedDates: z
    .array(z.string())
    .describe('Dates that were selected in the Forecast perspective (ISO 8601)'),
  selectedCount: z.number().int().min(1).describe('Number of dates selected'),
  warning: z
    .string()
    .describe(
      'UI state change warning. Always present. Informs AI assistant that the visible OmniFocus Forecast perspective was changed.'
    )
});

export type SelectForecastDaysSuccess = z.infer<typeof SelectForecastDaysSuccessSchema>;

export const SelectForecastDaysErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Error code: INVALID_DATE, NO_WINDOW, EMPTY_DATES')
});

export type SelectForecastDaysError = z.infer<typeof SelectForecastDaysErrorSchema>;

export const SelectForecastDaysResponseSchema = z.discriminatedUnion('success', [
  SelectForecastDaysSuccessSchema,
  SelectForecastDaysErrorSchema
]);

export type SelectForecastDaysResponse = z.infer<typeof SelectForecastDaysResponseSchema>;
