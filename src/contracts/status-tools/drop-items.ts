import { z } from 'zod';
import {
  ItemIdentifierSchema,
  StatusBatchItemResultSchema,
  SummarySchema
} from './shared/index.js';

/**
 * Input schema for drop_items tool.
 *
 * Drops one or more tasks or projects (preserves in database, removes from active views).
 *
 * ## Version Requirement
 *
 * Requires OmniFocus 3.8+. The script performs a fail-fast version check before
 * processing any items, returning { success: false, error: "..." } immediately if
 * the version requirement is not met.
 *
 * ## Drop Mechanism (Tasks vs Projects)
 *
 * - **Tasks**: `task.drop(allOccurrences)` — boolean controls repeating behavior
 * - **Projects**: `project.status = Project.Status.Dropped` — no drop() method exists
 *
 * The `allOccurrences` parameter is ignored for projects.
 *
 * ## Idempotent Behavior
 *
 * Already-dropped items return `success: true` with `code: 'ALREADY_DROPPED'`.
 * Detection:
 * - Tasks: `task.dropDate !== null`
 * - Projects: `project.status === Project.Status.Dropped`
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
 * - `ALREADY_DROPPED` (success=true): Item already dropped (idempotent)
 */
export const DropItemsInputSchema = z.object({
  items: z
    .array(ItemIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Items to drop (1-100). Each must have id or name.'),
  allOccurrences: z
    .boolean()
    .default(true)
    .describe(
      'For repeating tasks: true stops all repeats, false drops current only. Ignored for projects.'
    )
});

export type DropItemsInput = z.infer<typeof DropItemsInputSchema>;

/**
 * Success response schema for drop_items tool.
 *
 * Contains per-item results for batch operation.
 * Note: This is the outer success=true wrapper — individual items may still fail.
 */
export const DropItemsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(StatusBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: SummarySchema
});

export type DropItemsSuccess = z.infer<typeof DropItemsSuccessSchema>;

/**
 * Error response schema for drop_items tool.
 *
 * Returned for catastrophic failures:
 * - OmniFocus version < 3.8 (VERSION_NOT_SUPPORTED)
 * - OmniFocus unreachable
 * - Script execution error
 *
 * Individual item failures are reported in DropItemsSuccess.results.
 */
export const DropItemsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type DropItemsError = z.infer<typeof DropItemsErrorSchema>;

/**
 * Complete response schema for drop_items tool (discriminated union).
 */
export const DropItemsResponseSchema = z.discriminatedUnion('success', [
  DropItemsSuccessSchema,
  DropItemsErrorSchema
]);

export type DropItemsResponse = z.infer<typeof DropItemsResponseSchema>;
