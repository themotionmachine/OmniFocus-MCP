import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/index.js';

/**
 * Input schema for set_floating_timezone tool.
 *
 * Enables or disables floating timezone on a single task or project.
 * When floating timezone is enabled, dates follow the device timezone
 * when traveling instead of being fixed to a specific timezone.
 *
 * Supports identification by ID (preferred) or name (requires disambiguation).
 * At least one of `id` or `name` must be a non-empty string.
 */
export const SetFloatingTimezoneInputSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe('Item ID (preferred — direct lookup, tries task then project)'),
    name: z.string().optional().describe('Item name (fallback — may require disambiguation)'),
    enabled: z.boolean().describe('Enable (true) or disable (false) floating timezone')
  })
  .refine((data) => (data.id && data.id.length > 0) || (data.name && data.name.length > 0), {
    message: 'Either id or name must be provided'
  });

export type SetFloatingTimezoneInput = z.infer<typeof SetFloatingTimezoneInputSchema>;

/**
 * Success response schema for set_floating_timezone tool.
 *
 * Returns item details including itemType to indicate whether
 * the matched item was a task or project.
 */
export const SetFloatingTimezoneSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Resolved item ID'),
  name: z.string().describe('Item name'),
  itemType: z.enum(['task', 'project']).describe("Whether the item is a 'task' or 'project'"),
  floatingTimezone: z
    .boolean()
    .describe('The new floating timezone setting (reflects the value set)')
});

export type SetFloatingTimezoneSuccess = z.infer<typeof SetFloatingTimezoneSuccessSchema>;

/**
 * Standard error response schema for set_floating_timezone tool.
 *
 * Standard error messages include:
 * - "Item '{id}' not found"
 * - "Item '{name}' not found"
 * - OmniFocus unreachable errors
 */
export const SetFloatingTimezoneStandardErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

/**
 * Error response schema for set_floating_timezone tool.
 *
 * Can be a standard error or a disambiguation error (when name matches multiple items).
 */
export const SetFloatingTimezoneErrorSchema = z.union([
  DisambiguationErrorSchema,
  SetFloatingTimezoneStandardErrorSchema
]);

export type SetFloatingTimezoneError = z.infer<typeof SetFloatingTimezoneErrorSchema>;

/**
 * Complete response schema for set_floating_timezone tool.
 *
 * Can return success, disambiguation error, or standard error.
 * Disambiguation is checked before standard error because it is stricter.
 */
export const SetFloatingTimezoneResponseSchema = z.union([
  SetFloatingTimezoneSuccessSchema,
  DisambiguationErrorSchema,
  SetFloatingTimezoneStandardErrorSchema
]);

export type SetFloatingTimezoneResponse = z.infer<typeof SetFloatingTimezoneResponseSchema>;
