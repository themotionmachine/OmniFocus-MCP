import { z } from 'zod';
import {
  WindowBatchItemResultSchema,
  WindowBatchSummarySchema,
  WindowItemIdentifierSchema
} from './shared/index.js';

/**
 * Input schema for reveal_items tool.
 *
 * Reveals one or more items in the OmniFocus outline, scrolling and expanding
 * the hierarchy so they become visible on screen.
 *
 * WARNING: This operation changes the visible OmniFocus UI state.
 *
 * ## Batch Limits
 * Accepts 1-10 items. Revealing too many at once defeats the navigation purpose.
 *
 * ## OmniJS API
 * Uses `tree.reveal(nodes)` which accepts `Array of TreeNode` and returns void.
 * Success is inferred from no exception being thrown.
 *
 * ## Error Conditions
 * - `NOT_FOUND`: Item ID/name does not exist in the database
 * - `NODE_NOT_FOUND`: Item exists but is not visible in the current perspective
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple items
 */
export const RevealItemsInputSchema = z.object({
  items: z
    .array(WindowItemIdentifierSchema)
    .min(1)
    .max(10)
    .describe('Items to reveal (1-10). Each must have id or name.')
});

export type RevealItemsInput = z.infer<typeof RevealItemsInputSchema>;

/**
 * Success response schema for reveal_items tool.
 */
export const RevealItemsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(WindowBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: WindowBatchSummarySchema
});

export type RevealItemsSuccess = z.infer<typeof RevealItemsSuccessSchema>;

/**
 * Error response schema for reveal_items tool.
 *
 * Only returned for catastrophic failures (e.g., OmniFocus unreachable,
 * no window open, version incompatible, platform incompatible).
 */
export const RevealItemsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type RevealItemsError = z.infer<typeof RevealItemsErrorSchema>;

/**
 * Complete response schema for reveal_items tool (discriminated union).
 */
export const RevealItemsResponseSchema = z.discriminatedUnion('success', [
  RevealItemsSuccessSchema,
  RevealItemsErrorSchema
]);

export type RevealItemsResponse = z.infer<typeof RevealItemsResponseSchema>;
