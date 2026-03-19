import { z } from 'zod';

/**
 * Position schema for task operations (move_tasks, duplicate_tasks).
 *
 * Task positions can target:
 * - A project (by ID or name)
 * - A parent task (by ID or name, for subtask placement)
 * - The inbox
 *
 * Placement controls where within the target:
 * - beginning/ending: At start/end of target
 * - before/after: Relative to a sibling task (requires relativeTo)
 *
 * OmniJS Mapping:
 * | Target + Placement                  | OmniJS Expression                    |
 * |--------------------------------------|--------------------------------------|
 * | project + ending                     | project.ending                       |
 * | project + beginning                  | project.beginning                    |
 * | task + ending                        | task.ending                          |
 * | inbox + ending                       | inbox.ending                         |
 * | before sibling                       | siblingTask.before                   |
 * | after sibling                        | siblingTask.after                    |
 */
export const TaskPositionSchema = z
  .object({
    // Target: exactly one must be specified
    projectId: z.string().min(1).optional().describe('Target project ID'),
    projectName: z.string().min(1).optional().describe('Target project name'),
    taskId: z.string().min(1).optional().describe('Target parent task ID (for subtask placement)'),
    taskName: z
      .string()
      .min(1)
      .optional()
      .describe('Target parent task name (for subtask placement)'),
    inbox: z.literal(true).optional().describe('Target the inbox'),

    // Placement within target
    placement: z
      .enum(['beginning', 'ending', 'before', 'after'])
      .default('ending')
      .describe("Position within target: 'beginning', 'ending' (default), 'before', 'after'"),
    relativeTo: z
      .string()
      .optional()
      .describe(
        'Sibling task ID for before/after placement. Required when placement is before or after.'
      )
  })
  .refine(
    (data) => {
      // Exactly one target must be specified
      const targets = [
        Boolean(data.projectId),
        Boolean(data.projectName),
        Boolean(data.taskId),
        Boolean(data.taskName),
        data.inbox === true
      ].filter(Boolean).length;
      return targets === 1;
    },
    {
      message:
        'Exactly one target must be specified: projectId, projectName, taskId, taskName, or inbox'
    }
  )
  .refine(
    (data) => {
      // For before/after, relativeTo is required
      if (data.placement === 'before' || data.placement === 'after') {
        return data.relativeTo !== undefined && data.relativeTo.length > 0;
      }
      return true;
    },
    {
      message: "relativeTo is required when placement is 'before' or 'after'",
      path: ['relativeTo']
    }
  );

export type TaskPosition = z.infer<typeof TaskPositionSchema>;
