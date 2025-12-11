import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';
import { TaskFullSchema } from './shared/task.js';

/**
 * Input schema for get_task tool.
 *
 * Requires at least one of id or name. If both provided, id takes precedence.
 */
export const GetTaskInputSchema = z
  .object({
    id: z.string().optional().describe('Task ID (takes precedence over name)'),
    name: z.string().optional().describe('Task name (used if no ID provided)')
  })
  .refine((data) => data.id !== undefined || data.name !== undefined, {
    message: 'At least one of id or name is required'
  });

export type GetTaskInput = z.infer<typeof GetTaskInputSchema>;

/**
 * Success response schema for get_task tool.
 */
export const GetTaskSuccessSchema = z.object({
  success: z.literal(true),
  task: TaskFullSchema
});

export type GetTaskSuccess = z.infer<typeof GetTaskSuccessSchema>;

/**
 * Standard error response schema for get_task tool.
 */
export const GetTaskErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type GetTaskError = z.infer<typeof GetTaskErrorSchema>;

/**
 * Complete response schema for get_task tool.
 *
 * Can return success, standard error, or disambiguation error.
 */
export const GetTaskResponseSchema = z.union([
  GetTaskSuccessSchema,
  DisambiguationErrorSchema,
  GetTaskErrorSchema
]);

export type GetTaskResponse = z.infer<typeof GetTaskResponseSchema>;
