import { z } from 'zod';
import { ForecastDayOutputSchema } from './shared/index.js';

export const GetForecastDayInputSchema = z.object({
  date: z
    .string()
    .optional()
    .describe('Date in ISO 8601 format (YYYY-MM-DD). Default: today. Interpreted as local time.')
});

export type GetForecastDayInput = z.infer<typeof GetForecastDayInputSchema>;

export const GetForecastDaySuccessSchema = z.object({
  success: z.literal(true),
  day: ForecastDayOutputSchema.describe('Forecast data for the requested date'),
  warning: z
    .string()
    .optional()
    .describe(
      'UI state change notice. Present when the Forecast perspective was auto-activated to fulfill this query.'
    )
});

export type GetForecastDaySuccess = z.infer<typeof GetForecastDaySuccessSchema>;

export const GetForecastDayErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Error code: INVALID_DATE, NO_WINDOW')
});

export type GetForecastDayError = z.infer<typeof GetForecastDayErrorSchema>;

export const GetForecastDayResponseSchema = z.discriminatedUnion('success', [
  GetForecastDaySuccessSchema,
  GetForecastDayErrorSchema
]);

export type GetForecastDayResponse = z.infer<typeof GetForecastDayResponseSchema>;
