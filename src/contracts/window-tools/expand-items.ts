import { z } from 'zod';
import {
  WindowBatchItemResultSchema,
  WindowBatchSummarySchema,
  WindowItemIdentifierSchema
} from './shared/index.js';

/**
 * Input schema for expand_items tool.
 *
 * Expands outline nodes to show their children, with an optional `completely`
 * parameter to expand all descendants recursively.
 *
 * WARNING: This operation changes the visible OmniFocus UI state.
 *
 * ## Batch Limits
 * Accepts 1-50 items per operation.
 *
 * ## OmniJS API
 * Uses `node.expand(completely)` where `completely` is `Boolean or null`.
 * When true, all descendants are expanded recursively.
 *
 * ## Idempotent Behavior
 * Expanding an already-expanded node succeeds as a no-op.
 *
 * ## Error Conditions
 * - `NOT_FOUND`: Item does not exist in the database
 * - `NODE_NOT_FOUND`: Item exists but is not visible in the current perspective
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple items
 */
export const ExpandItemsInputSchema = z.object({
  items: z
    .array(WindowItemIdentifierSchema)
    .min(1)
    .max(50)
    .describe('Items to expand (1-50). Each must have id or name.'),
  completely: z
    .boolean()
    .optional()
    .describe(
      'When true, expand all descendants recursively. Default: false (immediate children only).'
    )
});

export type ExpandItemsInput = z.infer<typeof ExpandItemsInputSchema>;

/**
 * Success response schema for expand_items tool.
 */
export const ExpandItemsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(WindowBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: WindowBatchSummarySchema
});

export type ExpandItemsSuccess = z.infer<typeof ExpandItemsSuccessSchema>;

/**
 * Error response schema for expand_items tool.
 */
export const ExpandItemsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type ExpandItemsError = z.infer<typeof ExpandItemsErrorSchema>;

/**
 * Complete response schema for expand_items tool (discriminated union).
 */
export const ExpandItemsResponseSchema = z.discriminatedUnion('success', [
  ExpandItemsSuccessSchema,
  ExpandItemsErrorSchema
]);

export type ExpandItemsResponse = z.infer<typeof ExpandItemsResponseSchema>;
