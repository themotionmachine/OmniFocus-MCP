import { z } from 'zod';
import { PerspectiveListItemSchema } from './shared/perspective-summary.js';

/**
 * Input schema for list_perspectives tool.
 *
 * Lists all perspectives available in OmniFocus, with optional filtering
 * by type (built-in, custom, or all).
 *
 * Replaces the legacy list_perspectives tool which used boolean
 * `includeBuiltIn`/`includeCustom` parameters.
 */
export const ListPerspectivesInputSchema = z.object({
  type: z
    .enum(['all', 'builtin', 'custom'])
    .default('all')
    .describe(
      'Filter by perspective type. "all" returns both built-in and custom (default), "builtin" returns only built-in, "custom" returns only custom perspectives.'
    )
});

export type ListPerspectivesInput = z.infer<typeof ListPerspectivesInputSchema>;

/**
 * Success response for list_perspectives.
 *
 * Perspectives are sorted alphabetically by name within each type group
 * (built-in first, then custom).
 */
export const ListPerspectivesSuccessSchema = z.object({
  success: z.literal(true),
  perspectives: z
    .array(PerspectiveListItemSchema)
    .describe('Perspectives matching the filter, sorted alphabetically by name within type groups'),
  totalCount: z.number().int().min(0).describe('Total number of perspectives returned')
});

export type ListPerspectivesSuccess = z.infer<typeof ListPerspectivesSuccessSchema>;

/**
 * Error response for list_perspectives.
 */
export const ListPerspectivesErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type ListPerspectivesError = z.infer<typeof ListPerspectivesErrorSchema>;

/**
 * Complete response schema (discriminated union).
 */
export const ListPerspectivesResponseSchema = z.discriminatedUnion('success', [
  ListPerspectivesSuccessSchema,
  ListPerspectivesErrorSchema
]);

export type ListPerspectivesResponse = z.infer<typeof ListPerspectivesResponseSchema>;
