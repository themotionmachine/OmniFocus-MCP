import { z } from 'zod';
import { ReviewProjectSummarySchema } from './shared/review-project.js';

/**
 * Input schema for get_projects_for_review tool.
 *
 * Queries projects that are due for periodic GTD review.
 *
 * ## Filter Logic
 *
 * **Default behavior** (no parameters): Returns projects where `nextReviewDate <= today`.
 * This matches OmniFocus's built-in "Review" perspective behavior.
 *
 * All filters combine with AND logic. A project must satisfy ALL specified filters.
 *
 * ## Filter Options
 *
 * - `includeFuture`: When true, also includes projects due within `futureDays`
 * - `futureDays`: Look-ahead window in days (default: 7, only used when includeFuture=true)
 * - `includeAll`: Return all reviewable projects regardless of date (overrides date filters)
 * - `includeInactive`: Include Done/Dropped projects (On Hold is always included)
 * - `folderId/folderName`: Restricts to projects within a specific folder (recursive)
 * - `limit`: Maximum results (default 100, max 1000)
 *
 * ## Project Inclusion Rules
 *
 * A project is included if ALL of these are true:
 * 1. Project has a reviewInterval configured (null reviewInterval = never reviewed)
 * 2. Project has a nextReviewDate (may be null transiently)
 * 3. nextReviewDate meets the date criteria (due, upcoming, or includeAll)
 * 4. Project status passes filter (active by default, or includeInactive)
 * 5. Project matches folder filter (if provided)
 *
 * ## includeAll Precedence
 *
 * When `includeAll=true`:
 * - Date-based filtering is bypassed (includeFuture and futureDays are ignored)
 * - folderId/folderName still applies
 * - includeInactive still applies
 * - reviewInterval=null projects are still excluded
 *
 * ## Edge Cases
 *
 * - **Dropped/Done projects**: Excluded by default; use `includeInactive: true`
 * - **On Hold projects**: Always included (On Hold is a temporary pause, not terminal)
 * - **Projects without reviewInterval**: Always excluded (reviews are disabled)
 * - **Null nextReviewDate with reviewInterval**: Excluded (transient state)
 *
 * ## Performance
 *
 * Server-side OmniJS filtering ensures <500ms response for databases with 500+ projects.
 * All filtering happens in OmniFocus, not post-retrieval.
 */
export const GetProjectsForReviewInputSchema = z.object({
  // Date-based review filters
  includeFuture: z
    .boolean()
    .default(false)
    .describe(
      'Include projects due within futureDays (default: false = only overdue/due today). Ignored when includeAll=true.'
    ),
  futureDays: z
    .number()
    .int()
    .min(1)
    .default(7)
    .describe(
      'Days ahead to include when includeFuture=true (default: 7). Ignored when includeFuture=false. Boundary is inclusive (day N included).'
    ),

  // Scope filters
  includeAll: z
    .boolean()
    .default(false)
    .describe(
      'Return all reviewable projects regardless of review date. Overrides date-based filtering (includeFuture/futureDays ignored). folderId and includeInactive still apply.'
    ),
  includeInactive: z
    .boolean()
    .default(false)
    .describe(
      'Include Done/Dropped projects (default: false = only Active and On Hold). On Hold is always included as it is not considered inactive.'
    ),

  // Container filter (ID takes precedence over Name if both provided)
  folderId: z
    .string()
    .min(1, 'Invalid folderId: cannot be empty string')
    .optional()
    .describe('Filter by folder ID (includes all nested subfolders recursively)'),
  folderName: z
    .string()
    .optional()
    .describe('Filter by folder name (exact match, includes nested subfolders)'),

  // Result options
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .describe('Max results (default: 100, max: 1000). Applied after filtering and sorting.')
});

export type GetProjectsForReviewInput = z.infer<typeof GetProjectsForReviewInputSchema>;

/**
 * Success response schema for get_projects_for_review tool.
 *
 * Returns projects matching the review criteria, sorted by nextReviewDate ascending
 * (most overdue first), then by name alphabetical as secondary sort.
 */
export const GetProjectsForReviewSuccessSchema = z.object({
  success: z.literal(true),
  projects: z.array(ReviewProjectSummarySchema).describe('Projects matching review criteria'),
  totalCount: z
    .number()
    .int()
    .min(0)
    .describe('Total matching projects BEFORE limit applied (enables pagination awareness)'),
  dueCount: z.number().int().min(0).describe('Count of projects overdue or due today'),
  upcomingCount: z
    .number()
    .int()
    .min(0)
    .describe(
      'Count of projects with nextReviewDate > today (only meaningful when includeFuture or includeAll is true)'
    )
});

export type GetProjectsForReviewSuccess = z.infer<typeof GetProjectsForReviewSuccessSchema>;

/**
 * Error response schema for get_projects_for_review tool.
 */
export const GetProjectsForReviewErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Error code: NOT_FOUND (folder lookup failed)')
});

export type GetProjectsForReviewError = z.infer<typeof GetProjectsForReviewErrorSchema>;

/**
 * Complete response schema for get_projects_for_review tool (discriminated union).
 */
export const GetProjectsForReviewResponseSchema = z.discriminatedUnion('success', [
  GetProjectsForReviewSuccessSchema,
  GetProjectsForReviewErrorSchema
]);

export type GetProjectsForReviewResponse = z.infer<typeof GetProjectsForReviewResponseSchema>;
