import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';

/**
 * Input schema for set_planned_date tool.
 *
 * Requires at least one of id or name. If both provided, id takes precedence.
 * Planned date is ISO 8601 string or null to clear.
 */
export const SetPlannedDateInputSchema = z
  .object({
    id: z.string().optional().describe('Task ID (takes precedence over name)'),
    name: z.string().optional().describe('Task name (used if no ID provided)'),
    plannedDate: z.string().nullable().describe('Planned date (ISO 8601) or null to clear')
  })
  .refine((data) => data.id !== undefined || data.name !== undefined, {
    message: 'At least one of id or name is required'
  });

export type SetPlannedDateInput = z.infer<typeof SetPlannedDateInputSchema>;

/**
 * Success response schema for set_planned_date tool.
 */
export const SetPlannedDateSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Task ID'),
  name: z.string().describe('Task name')
});

export type SetPlannedDateSuccess = z.infer<typeof SetPlannedDateSuccessSchema>;

/**
 * Standard error response schema for set_planned_date tool.
 *
 * Possible error messages include:
 * - "Task '{id}' not found"
 * - "Planned date requires OmniFocus v4.7 or later" (version < 4.7)
 * - "Planned date requires database migration. Please open OmniFocus preferences to migrate." (v4.7+ unmigrated)
 */
export const SetPlannedDateErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SetPlannedDateError = z.infer<typeof SetPlannedDateErrorSchema>;

/**
 * Complete response schema for set_planned_date tool.
 *
 * Can return success, standard error, or disambiguation error.
 */
export const SetPlannedDateResponseSchema = z.union([
  SetPlannedDateSuccessSchema,
  DisambiguationErrorSchema,
  SetPlannedDateErrorSchema
]);

export type SetPlannedDateResponse = z.infer<typeof SetPlannedDateResponseSchema>;
