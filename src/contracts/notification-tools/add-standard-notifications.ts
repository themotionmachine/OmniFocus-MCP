import { z } from 'zod';
import { DisambiguationErrorSchema } from '../task-tools/shared/disambiguation.js';
import { NotificationOutputSchema } from './shared/notification.js';

/**
 * Input schema for the add_standard_notifications tool.
 *
 * Accepts a preset name that maps to one or more relative notification offsets.
 * At least one of taskId or taskName is required; taskId takes precedence.
 *
 * Presets and their offsets:
 * - day_before    → -86400 seconds (1 day before due)
 * - hour_before   → -3600 seconds  (1 hour before due)
 * - 15_minutes    → -900 seconds   (15 minutes before due)
 * - week_before   → -604800 seconds (1 week before due)
 * - standard      → -86400 and -3600 (day + hour before due)
 */
export const AddStandardNotificationsInputSchema = z
  .object({
    taskId: z.string().min(1).optional().describe('Task ID (takes precedence over taskName)'),
    taskName: z.string().min(1).optional().describe('Task name (used if no taskId provided)'),
    preset: z
      .enum(['day_before', 'hour_before', '15_minutes', 'week_before', 'standard'])
      .describe('Preset notification pattern to apply')
  })
  .refine((d) => d.taskId !== undefined || d.taskName !== undefined, {
    message: 'At least one of taskId or taskName is required'
  });

export type AddStandardNotificationsInput = z.infer<typeof AddStandardNotificationsInputSchema>;

/**
 * Success response schema for add_standard_notifications.
 *
 * Returns the task identifiers, the count of added notifications, and
 * the newly created notification details (only the added ones).
 */
export const AddStandardNotificationsSuccessSchema = z.object({
  success: z.literal(true),
  taskId: z.string().describe('Task ID'),
  taskName: z.string().describe('Task name'),
  addedCount: z.number().int().min(0).describe('Number of notifications added'),
  notifications: z.array(NotificationOutputSchema).describe('The newly added notifications')
});

export type AddStandardNotificationsSuccess = z.infer<typeof AddStandardNotificationsSuccessSchema>;

/**
 * Standard error response schema for add_standard_notifications.
 */
export const AddStandardNotificationsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type AddStandardNotificationsError = z.infer<typeof AddStandardNotificationsErrorSchema>;

/**
 * Complete response schema for add_standard_notifications.
 *
 * Can return success, disambiguation error, or standard error.
 */
export const AddStandardNotificationsResponseSchema = z.union([
  AddStandardNotificationsSuccessSchema,
  DisambiguationErrorSchema,
  AddStandardNotificationsErrorSchema
]);

export type AddStandardNotificationsResponse = z.infer<
  typeof AddStandardNotificationsResponseSchema
>;
