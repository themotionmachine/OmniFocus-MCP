import { z } from 'zod';

/**
 * Task identifier schema for notification tools.
 * Accepts taskId (direct lookup) or taskName (search with disambiguation).
 * At least one must be provided; taskId takes precedence when both given.
 *
 * Follows the pattern established by delete-project.ts and delete-tag.ts:
 * uses .min(1) to reject empty strings.
 */
export const TaskIdentifierSchema = z
  .object({
    taskId: z.string().min(1).optional().describe('Task ID (takes precedence)'),
    taskName: z.string().min(1).optional().describe('Task name (disambiguation if ambiguous)')
  })
  .refine((d) => d.taskId !== undefined || d.taskName !== undefined, {
    message: 'At least one of taskId or taskName is required'
  });

export type TaskIdentifier = z.infer<typeof TaskIdentifierSchema>;
