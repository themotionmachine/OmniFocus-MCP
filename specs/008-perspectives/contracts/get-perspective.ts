import { z } from 'zod';
import { PerspectiveIdentifierSchema } from './shared/perspective-identifier.js';
import {
  BuiltInPerspectiveDetailSchema,
  CustomPerspectiveDetailSchema
} from './shared/perspective-summary.js';

/**
 * Input schema for get_perspective tool.
 *
 * Retrieves detailed information about a single perspective.
 * Replaces the legacy `get_perspective_view` tool.
 *
 * Identifier takes precedence over name when both are provided.
 */
export const GetPerspectiveInputSchema = PerspectiveIdentifierSchema;

export type GetPerspectiveInput = z.infer<typeof GetPerspectiveInputSchema>;

/**
 * Success response for get_perspective.
 *
 * Returns either a CustomPerspectiveDetail (with filter rules) or
 * a BuiltInPerspectiveDetail (name and type only).
 */
export const GetPerspectiveSuccessSchema = z.object({
  success: z.literal(true),
  perspective: z.union([CustomPerspectiveDetailSchema, BuiltInPerspectiveDetailSchema])
});

export type GetPerspectiveSuccess = z.infer<typeof GetPerspectiveSuccessSchema>;

/**
 * Error response for get_perspective.
 */
export const GetPerspectiveErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z
    .enum(['NOT_FOUND', 'DISAMBIGUATION_REQUIRED'])
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

export type GetPerspectiveError = z.infer<typeof GetPerspectiveErrorSchema>;

/**
 * Complete response schema (discriminated union).
 */
export const GetPerspectiveResponseSchema = z.discriminatedUnion('success', [
  GetPerspectiveSuccessSchema,
  GetPerspectiveErrorSchema
]);

export type GetPerspectiveResponse = z.infer<typeof GetPerspectiveResponseSchema>;
