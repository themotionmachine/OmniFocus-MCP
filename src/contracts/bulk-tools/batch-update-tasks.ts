import { z } from 'zod';
import {
  BulkBatchItemResultSchema,
  ItemIdentifierSchema,
  PropertyUpdateSetSchema,
  SummarySchema
} from './shared/index.js';

/**
 * Input schema for batch_update_tasks tool.
 *
 * Applies a uniform set of property changes to multiple tasks.
 *
 * Processing Rules:
 * - At least one property must be specified (FR-013)
 * - Tag removals processed before additions (FR-014)
 * - Each task processed independently; partial failures allowed
 * - Atomic per-task: all properties in single try-catch (no rollback)
 * - plannedDate/clearPlannedDate require OmniFocus v4.7+
 */
export const BatchUpdateTasksInputSchema = z.object({
  items: z
    .array(ItemIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Tasks to update (1-100). Each must have id or name.'),
  properties: PropertyUpdateSetSchema.describe(
    'Properties to apply uniformly to all tasks. At least one required.'
  )
});

export type BatchUpdateTasksInput = z.infer<typeof BatchUpdateTasksInputSchema>;

/**
 * Success response for batch_update_tasks.
 */
export const BatchUpdateTasksSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(BulkBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: SummarySchema
});

export type BatchUpdateTasksSuccess = z.infer<typeof BatchUpdateTasksSuccessSchema>;

/**
 * Error response for batch_update_tasks.
 */
export const BatchUpdateTasksErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Error code: VALIDATION_ERROR')
});

export type BatchUpdateTasksError = z.infer<typeof BatchUpdateTasksErrorSchema>;

export const BatchUpdateTasksResponseSchema = z.discriminatedUnion('success', [
  BatchUpdateTasksSuccessSchema,
  BatchUpdateTasksErrorSchema
]);

export type BatchUpdateTasksResponse = z.infer<typeof BatchUpdateTasksResponseSchema>;
