import { z } from 'zod';
import { ForecastDayKindSchema, ForecastDayStatusSchema } from './forecast-enums.js';

/**
 * Shared output schema for a single forecast day's data.
 *
 * Reused identically by both `get_forecast_range` (as array element)
 * and `get_forecast_day` (as single object). The OmniJS
 * `forecastDayForDate(date)` API returns identical ForecastDay objects
 * regardless of query pattern.
 */
export const ForecastDayOutputSchema = z.object({
  date: z.string().describe('Calendar date queried (ISO 8601 UTC string from Date.toISOString())'),
  name: z.string().describe('Display name (e.g., "Monday", "Today", "Past")'),
  kind: ForecastDayKindSchema.describe(
    'Day classification (Day, Today, Past, FutureMonth, DistantFuture)'
  ),
  badgeCount: z.number().int().min(0).describe('Number of due items'),
  badgeStatus: ForecastDayStatusSchema.describe(
    'Badge status classification (Available, DueSoon, NoneAvailable, Overdue)'
  ),
  deferredCount: z.number().int().min(0).describe('Number of items becoming available')
});

export type ForecastDayOutput = z.infer<typeof ForecastDayOutputSchema>;
