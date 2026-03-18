import { z } from 'zod';
import { DisambiguationErrorSchema } from '../task-tools/shared/disambiguation.js';
import { NotificationOutputSchema } from './shared/notification.js';

/**
 * Absolute notification input.
 *
 * Fires at a specific date/time given as an ISO 8601 string.
 * At least one of taskId or taskName is required.
 */
const AbsoluteInputSchema = z
  .object({
    type: z.literal('absolute'),
    taskId: z.string().min(1).optional().describe('Task ID (takes precedence over taskName)'),
    taskName: z.string().min(1).optional().describe('Task name (used if no taskId provided)'),
    dateTime: z.string().min(1).describe('ISO 8601 datetime for the absolute notification')
  })
  .refine((d) => d.taskId !== undefined || d.taskName !== undefined, {
    message: 'At least one of taskId or taskName is required'
  });

/**
 * Relative notification input.
 *
 * Fires relative to the task's effectiveDueDate.
 * offsetSeconds must be a finite number (negative = before due date).
 * At least one of taskId or taskName is required.
 */
const RelativeInputSchema = z
  .object({
    type: z.literal('relative'),
    taskId: z.string().min(1).optional().describe('Task ID (takes precedence over taskName)'),
    taskName: z.string().min(1).optional().describe('Task name (used if no taskId provided)'),
    offsetSeconds: z
      .number()
      .finite()
      .describe('Offset in seconds from due date (negative = before due)')
  })
  .refine((d) => d.taskId !== undefined || d.taskName !== undefined, {
    message: 'At least one of taskId or taskName is required'
  });

/**
 * Input schema for the add_notification tool.
 *
 * Discriminated union on `type`:
 * - "absolute": requires dateTime (ISO 8601 string)
 * - "relative": requires offsetSeconds (finite number)
 *
 * NOTE: z.union is used instead of z.discriminatedUnion because Zod 4
 * does not support discriminatedUnion when member schemas have .refine().
 */
export const AddNotificationInputSchema = z.union([AbsoluteInputSchema, RelativeInputSchema]);

export type AddNotificationInput = z.infer<typeof AddNotificationInputSchema>;

/**
 * Success response schema for add_notification.
 *
 * Returns the task identifiers and the newly created notification details.
 */
export const AddNotificationSuccessSchema = z.object({
  success: z.literal(true),
  taskId: z.string().describe('Task ID'),
  taskName: z.string().describe('Task name'),
  notification: NotificationOutputSchema.describe('The newly added notification')
});

export type AddNotificationSuccess = z.infer<typeof AddNotificationSuccessSchema>;

/**
 * Standard error response schema for add_notification.
 */
export const AddNotificationErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type AddNotificationError = z.infer<typeof AddNotificationErrorSchema>;

/**
 * Complete response schema for add_notification.
 *
 * Can return success, disambiguation error, or standard error.
 */
export const AddNotificationResponseSchema = z.union([
  AddNotificationSuccessSchema,
  DisambiguationErrorSchema,
  AddNotificationErrorSchema
]);

export type AddNotificationResponse = z.infer<typeof AddNotificationResponseSchema>;
