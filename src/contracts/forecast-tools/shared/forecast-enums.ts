import { z } from 'zod';

/**
 * Forecast day kind classification.
 *
 * Maps 1:1 with `ForecastDay.Kind.*` OmniJS enum constants:
 * - ForecastDay.Kind.Day -> 'Day'
 * - ForecastDay.Kind.Today -> 'Today'
 * - ForecastDay.Kind.Past -> 'Past'
 * - ForecastDay.Kind.FutureMonth -> 'FutureMonth'
 * - ForecastDay.Kind.DistantFuture -> 'DistantFuture'
 */
export const ForecastDayKindSchema = z.enum([
  'Day',
  'Today',
  'Past',
  'FutureMonth',
  'DistantFuture'
]);

export type ForecastDayKind = z.infer<typeof ForecastDayKindSchema>;

/**
 * Forecast day badge status classification.
 *
 * Maps 1:1 with `ForecastDay.Status.*` OmniJS enum constants,
 * accessed via `forecastDay.badgeKind()` (function call):
 * - ForecastDay.Status.Available -> 'Available'
 * - ForecastDay.Status.DueSoon -> 'DueSoon'
 * - ForecastDay.Status.NoneAvailable -> 'NoneAvailable'
 * - ForecastDay.Status.Overdue -> 'Overdue'
 */
export const ForecastDayStatusSchema = z.enum(['Available', 'DueSoon', 'NoneAvailable', 'Overdue']);

export type ForecastDayStatus = z.infer<typeof ForecastDayStatusSchema>;
