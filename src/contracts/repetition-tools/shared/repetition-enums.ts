import { z } from 'zod';

/**
 * Repetition schedule type enumeration (v4.7+).
 *
 * Maps 1:1 with `Task.RepetitionScheduleType.*` constants:
 * - Task.RepetitionScheduleType.Regularly ↔ 'Regularly'
 * - Task.RepetitionScheduleType.FromCompletion ↔ 'FromCompletion'
 * - Task.RepetitionScheduleType.None ↔ 'None'
 */
export const ScheduleTypeSchema = z.enum(['Regularly', 'FromCompletion', 'None']);

export type ScheduleType = z.infer<typeof ScheduleTypeSchema>;

/**
 * Anchor date key enumeration (v4.7+).
 *
 * Maps 1:1 with `Task.AnchorDateKey.*` constants:
 * - Task.AnchorDateKey.DueDate ↔ 'DueDate'
 * - Task.AnchorDateKey.DeferDate ↔ 'DeferDate'
 * - Task.AnchorDateKey.PlannedDate ↔ 'PlannedDate'
 */
export const AnchorDateKeySchema = z.enum(['DueDate', 'DeferDate', 'PlannedDate']);

export type AnchorDateKey = z.infer<typeof AnchorDateKeySchema>;

/**
 * Deprecated repetition method enumeration.
 *
 * Maps to `Task.RepetitionMethod.*` constants. Replaced by
 * ScheduleType + AnchorDateKey in v4.7+. Included for backward
 * compatibility in get_repetition responses.
 */
export const RepetitionMethodSchema = z.enum(['DueDate', 'Fixed', 'DeferUntilDate', 'None']);

export type RepetitionMethod = z.infer<typeof RepetitionMethodSchema>;

/**
 * Named preset for common recurrence patterns.
 *
 * Each preset maps to an ICS RRULE string generated server-side
 * in TypeScript (not in OmniJS).
 */
export const PresetNameSchema = z.enum([
  'daily',
  'weekdays',
  'weekly',
  'biweekly',
  'monthly',
  'monthly_last_day',
  'quarterly',
  'yearly'
]);

export type PresetName = z.infer<typeof PresetNameSchema>;

/**
 * Day abbreviation for weekly/biweekly presets.
 *
 * Standard RFC 5545 day abbreviations used in BYDAY component.
 */
export const DayAbbreviationSchema = z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

export type DayAbbreviation = z.infer<typeof DayAbbreviationSchema>;
