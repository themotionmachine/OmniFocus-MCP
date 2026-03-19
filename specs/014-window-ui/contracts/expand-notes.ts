import { z } from 'zod';
import {
  WindowBatchItemResultSchema,
  WindowBatchSummarySchema,
  WindowItemIdentifierSchema
} from './shared/index.js';

/**
 * Input schema for expand_notes tool.
 *
 * Expands notes on outline nodes to show note content inline, with an optional
 * `completely` parameter to expand notes on all descendants.
 *
 * WARNING: This operation changes the visible OmniFocus UI state.
 *
 * ## Batch Limits
 * Accepts 1-50 items per operation.
 *
 * ## OmniJS API
 * Uses `node.expandNote(completely)` where `completely` is `Boolean or null`.
 * When true, notes are expanded on the item and all its descendants.
 *
 * ## Idempotent Behavior
 * Expanding a note that is already expanded or on an item with no note
 * succeeds as a no-op.
 *
 * ## Error Conditions
 * - `NOT_FOUND`: Item does not exist in the database
 * - `NODE_NOT_FOUND`: Item exists but is not visible in the current perspective
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple items
 */
export const ExpandNotesInputSchema = z.object({
  items: z
    .array(WindowItemIdentifierSchema)
    .min(1)
    .max(50)
    .describe('Items whose notes to expand (1-50). Each must have id or name.'),
  completely: z
    .boolean()
    .optional()
    .describe(
      'When true, expand notes on item and all descendants. Default: false (specified items only).'
    )
});

export type ExpandNotesInput = z.infer<typeof ExpandNotesInputSchema>;

/**
 * Success response schema for expand_notes tool.
 */
export const ExpandNotesSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(WindowBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: WindowBatchSummarySchema
});

export type ExpandNotesSuccess = z.infer<typeof ExpandNotesSuccessSchema>;

/**
 * Error response schema for expand_notes tool.
 */
export const ExpandNotesErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type ExpandNotesError = z.infer<typeof ExpandNotesErrorSchema>;

/**
 * Complete response schema for expand_notes tool (discriminated union).
 */
export const ExpandNotesResponseSchema = z.discriminatedUnion('success', [
  ExpandNotesSuccessSchema,
  ExpandNotesErrorSchema
]);

export type ExpandNotesResponse = z.infer<typeof ExpandNotesResponseSchema>;
