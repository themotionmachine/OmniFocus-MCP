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

export const GetForecastRangeSuccessSchema = z.object({
  success: z.literal(true),
  days: z.array(ForecastDayOutputSchema).describe('Forecast days in chronological order'),
  totalDays: z.number().int().min(0).describe('Total number of days in the range'),
  startDate: z.string().describe('Effective start date used (ISO 8601)'),
  endDate: z.string().describe('Effective end date used (ISO 8601)')
});

export type GetForecastRangeSuccess = z.infer<typeof GetForecastRangeSuccessSchema>;

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

export const GetForecastRangeResponseSchema = z.discriminatedUnion('success', [
  GetForecastRangeSuccessSchema,
  GetForecastRangeErrorSchema
]);

export type GetForecastRangeResponse = z.infer<typeof GetForecastRangeResponseSchema>;
