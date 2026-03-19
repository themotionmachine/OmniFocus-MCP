/**
 * move_tasks - Zod Schema Contract
 *
 * Moves 1-100 tasks to a target location (project, inbox, or parent task)
 * with optional position control.
 *
 * FR-001, FR-007, FR-008, FR-009, FR-010, FR-015, FR-016
 *
 * Zod version: 4.2.x
 */

import { z } from 'zod';
import {
  BulkBatchItemResultSchema,
  ItemIdentifierSchema,
  SummarySchema,
  TaskPositionSchema
} from './shared.js';

/**
 * Input schema for move_tasks tool.
 *
 * Moves tasks to a new location. Each task is moved independently;
 * partial failures do not block other items.
 *
 * The target location is pre-validated before processing items (FR-016).
 * An invalid target returns a top-level TARGET_NOT_FOUND error.
 */
export const MoveTasksInputSchema = z.object({
  items: z
    .array(ItemIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Tasks to move (1-100). Each must have id or name.'),
  position: TaskPositionSchema.describe('Target location and placement for the moved tasks.')
});

export type MoveTasksInput = z.infer<typeof MoveTasksInputSchema>;

/**
 * Success response for move_tasks.
 * Per-item results at original array indices.
 */
export const MoveTasksSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(BulkBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: SummarySchema
});

export type MoveTasksSuccess = z.infer<typeof MoveTasksSuccessSchema>;

/**
 * Error response for move_tasks.
 * Only for catastrophic failures or pre-validation errors (TARGET_NOT_FOUND).
 */
export const MoveTasksErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Error code: TARGET_NOT_FOUND, VALIDATION_ERROR')
});

export type MoveTasksError = z.infer<typeof MoveTasksErrorSchema>;

export const MoveTasksResponseSchema = z.discriminatedUnion('success', [
  MoveTasksSuccessSchema,
  MoveTasksErrorSchema
]);

export type MoveTasksResponse = z.infer<typeof MoveTasksResponseSchema>;
