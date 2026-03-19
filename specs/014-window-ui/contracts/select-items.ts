import { z } from 'zod';
import {
  WindowBatchItemResultSchema,
  WindowBatchSummarySchema,
  WindowItemIdentifierSchema
} from './shared/index.js';

/**
 * Input schema for select_items tool.
 *
 * Selects one or more items in the OmniFocus outline, either replacing the
 * current selection or adding to it.
 *
 * WARNING: This operation changes the visible OmniFocus UI state.
 *
 * ## Batch Limits
 * Accepts 1-100 items per operation.
 *
 * ## OmniJS API
 * Uses `tree.select(nodes, extending)` which returns void.
 * - `extending` false (default): replaces current selection
 * - `extending` true: adds to existing selection
 *
 * ## Per-Item Resolution
 * Uses `tree.nodeForObject(object)` per-item to resolve visible nodes before
 * calling `tree.select()`. Per-item resolution enables precise NODE_NOT_FOUND
 * error reporting for items not visible in the current perspective.
 *
 * ## Error Conditions
 * - `NOT_FOUND`: Item does not exist in the database
 * - `NODE_NOT_FOUND`: Item exists but is not visible in the current perspective
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple items
 */
export const SelectItemsInputSchema = z.object({
  items: z
    .array(WindowItemIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Items to select (1-100). Each must have id or name.'),
  extending: z
    .boolean()
    .optional()
    .describe('When true, add to existing selection. Default: false (replace selection).')
});

export type SelectItemsInput = z.infer<typeof SelectItemsInputSchema>;

/**
 * Success response schema for select_items tool.
 */
export const SelectItemsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(WindowBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: WindowBatchSummarySchema
});

export type SelectItemsSuccess = z.infer<typeof SelectItemsSuccessSchema>;

/**
 * Error response schema for select_items tool.
 */
export const SelectItemsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type SelectItemsError = z.infer<typeof SelectItemsErrorSchema>;

/**
 * Complete response schema for select_items tool (discriminated union).
 */
export const SelectItemsResponseSchema = z.discriminatedUnion('success', [
  SelectItemsSuccessSchema,
  SelectItemsErrorSchema
]);

export type SelectItemsResponse = z.infer<typeof SelectItemsResponseSchema>;
