import { z } from 'zod';
import { DisambiguationErrorSchema } from '../task-tools/shared/disambiguation.js';

/**
 * Input schema for remove_notification tool.
 *
 * Requires a task identifier (taskId or taskName) and a 0-based index
 * indicating which notification to remove from the task's notifications array.
 *
 * taskId takes precedence over taskName when both are provided.
 */
export const RemoveNotificationInputSchema = z
  .object({
    taskId: z.string().min(1).optional().describe('Task ID (takes precedence over taskName)'),
    taskName: z.string().min(1).optional().describe('Task name (disambiguation if ambiguous)'),
    index: z
      .number()
      .int()
      .min(0)
      .describe('0-based index of the notification to remove from task.notifications array')
  })
  .refine((d) => d.taskId !== undefined || d.taskName !== undefined, {
    message: 'At least one of taskId or taskName is required'
  });

export type RemoveNotificationInput = z.infer<typeof RemoveNotificationInputSchema>;

/**
 * Success response schema for remove_notification tool.
 *
 * Returns the task identifiers, the index that was removed, and how many
 * notifications remain after the removal.
 */
export const RemoveNotificationSuccessSchema = z.object({
  success: z.literal(true),
  taskId: z.string().describe('Task ID'),
  taskName: z.string().describe('Task name'),
  removedIndex: z.number().int().min(0).describe('Index of the notification that was removed'),
  remainingCount: z
    .number()
    .int()
    .min(0)
    .describe('Number of notifications remaining after removal')
});

export type RemoveNotificationSuccess = z.infer<typeof RemoveNotificationSuccessSchema>;

/**
 * Standard error response schema for remove_notification tool.
 */
export const RemoveNotificationErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type RemoveNotificationError = z.infer<typeof RemoveNotificationErrorSchema>;

/**
 * Complete response schema for remove_notification tool.
 *
 * Can return success, disambiguation error, or standard error.
 */
export const RemoveNotificationResponseSchema = z.union([
  RemoveNotificationSuccessSchema,
  DisambiguationErrorSchema,
  RemoveNotificationErrorSchema
]);

export type RemoveNotificationResponse = z.infer<typeof RemoveNotificationResponseSchema>;
