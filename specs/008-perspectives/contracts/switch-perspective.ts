import { z } from 'zod';
import { PerspectiveIdentifierSchema } from './shared/perspective-identifier.js';

/**
 * Input schema for switch_perspective tool.
 *
 * Switches the active OmniFocus window to display the specified perspective.
 *
 * WARNING: This is a UI-affecting operation. Calling this tool changes what
 * the user sees on screen. The OmniFocus front window will navigate to the
 * target perspective immediately.
 *
 * Identifier takes precedence over name when both are provided.
 */
export const SwitchPerspectiveInputSchema = PerspectiveIdentifierSchema;

export type SwitchPerspectiveInput = z.infer<typeof SwitchPerspectiveInputSchema>;

/**
 * Success response for switch_perspective.
 */
export const SwitchPerspectiveSuccessSchema = z.object({
  success: z.literal(true),
  perspectiveName: z.string().describe('Name of the perspective that was switched to'),
  message: z.string().describe('Confirmation message')
});

export type SwitchPerspectiveSuccess = z.infer<typeof SwitchPerspectiveSuccessSchema>;

/**
 * Error response for switch_perspective.
 */
export const SwitchPerspectiveErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z
    .enum(['NOT_FOUND', 'NO_WINDOW', 'DISAMBIGUATION_REQUIRED'])
    .optional()
    .describe('Error code for programmatic handling'),
  candidates: z
    .array(
      z.object({
        name: z.string(),
        identifier: z.string()
      })
    )
    .optional()
    .describe('Matching candidates when disambiguation is required')
});

export type SwitchPerspectiveError = z.infer<typeof SwitchPerspectiveErrorSchema>;

/**
 * Complete response schema (discriminated union).
 */
export const SwitchPerspectiveResponseSchema = z.discriminatedUnion('success', [
  SwitchPerspectiveSuccessSchema,
  SwitchPerspectiveErrorSchema
]);

export type SwitchPerspectiveResponse = z.infer<typeof SwitchPerspectiveResponseSchema>;
