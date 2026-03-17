import { z } from 'zod';
import { ReviewUnitSchema } from '../project-tools/shared/project.js';
import { ProjectIdentifierSchema, SetReviewIntervalItemResultSchema } from './shared/batch.js';

/**
 * Input schema for set_review_interval tool.
 *
 * Configures the review frequency for one or more projects.
 *
 * ## Interval Configuration
 *
 * The interval is specified as `steps` + `unit`:
 * - `{ steps: 7, unit: 'days' }` → Review every 7 days
 * - `{ steps: 2, unit: 'weeks' }` → Review every 2 weeks
 * - `{ steps: 1, unit: 'months' }` → Review monthly
 *
 * ## Disabling Reviews
 *
 * Set `interval: null` to disable reviews for a project.
 *
 * **OmniJS Limitation:** `reviewInterval` and `nextReviewDate` cannot actually
 * be set to `null` in OmniJS. The implementation uses a workaround: sets
 * `reviewInterval` to 365 years and pushes `nextReviewDate` 365 years into the
 * future. The response still reports `newInterval: null` to keep the contract
 * clean. The query tool (`get_projects_for_review`) recognizes this sentinel
 * and excludes these projects from results.
 *
 * ## Value Object Semantics (Critical)
 *
 * ReviewInterval is a value object proxy — must read, modify, and write back:
 *
 * ```javascript
 * // WRONG - modifies local copy only
 * project.reviewInterval.steps = 14;
 *
 * // CORRECT - read existing proxy, modify, reassign
 * var ri = project.reviewInterval;
 * ri.steps = 14;
 * ri.unit = 'days';
 * project.reviewInterval = ri;
 * ```
 *
 * ## Batch Operation Semantics
 *
 * - Each project processed independently
 * - Partial failures don't fail entire batch
 * - Results at original array indices
 * - Per-item error details with codes
 *
 * ## Side Effects
 *
 * When interval is set (not null):
 * - If `nextReviewDate` is null, it's always calculated as `today + interval`
 * - If `nextReviewDate` exists and `recalculateNextReview=false` (default): preserved
 * - If `nextReviewDate` exists and `recalculateNextReview=true`: set to `today + interval`
 *
 * When interval is set to null (disable):
 * - Uses 365-year sentinel workaround (OmniJS cannot set these to null)
 * - `reviewInterval` set to { steps: 365, unit: 'years' }
 * - `nextReviewDate` pushed 365 years into the future
 * - Response reports `newInterval: null` (abstraction over the workaround)
 * - Project excluded from `get_projects_for_review` via sentinel detection
 */
export const SetReviewIntervalInputSchema = z.object({
  projects: z
    .array(ProjectIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Projects to configure (1-100 items). Each must have id or name.'),

  interval: z
    .object({
      steps: z
        .number()
        .int()
        .min(1)
        .max(365)
        .describe('Number of units (1-365). E.g., 14 for "every 14 days"'),
      unit: ReviewUnitSchema.describe('Unit type: days, weeks, months, years')
    })
    .nullable()
    .describe('Review interval to set. Pass null to disable reviews for these projects.'),

  recalculateNextReview: z
    .boolean()
    .default(false)
    .describe(
      'When true, recalculate nextReviewDate as today + new interval (using Calendar API). Default: false (preserve existing nextReviewDate). Always true when setting interval on a project that has none.'
    )
});

export type SetReviewIntervalInput = z.infer<typeof SetReviewIntervalInputSchema>;

/**
 * Success response schema for set_review_interval tool.
 *
 * Contains per-item results for batch operation.
 */
export const SetReviewIntervalSuccessSchema = z.object({
  success: z.literal(true),
  results: z
    .array(SetReviewIntervalItemResultSchema)
    .describe('Per-project results at original indices'),
  summary: z.object({
    total: z.number().int().min(0).describe('Total projects in request'),
    succeeded: z.number().int().min(0).describe('Projects successfully updated'),
    failed: z.number().int().min(0).describe('Projects that failed')
  })
});

export type SetReviewIntervalSuccess = z.infer<typeof SetReviewIntervalSuccessSchema>;

/**
 * Error response schema for set_review_interval tool.
 *
 * Only returned for catastrophic failures (e.g., OmniFocus unreachable).
 * Individual project failures are reported in SetReviewIntervalSuccess.results.
 */
export const SetReviewIntervalErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type SetReviewIntervalError = z.infer<typeof SetReviewIntervalErrorSchema>;

/**
 * Complete response schema for set_review_interval tool (discriminated union).
 */
export const SetReviewIntervalResponseSchema = z.discriminatedUnion('success', [
  SetReviewIntervalSuccessSchema,
  SetReviewIntervalErrorSchema
]);

export type SetReviewIntervalResponse = z.infer<typeof SetReviewIntervalResponseSchema>;
