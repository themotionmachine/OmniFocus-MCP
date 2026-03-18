import { z } from 'zod';
import { DisambiguationErrorSchema } from '../task-tools/shared/disambiguation.js';
import { NotificationOutputSchema } from './shared/notification.js';

/**
 * Input schema for snooze_notification tool.
 *
 * Requires at least one of taskId or taskName to identify the task.
 * taskId takes precedence when both are provided.
 * index is the 0-based position in task.notifications.
 * snoozeUntil is an ISO 8601 datetime string for the new fire date.
 */
export const SnoozeNotificationInputSchema = z
  .object({
    taskId: z.string().min(1).optional().describe('Task ID (takes precedence over taskName)'),
    taskName: z.string().min(1).optional().describe('Task name (used if no taskId provided)'),
    index: z
      .number()
      .int()
      .min(0)
      .describe('0-based index of the notification to snooze in task.notifications array'),
    snoozeUntil: z.string().describe('ISO 8601 datetime to snooze the notification until')
  })
  .refine((d) => d.taskId !== undefined || d.taskName !== undefined, {
    message: 'At least one of taskId or taskName is required'
  });

export type SnoozeNotificationInput = z.infer<typeof SnoozeNotificationInputSchema>;

/**
 * Success response schema for snooze_notification tool.
 *
 * Returns the updated notification (always Absolute kind after snooze)
 * plus task identifiers for confirmation.
 */
export const SnoozeNotificationSuccessSchema = z.object({
  success: z.literal(true),
  taskId: z.string().describe('Task ID'),
  taskName: z.string().describe('Task name'),
  notification: NotificationOutputSchema.describe('The updated notification after snoozing')
});

export type SnoozeNotificationSuccess = z.infer<typeof SnoozeNotificationSuccessSchema>;

/**
 * Standard error response schema for snooze_notification tool.
 */
export const SnoozeNotificationErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type SnoozeNotificationError = z.infer<typeof SnoozeNotificationErrorSchema>;

/**
 * Complete response schema for snooze_notification tool.
 *
 * Can return success, disambiguation error, or standard error.
 */
export const SnoozeNotificationResponseSchema = z.union([
  SnoozeNotificationSuccessSchema,
  DisambiguationErrorSchema,
  SnoozeNotificationErrorSchema
]);

export type SnoozeNotificationResponse = z.infer<typeof SnoozeNotificationResponseSchema>;
