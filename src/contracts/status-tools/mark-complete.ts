import { z } from 'zod';
import {
  ItemIdentifierSchema,
  StatusBatchItemResultSchema,
  SummarySchema
} from './shared/index.js';

/**
 * Input schema for mark_complete tool.
 *
 * Completes one or more tasks or projects with optional backdating.
 *
 * ## Item Lookup Order
 *
 * 1. If `id` provided: try `Task.byIdentifier(id)`, then `Project.byIdentifier(id)`
 * 2. If `name` only: search `flattenedTasks` and `flattenedProjects` (disambiguation if multiple)
 * 3. If both: `id` takes precedence
 *
 * ## Idempotent Behavior
 *
 * Already-completed items return `success: true` with `code: 'ALREADY_COMPLETED'`.
 *
 * ## Repeating Tasks
 *
 * Calling `markComplete()` on a repeating task creates a clone and completes it;
 * the original task continues the repeat cycle.
 *
 * ## Batch Operation Semantics
 *
 * - Each item processed independently; partial failures do not fail entire batch
 * - Results at original array indices
 * - Per-item error details with codes
 *
 * ## Error Conditions
 *
 * - `NOT_FOUND`: Item ID/name doesn't exist
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple items
 */
export const MarkCompleteInputSchema = z.object({
  items: z
    .array(ItemIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Items to complete (1-100). Each must have id or name.'),
  completionDate: z
    .string()
    .optional()
    .describe('Optional ISO 8601 date for backdating. Null = current date.')
});

export type MarkCompleteInput = z.infer<typeof MarkCompleteInputSchema>;

/**
 * Success response schema for mark_complete tool.
 *
 * Contains per-item results for batch operation.
 */
export const MarkCompleteSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(StatusBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: SummarySchema
});

export type MarkCompleteSuccess = z.infer<typeof MarkCompleteSuccessSchema>;

/**
 * Error response schema for mark_complete tool.
 *
 * Only returned for catastrophic failures (e.g., OmniFocus unreachable).
 * Individual item failures are reported in MarkCompleteSuccess.results.
 */
export const MarkCompleteErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type MarkCompleteError = z.infer<typeof MarkCompleteErrorSchema>;

/**
 * Complete response schema for mark_complete tool (discriminated union).
 */
export const MarkCompleteResponseSchema = z.discriminatedUnion('success', [
  MarkCompleteSuccessSchema,
  MarkCompleteErrorSchema
]);

export type MarkCompleteResponse = z.infer<typeof MarkCompleteResponseSchema>;
