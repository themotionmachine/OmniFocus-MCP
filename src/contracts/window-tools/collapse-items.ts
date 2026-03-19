import { z } from 'zod';
import {
  WindowBatchItemResultSchema,
  WindowBatchSummarySchema,
  WindowItemIdentifierSchema
} from './shared/index.js';

/**
 * Input schema for collapse_items tool.
 *
 * Collapses outline nodes to hide their children, with an optional `completely`
 * parameter to collapse all descendants recursively.
 *
 * WARNING: This operation changes the visible OmniFocus UI state.
 *
 * ## Batch Limits
 * Accepts 1-50 items per operation.
 *
 * ## OmniJS API
 * Uses `node.collapse(completely)` where `completely` is `Boolean or null`.
 * When true, all descendant levels are collapsed.
 *
 * ## Idempotent Behavior
 * Collapsing an already-collapsed node succeeds as a no-op.
 *
 * ## Error Conditions
 * - `NOT_FOUND`: Item does not exist in the database
 * - `NODE_NOT_FOUND`: Item exists but is not visible in the current perspective
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple items
 */
export const CollapseItemsInputSchema = z.object({
  items: z
    .array(WindowItemIdentifierSchema)
    .min(1)
    .max(50)
    .describe('Items to collapse (1-50). Each must have id or name.'),
  completely: z
    .boolean()
    .optional()
    .describe(
      'When true, collapse all descendants recursively. Default: false (immediate level only).'
    )
});

export type CollapseItemsInput = z.infer<typeof CollapseItemsInputSchema>;

/**
 * Success response schema for collapse_items tool.
 */
export const CollapseItemsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(WindowBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: WindowBatchSummarySchema
});

export type CollapseItemsSuccess = z.infer<typeof CollapseItemsSuccessSchema>;

/**
 * Error response schema for collapse_items tool.
 */
export const CollapseItemsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type CollapseItemsError = z.infer<typeof CollapseItemsErrorSchema>;

/**
 * Complete response schema for collapse_items tool (discriminated union).
 */
export const CollapseItemsResponseSchema = z.discriminatedUnion('success', [
  CollapseItemsSuccessSchema,
  CollapseItemsErrorSchema
]);

export type CollapseItemsResponse = z.infer<typeof CollapseItemsResponseSchema>;
