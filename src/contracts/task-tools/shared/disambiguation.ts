import { z } from 'zod';

/**
 * Disambiguation error schema.
 *
 * Returned when a name-based lookup matches multiple items.
 * Provides the IDs of all matching items for user selection.
 *
 * **min(2) Rationale**: Disambiguation by definition requires at least 2 matches.
 * If there's 0 matches, return "not found" error. If there's 1 match, return success.
 * Only 2+ matches trigger disambiguation - hence the minimum constraint.
 */
export const DisambiguationErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.literal('DISAMBIGUATION_REQUIRED'),
  matchingIds: z
    .array(z.string())
    .min(2)
    .describe('IDs of all matching items (min 2, by definition)')
});

export type DisambiguationError = z.infer<typeof DisambiguationErrorSchema>;
