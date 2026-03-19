import { z } from 'zod';

/**
 * Input schema for unfocus tool.
 *
 * Clears the current focus, restoring the full OmniFocus outline view.
 * No parameters required.
 *
 * WARNING: This operation changes the visible OmniFocus UI state.
 *
 * ## OmniJS API
 * Sets `window.focus = []` to clear focus. No ContentTree needed.
 *
 * ## Idempotent Behavior
 * Unfocusing when already unfocused (window.focus === null) succeeds as a no-op.
 */
export const UnfocusInputSchema = z.object({});

export type UnfocusInput = z.infer<typeof UnfocusInputSchema>;

/**
 * Success response schema for unfocus tool.
 */
export const UnfocusSuccessSchema = z.object({
  success: z.literal(true)
});

export type UnfocusSuccess = z.infer<typeof UnfocusSuccessSchema>;

/**
 * Error response schema for unfocus tool.
 *
 * Only returned for catastrophic failures (e.g., OmniFocus unreachable,
 * no window open, version incompatible, platform incompatible).
 */
export const UnfocusErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type UnfocusError = z.infer<typeof UnfocusErrorSchema>;

/**
 * Complete response schema for unfocus tool (discriminated union).
 */
export const UnfocusResponseSchema = z.discriminatedUnion('success', [
  UnfocusSuccessSchema,
  UnfocusErrorSchema
]);

export type UnfocusResponse = z.infer<typeof UnfocusResponseSchema>;
