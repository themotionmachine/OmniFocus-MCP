import { z } from 'zod';
import { MarkReviewedItemResultSchema, ProjectIdentifierSchema } from './shared/batch.js';

/**
 * Input schema for mark_reviewed tool.
 *
 * Marks one or more projects as reviewed by advancing their nextReviewDate.
 *
 * ## Critical Implementation Note
 *
 * OmniFocus has NO `markReviewed()` method. Instead:
 * 1. Calculate new date: `today + reviewInterval`
 * 2. Set `project.nextReviewDate` directly
 *
 * Note: `lastReviewDate` is READ-ONLY from scripts. OmniFocus only updates it
 * when the user marks reviewed via the UI (Shift-Cmd-R). Setting `nextReviewDate`
 * programmatically does NOT trigger a `lastReviewDate` update.
 *
 * ## Date Calculation (MUST use Calendar API)
 *
 * ```javascript
 * var today = Calendar.current.startOfDay(new Date());
 * var dc = new DateComponents();
 * // Map unit to DateComponents property
 * switch (project.reviewInterval.unit) {
 *   case 'days': dc.day = project.reviewInterval.steps; break;
 *   case 'weeks': dc.day = project.reviewInterval.steps * 7; break; // No dc.week property
 *   case 'months': dc.month = project.reviewInterval.steps; break;
 *   case 'years': dc.year = project.reviewInterval.steps; break;
 * }
 * project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);
 * ```
 *
 * **WHY Calendar API**: Millisecond math fails for months/years (varying lengths).
 * Calendar API handles leap years, month boundaries, DST correctly.
 *
 * ## Batch Operation Semantics
 *
 * - Each project processed independently
 * - Partial failures don't fail entire batch
 * - Results at original array indices
 * - Per-item error details with codes
 *
 * ## Error Conditions
 *
 * - `NOT_FOUND`: Project ID/name doesn't exist
 * - `DISAMBIGUATION_REQUIRED`: Name matched multiple projects
 * - `NO_REVIEW_INTERVAL`: Project has no reviewInterval (reviews disabled)
 */
export const MarkReviewedInputSchema = z.object({
  projects: z
    .array(ProjectIdentifierSchema)
    .min(1)
    .max(100)
    .describe(
      'Projects to mark as reviewed (1-100 items). Each must have id or name. ID preferred for reliability.'
    )
});

export type MarkReviewedInput = z.infer<typeof MarkReviewedInputSchema>;

/**
 * Success response schema for mark_reviewed tool.
 *
 * Contains per-item results for batch operation.
 */
export const MarkReviewedSuccessSchema = z.object({
  success: z.literal(true),
  results: z
    .array(MarkReviewedItemResultSchema)
    .describe('Per-project results at original indices'),
  summary: z.object({
    total: z.number().int().min(0).describe('Total projects in request'),
    succeeded: z.number().int().min(0).describe('Projects successfully marked reviewed'),
    failed: z.number().int().min(0).describe('Projects that failed')
  })
});

export type MarkReviewedSuccess = z.infer<typeof MarkReviewedSuccessSchema>;

/**
 * Error response schema for mark_reviewed tool.
 *
 * Only returned for catastrophic failures (e.g., OmniFocus unreachable).
 * Individual project failures are reported in MarkReviewedSuccess.results.
 */
export const MarkReviewedErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type MarkReviewedError = z.infer<typeof MarkReviewedErrorSchema>;

/**
 * Complete response schema for mark_reviewed tool (discriminated union).
 */
export const MarkReviewedResponseSchema = z.discriminatedUnion('success', [
  MarkReviewedSuccessSchema,
  MarkReviewedErrorSchema
]);

export type MarkReviewedResponse = z.infer<typeof MarkReviewedResponseSchema>;
