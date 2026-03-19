import { z } from 'zod';

/**
 * CSS hex color regex pattern.
 * Accepts: #RGB, #RGBA, #RRGGBB, #RRGGBBAA (case-insensitive).
 */
const CSS_HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Input schema for set_perspective_icon tool.
 *
 * Sets the icon color of a custom perspective. Only custom perspectives
 * can have their icon color modified; built-in perspectives return an error.
 *
 * Requires OmniFocus v4.5.2+ (version-gated at runtime).
 */
export const SetPerspectiveIconInputSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Perspective name cannot be empty')
      .optional()
      .describe('Perspective name (case-insensitive for built-in perspectives)'),
    identifier: z
      .string()
      .min(1, 'Perspective identifier cannot be empty')
      .optional()
      .describe('Perspective identifier (custom perspectives only, takes precedence over name)'),
    color: z
      .string()
      .regex(
        CSS_HEX_COLOR_REGEX,
        'Color must be a CSS hex string: #RGB, #RGBA, #RRGGBB, or #RRGGBBAA'
      )
      .describe(
        'CSS hex color string (e.g., "#FF0000" for red, "#00FF0080" for 50% transparent green). Converted to Color.RGB() in OmniFocus.'
      )
  })
  .refine((d) => d.name !== undefined || d.identifier !== undefined, {
    message: 'At least one of name or identifier is required'
  });

export type SetPerspectiveIconInput = z.infer<typeof SetPerspectiveIconInputSchema>;

/**
 * Success response for set_perspective_icon.
 */
export const SetPerspectiveIconSuccessSchema = z.object({
  success: z.literal(true),
  perspectiveName: z.string().describe('Name of the modified perspective'),
  perspectiveId: z.string().describe('Identifier of the modified perspective'),
  color: z.string().describe('The CSS hex color that was set'),
  message: z.string()
});

export type SetPerspectiveIconSuccess = z.infer<typeof SetPerspectiveIconSuccessSchema>;

/**
 * Error response for set_perspective_icon.
 */
export const SetPerspectiveIconErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z
    .enum([
      'NOT_FOUND',
      'BUILTIN_NOT_MODIFIABLE',
      'VERSION_NOT_SUPPORTED',
      'DISAMBIGUATION_REQUIRED'
    ])
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

export type SetPerspectiveIconError = z.infer<typeof SetPerspectiveIconErrorSchema>;

/**
 * Complete response schema (discriminated union).
 */
export const SetPerspectiveIconResponseSchema = z.discriminatedUnion('success', [
  SetPerspectiveIconSuccessSchema,
  SetPerspectiveIconErrorSchema
]);

export type SetPerspectiveIconResponse = z.infer<typeof SetPerspectiveIconResponseSchema>;
