import { z } from 'zod';
import {
  ItemIdentifierSchema,
  StatusBatchItemResultSchema,
  SummarySchema
} from './shared/index.js';

/**
 * Input schema for mark_incomplete tool.
 *
 * Reopens completed or dropped tasks and projects. Auto-detects item state
 * and uses the appropriate mechanism:
 *
 * - Completed task → `task.markIncomplete()`
 * - Dropped task → `task.active = true`
 * - Completed project → `project.markIncomplete()`
 * - Dropped project → `project.status = Project.Status.Active`
 * - Already active → no-op success with `code: 'ALREADY_ACTIVE'`
 *
 * ## Batch Operation Semantics
 *
 * - Each item processed independently
 * - Partial failures don't fail entire batch
 * - Results at original array indices
 * - Per-item error details with codes
 *
 * ## Error Conditions
 *
 * - `NOT_FOUND`: Item ID/name doesn't exist
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple items
 * - `ALREADY_ACTIVE`: Item is already active (no-op, success=true)
 */
export const MarkIncompleteInputSchema = z.object({
  items: z
    .array(ItemIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Items to reopen (1-100). Each must have id or name.')
});

export type MarkIncompleteInput = z.infer<typeof MarkIncompleteInputSchema>;

/**
 * Success response schema for mark_incomplete tool.
 *
 * Contains per-item results for batch operation.
 */
export const MarkIncompleteSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(StatusBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: SummarySchema
});

export type MarkIncompleteSuccess = z.infer<typeof MarkIncompleteSuccessSchema>;

/**
 * Error response schema for mark_incomplete tool.
 *
 * Only returned for catastrophic failures (e.g., OmniFocus unreachable).
 * Individual item failures are reported in MarkIncompleteSuccess.results.
 */
export const MarkIncompleteErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type MarkIncompleteError = z.infer<typeof MarkIncompleteErrorSchema>;

/**
 * Complete response schema for mark_incomplete tool (discriminated union).
 */
export const MarkIncompleteResponseSchema = z.discriminatedUnion('success', [
  MarkIncompleteSuccessSchema,
  MarkIncompleteErrorSchema
]);

export type MarkIncompleteResponse = z.infer<typeof MarkIncompleteResponseSchema>;
