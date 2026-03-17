import { z } from 'zod';

/**
 * Project identifier schema for batch operations.
 *
 * Supports identification by ID (preferred) or name (requires disambiguation).
 * At least one of `id` or `name` must be provided.
 *
 * **ID vs Name Resolution**:
 * - `id` provided: Direct lookup via `Project.byIdentifier(id)`
 * - `name` only: Search via `flattenedProjects.byName(name)` (may return multiple)
 *
 * **Disambiguation Handling**:
 * When name lookup returns multiple matches and no `id` is provided:
 * - Operation fails for that item with `code: "DISAMBIGUATION_REQUIRED"`
 * - `candidates` array contains matching projects (id + name for user selection)
 * - User must retry with specific `id`
 *
 * **Validation**:
 * - Empty string for both `id` and `name` is invalid
 * - At least one must be a non-empty string
 */
export const ProjectIdentifierSchema = z
  .object({
    id: z.string().optional().describe('Project ID (preferred - direct lookup)'),
    name: z.string().optional().describe('Project name (fallback - may require disambiguation)')
  })
  .refine((data) => (data.id && data.id.length > 0) || (data.name && data.name.length > 0), {
    message: 'Either id or name must be provided'
  });

export type ProjectIdentifier = z.infer<typeof ProjectIdentifierSchema>;

/**
 * Batch item result schema for review operations.
 *
 * Reports per-item success/failure for batch operations.
 * Each result corresponds to the input item at the same array index.
 *
 * **Success Fields**:
 * - `projectId`: Resolved project ID
 * - `projectName`: Project name for display
 * - `success`: true
 * - Additional fields vary by operation (e.g., `previousNextReviewDate`, `newNextReviewDate`)
 *
 * **Error Fields**:
 * - `projectId`: Original input ID (or empty if name-only lookup failed)
 * - `projectName`: Original input name (or empty if ID-only lookup failed)
 * - `success`: false
 * - `error`: Human-readable error message
 * - `code`: Error code for programmatic handling (optional)
 * - `candidates`: Array of matching projects (id + name) when disambiguation required (optional)
 *
 * **Error Codes**:
 * - `NOT_FOUND`: Project does not exist
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple projects
 * - `NO_REVIEW_INTERVAL`: Project has no reviewInterval configured (mark_reviewed)
 * - `INVALID_INTERVAL`: Invalid interval parameters (set_review_interval)
 */
export const ReviewBatchItemResultSchema = z.object({
  projectId: z.string().describe('Resolved project ID (original input if lookup failed)'),
  projectName: z.string().describe('Project name (empty string if lookup failed)'),
  success: z.boolean().describe('Whether the operation succeeded for this project'),
  error: z.string().optional().describe('Error message (present only when success=false)'),
  code: z
    .string()
    .optional()
    .describe(
      'Error code: NOT_FOUND, DISAMBIGUATION_REQUIRED, NO_REVIEW_INTERVAL, INVALID_INTERVAL'
    ),
  candidates: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional()
    .describe('Matching projects when disambiguation required (id + name for user selection)')
});

export type ReviewBatchItemResult = z.infer<typeof ReviewBatchItemResultSchema>;

/**
 * Extended batch item result with date change tracking.
 *
 * Used by mark_reviewed to report the date transition.
 */
export const MarkReviewedItemResultSchema = ReviewBatchItemResultSchema.extend({
  previousNextReviewDate: z
    .string()
    .nullable()
    .optional()
    .describe('Previous nextReviewDate value (ISO 8601, present on success)'),
  newNextReviewDate: z
    .string()
    .nullable()
    .optional()
    .describe('New nextReviewDate value after marking reviewed (ISO 8601, present on success)')
});

export type MarkReviewedItemResult = z.infer<typeof MarkReviewedItemResultSchema>;

/**
 * Extended batch item result with interval change tracking.
 *
 * Used by set_review_interval to report the interval transition.
 */
export const SetReviewIntervalItemResultSchema = ReviewBatchItemResultSchema.extend({
  previousInterval: z
    .object({
      steps: z.number(),
      unit: z.enum(['days', 'weeks', 'months', 'years'])
    })
    .nullable()
    .optional()
    .describe('Previous reviewInterval (null if was disabled, present on success)'),
  newInterval: z
    .object({
      steps: z.number(),
      unit: z.enum(['days', 'weeks', 'months', 'years'])
    })
    .nullable()
    .optional()
    .describe('New reviewInterval (null if disabled, present on success)')
});

export type SetReviewIntervalItemResult = z.infer<typeof SetReviewIntervalItemResultSchema>;
