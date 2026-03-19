/**
 * duplicate_tasks - Zod Schema Contract
 *
 * Duplicates 1-100 tasks to a target location, creating copies that preserve
 * all task properties. Copies are always created as active/incomplete (FR-011).
 *
 * FR-002, FR-007, FR-008, FR-009, FR-010, FR-011, FR-016, FR-017
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
 * Input schema for duplicate_tasks tool.
 *
 * Duplicates tasks to a new location. Each task is duplicated independently;
 * partial failures do not block other items.
 *
 * Copies preserve: name, note, tags, dates, flagged status, subtasks.
 * Copies are always active/incomplete regardless of original's status (FR-011).
 * Response includes new IDs of created items (FR-017).
 */
export const DuplicateTasksInputSchema = z.object({
  items: z
    .array(ItemIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Tasks to duplicate (1-100). Each must have id or name.'),
  position: TaskPositionSchema.describe('Target location and placement for the duplicated tasks.')
});

export type DuplicateTasksInput = z.infer<typeof DuplicateTasksInputSchema>;

/**
 * Success response for duplicate_tasks.
 * Per-item results include newId and newName for each duplicate.
 */
export const DuplicateTasksSuccessSchema = z.object({
  success: z.literal(true),
  results: z
    .array(BulkBatchItemResultSchema)
    .describe('Per-item results at original indices. Successful items include newId and newName.'),
  summary: SummarySchema
});

export type DuplicateTasksSuccess = z.infer<typeof DuplicateTasksSuccessSchema>;

/**
 * Error response for duplicate_tasks.
 */
export const DuplicateTasksErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Error code: TARGET_NOT_FOUND, VALIDATION_ERROR')
});

export type DuplicateTasksError = z.infer<typeof DuplicateTasksErrorSchema>;

export const DuplicateTasksResponseSchema = z.discriminatedUnion('success', [
  DuplicateTasksSuccessSchema,
  DuplicateTasksErrorSchema
]);

export type DuplicateTasksResponse = z.infer<typeof DuplicateTasksResponseSchema>;
