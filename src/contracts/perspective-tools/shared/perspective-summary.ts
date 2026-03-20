import { z } from 'zod';
import { PerspectiveTypeSchema } from './perspective-identifier.js';

/**
 * Summary representation of a perspective in list responses.
 * Used by list_perspectives tool.
 */
export const PerspectiveListItemSchema = z.object({
  name: z.string().describe('Display name of the perspective'),
  type: PerspectiveTypeSchema.describe('Perspective type: builtin or custom'),
  identifier: z.string().nullable().describe('Unique identifier (null for built-in perspectives)'),
  filterAggregation: z
    .string()
    .nullable()
    .describe(
      'Top-level filter aggregation type (any/all/none). Null for built-in perspectives or OmniFocus < v4.2'
    )
});

export type PerspectiveListItem = z.infer<typeof PerspectiveListItemSchema>;

/**
 * Detailed custom perspective data returned by get_perspective.
 */
export const CustomPerspectiveDetailSchema = z.object({
  name: z.string(),
  identifier: z.string(),
  type: z.literal('custom'),
  filterRules: z
    .unknown()
    .nullable()
    .describe('Opaque archived filter rules (null if OmniFocus < v4.2)'),
  filterAggregation: z
    .string()
    .nullable()
    .describe('Top-level filter aggregation type (null if OmniFocus < v4.2)')
});

export type CustomPerspectiveDetail = z.infer<typeof CustomPerspectiveDetailSchema>;

/**
 * Minimal built-in perspective data returned by get_perspective.
 */
export const BuiltInPerspectiveDetailSchema = z.object({
  name: z.string(),
  type: z.literal('builtin')
});

export type BuiltInPerspectiveDetail = z.infer<typeof BuiltInPerspectiveDetailSchema>;
