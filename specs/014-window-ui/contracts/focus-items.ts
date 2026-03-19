import { z } from 'zod';
import { WindowBatchItemResultSchema, WindowBatchSummarySchema } from './shared/index.js';

/**
 * Focus target identifier schema.
 *
 * Only projects and folders are valid focus targets. Tasks and tags
 * are rejected with INVALID_TYPE error at the OmniJS layer.
 *
 * At least one of `id` or `name` must be a non-empty string.
 */
export const FocusTargetSchema = z
  .object({
    id: z.string().optional().describe('Project or folder ID (preferred — direct lookup)'),
    name: z
      .string()
      .optional()
      .describe('Project or folder name (fallback — may require disambiguation)')
  })
  .refine((data) => (data.id && data.id.length > 0) || (data.name && data.name.length > 0), {
    message: 'Either id or name must be provided'
  });

export type FocusTarget = z.infer<typeof FocusTargetSchema>;

/**
 * Input schema for focus_items tool.
 *
 * Focuses the OmniFocus window on one or more projects or folders, narrowing
 * the outline to show only those items and their contents.
 *
 * WARNING: This operation changes the visible OmniFocus UI state.
 *
 * ## Focus Target Restrictions
 * Only projects and folders are valid. Tasks and tags are rejected with
 * INVALID_TYPE error code and a message explaining the restriction.
 *
 * ## OmniJS API
 * Sets `window.focus = [project, folder, ...]`. No ContentTree needed.
 *
 * ## Error Conditions
 * - `NOT_FOUND`: Item does not exist in the database
 * - `INVALID_TYPE`: Item is a task or tag (not a valid focus target)
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple items
 */
export const FocusItemsInputSchema = z.object({
  items: z
    .array(FocusTargetSchema)
    .min(1)
    .max(50)
    .describe('Projects or folders to focus on (1-50). Each must have id or name.')
});

export type FocusItemsInput = z.infer<typeof FocusItemsInputSchema>;

/**
 * Success response schema for focus_items tool.
 */
export const FocusItemsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(WindowBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: WindowBatchSummarySchema
});

export type FocusItemsSuccess = z.infer<typeof FocusItemsSuccessSchema>;

/**
 * Error response schema for focus_items tool.
 */
export const FocusItemsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type FocusItemsError = z.infer<typeof FocusItemsErrorSchema>;

/**
 * Complete response schema for focus_items tool (discriminated union).
 */
export const FocusItemsResponseSchema = z.discriminatedUnion('success', [
  FocusItemsSuccessSchema,
  FocusItemsErrorSchema
]);

export type FocusItemsResponse = z.infer<typeof FocusItemsResponseSchema>;
