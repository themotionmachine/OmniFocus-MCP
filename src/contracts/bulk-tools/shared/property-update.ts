import { z } from 'zod';

/**
 * Properties to apply uniformly to all tasks in a batch_update_tasks operation.
 *
 * At least one property must be specified (FR-013).
 * Tag removals processed before additions (FR-014).
 * plannedDate/clearPlannedDate require OmniFocus v4.7+ (version-gated at runtime).
 *
 * Mutual Exclusions (enforced by refine):
 * - dueDate vs clearDueDate
 * - deferDate vs clearDeferDate
 * - estimatedMinutes vs clearEstimatedMinutes
 * - plannedDate vs clearPlannedDate
 */
export const PropertyUpdateSetSchema = z
  .object({
    flagged: z.boolean().optional().describe('Set flagged status'),
    dueDate: z.string().optional().describe('Set due date (ISO 8601)'),
    clearDueDate: z.boolean().optional().describe('Clear due date'),
    deferDate: z.string().optional().describe('Set defer date (ISO 8601)'),
    clearDeferDate: z.boolean().optional().describe('Clear defer date'),
    estimatedMinutes: z.number().min(0).optional().describe('Set estimated minutes'),
    clearEstimatedMinutes: z.boolean().optional().describe('Clear estimated minutes'),
    plannedDate: z
      .string()
      .optional()
      .describe('Set planned date (ISO 8601, requires OmniFocus v4.7+)'),
    clearPlannedDate: z
      .boolean()
      .optional()
      .describe('Clear planned date (requires OmniFocus v4.7+)'),
    addTags: z
      .array(z.string())
      .min(1, 'addTags array cannot be empty when provided')
      .optional()
      .describe('Tag names or IDs to add (processed after removals)'),
    removeTags: z
      .array(z.string())
      .min(1, 'removeTags array cannot be empty when provided')
      .optional()
      .describe('Tag names or IDs to remove (processed before additions)'),
    note: z.string().optional().describe('Text to append to existing note')
  })
  .refine(
    (data) => {
      // At least one substantive property must be specified (FR-013).
      // clearX: false is a no-op and does not count as specified.
      const hasSubstantive =
        data.flagged !== undefined ||
        data.dueDate !== undefined ||
        data.deferDate !== undefined ||
        data.estimatedMinutes !== undefined ||
        data.plannedDate !== undefined ||
        data.note !== undefined ||
        (data.addTags !== undefined && data.addTags.length > 0) ||
        (data.removeTags !== undefined && data.removeTags.length > 0) ||
        data.clearDueDate === true ||
        data.clearDeferDate === true ||
        data.clearEstimatedMinutes === true ||
        data.clearPlannedDate === true;
      return hasSubstantive;
    },
    { message: 'At least one property must be specified' }
  )
  .refine((data) => !(data.dueDate !== undefined && data.clearDueDate === true), {
    message: 'Cannot specify both dueDate and clearDueDate'
  })
  .refine((data) => !(data.deferDate !== undefined && data.clearDeferDate === true), {
    message: 'Cannot specify both deferDate and clearDeferDate'
  })
  .refine((data) => !(data.estimatedMinutes !== undefined && data.clearEstimatedMinutes === true), {
    message: 'Cannot specify both estimatedMinutes and clearEstimatedMinutes'
  })
  .refine((data) => !(data.plannedDate !== undefined && data.clearPlannedDate === true), {
    message: 'Cannot specify both plannedDate and clearPlannedDate'
  });

export type PropertyUpdateSet = z.infer<typeof PropertyUpdateSetSchema>;
