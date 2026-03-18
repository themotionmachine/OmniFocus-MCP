import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/index.js';

/**
 * Input schema for get_next_task tool.
 *
 * Requires at least one of id or name. If both provided, id takes precedence.
 */
export const GetNextTaskInputSchema = z
  .object({
    id: z.string().optional().describe('Project ID (preferred)'),
    name: z.string().optional().describe('Project name (fallback)')
  })
  .refine(
    (data) =>
      (data.id !== undefined && data.id.length > 0) ||
      (data.name !== undefined && data.name.length > 0),
    { message: 'Either id or name must be provided' }
  );

export type GetNextTaskInput = z.infer<typeof GetNextTaskInputSchema>;

/**
 * Task details returned when a next task is found.
 * Subset of full task fields relevant for GTD next-action workflows.
 */
const TaskDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  flagged: z.boolean(),
  taskStatus: z.string(),
  dueDate: z.string().nullable(),
  deferDate: z.string().nullable(),
  tags: z.array(z.object({ id: z.string(), name: z.string() })),
  project: z.object({ id: z.string(), name: z.string() })
});

/**
 * Success response schema for get_next_task tool.
 *
 * Discriminated by hasNext:
 * - hasNext=true: full task details present
 * - hasNext=false: reason code + message explaining why no next task
 */
export const GetNextTaskSuccessSchema = z.discriminatedUnion('hasNext', [
  z.object({
    success: z.literal(true),
    hasNext: z.literal(true),
    task: TaskDetailsSchema
  }),
  z.object({
    success: z.literal(true),
    hasNext: z.literal(false),
    reason: z.enum(['NO_AVAILABLE_TASKS', 'SINGLE_ACTIONS_PROJECT']),
    message: z.string()
  })
]);

export type GetNextTaskSuccess = z.infer<typeof GetNextTaskSuccessSchema>;

/**
 * Error response schema for get_next_task tool.
 *
 * Can be a standard error or a disambiguation error when multiple
 * projects match a name-based lookup.
 */
export const GetNextTaskErrorSchema = z.union([
  z.object({ success: z.literal(false), error: z.string() }),
  DisambiguationErrorSchema
]);

export type GetNextTaskError = z.infer<typeof GetNextTaskErrorSchema>;

/**
 * Complete response schema for get_next_task tool.
 */
export const GetNextTaskResponseSchema = z.union([
  GetNextTaskSuccessSchema,
  GetNextTaskErrorSchema
]);

export type GetNextTaskResponse = z.infer<typeof GetNextTaskResponseSchema>;
