import { z } from 'zod';
import {
  WindowBatchItemResultSchema,
  WindowBatchSummarySchema,
  WindowItemIdentifierSchema
} from './shared/index.js';

/**
 * Input schema for collapse_notes tool.
 *
 * Collapses notes on outline nodes to hide note content, with an optional
 * `completely` parameter to collapse notes on all descendants.
 *
 * WARNING: This operation changes the visible OmniFocus UI state.
 *
 * ## Batch Limits
 * Accepts 1-50 items per operation.
 *
 * ## OmniJS API
 * Uses `node.collapseNote(completely)` where `completely` is `Boolean or null`.
 * When true, notes are collapsed on the item and all its descendants.
 *
 * ## Idempotent Behavior
 * Collapsing a note that is already collapsed succeeds as a no-op.
 *
 * ## Error Conditions
 * - `NOT_FOUND`: Item does not exist in the database
 * - `NODE_NOT_FOUND`: Item exists but is not visible in the current perspective
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple items
 */
export const CollapseNotesInputSchema = z.object({
  items: z
    .array(WindowItemIdentifierSchema)
    .min(1)
    .max(50)
    .describe('Items whose notes to collapse (1-50). Each must have id or name.'),
  completely: z
    .boolean()
    .optional()
    .describe(
      'When true, collapse notes on item and all descendants. Default: false (specified items only).'
    )
});

export type CollapseNotesInput = z.infer<typeof CollapseNotesInputSchema>;

/**
 * Success response schema for collapse_notes tool.
 */
export const CollapseNotesSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(WindowBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: WindowBatchSummarySchema
});

export type CollapseNotesSuccess = z.infer<typeof CollapseNotesSuccessSchema>;

/**
 * Error response schema for collapse_notes tool.
 */
export const CollapseNotesErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type CollapseNotesError = z.infer<typeof CollapseNotesErrorSchema>;

/**
 * Complete response schema for collapse_notes tool (discriminated union).
 */
export const CollapseNotesResponseSchema = z.discriminatedUnion('success', [
  CollapseNotesSuccessSchema,
  CollapseNotesErrorSchema
]);

export type CollapseNotesResponse = z.infer<typeof CollapseNotesResponseSchema>;
