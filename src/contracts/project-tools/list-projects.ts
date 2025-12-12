import { z } from 'zod';
import {
  ProjectStatusSchema,
  ProjectSummarySchema,
  ReviewStatusFilterSchema
} from './shared/project.js';

/**
 * Input schema for list_projects tool.
 *
 * Supports comprehensive filtering by folder, status, review status, and dates.
 *
 * ## Filter Combination Logic
 *
 * All filters combine using **AND logic** (intersection). A project must satisfy
 * ALL provided filters to be included in results.
 *
 * ## Key Behaviors
 *
 * - **No filters**: Returns all projects (subject to includeCompleted default)
 * - **Empty arrays** (status: []): Treated as "no filter"
 * - **Null dates**: Projects with null dates are EXCLUDED by date filters
 * - **Date boundaries**: All date filters use inclusive boundaries (>=, <=)
 * - **ID vs Name**: ID parameters take precedence if both provided
 * - **Folder filter**: Includes nested subfolders recursively
 * - **Review filter**: Projects without reviewInterval excluded from 'due'/'upcoming'
 */
export const ListProjectsInputSchema = z.object({
  // Container filter (ID takes precedence over Name if both provided)
  folderId: z
    .string()
    .optional()
    .describe('Filter by folder ID (includes all nested subfolders recursively)'),
  folderName: z
    .string()
    .optional()
    .describe('Filter by folder name (exact match, includes nested subfolders)'),

  // Status filters
  status: z
    .array(ProjectStatusSchema)
    .optional()
    .describe(
      'Filter by status values (OR logic, empty array = no filter). Case-sensitive: Active, OnHold, Done, Dropped'
    ),
  reviewStatus: ReviewStatusFilterSchema.default('any').describe(
    "Filter by review status: 'due' (overdue), 'upcoming' (within 7 days), 'any' (no filter). Projects without reviewInterval excluded from 'due'/'upcoming'."
  ),
  flagged: z
    .boolean()
    .optional()
    .describe('Filter by flagged status (true = flagged only, false = unflagged only)'),
  includeCompleted: z
    .boolean()
    .default(false)
    .describe('Include Done/Dropped projects (default: false excludes Done AND Dropped)'),

  // Date filters (ISO 8601, inclusive boundaries, null dates excluded)
  dueBefore: z
    .string()
    .optional()
    .describe('Due date upper bound inclusive (ISO 8601). Projects with null dueDate excluded.'),
  dueAfter: z
    .string()
    .optional()
    .describe('Due date lower bound inclusive (ISO 8601). Projects with null dueDate excluded.'),
  deferBefore: z
    .string()
    .optional()
    .describe(
      'Defer date upper bound inclusive (ISO 8601). Projects with null deferDate excluded.'
    ),
  deferAfter: z
    .string()
    .optional()
    .describe(
      'Defer date lower bound inclusive (ISO 8601). Projects with null deferDate excluded.'
    ),

  // Result options
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .describe('Max results (default: 100, max: 1000). Applied post-filter. Values > 1000 clamped.')
});

export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

/**
 * Success response schema for list_projects tool.
 */
export const ListProjectsSuccessSchema = z.object({
  success: z.literal(true),
  projects: z.array(ProjectSummarySchema)
});

export type ListProjectsSuccess = z.infer<typeof ListProjectsSuccessSchema>;

/**
 * Error response schema for list_projects tool.
 */
export const ListProjectsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type ListProjectsError = z.infer<typeof ListProjectsErrorSchema>;

/**
 * Complete response schema for list_projects tool (discriminated union).
 */
export const ListProjectsResponseSchema = z.discriminatedUnion('success', [
  ListProjectsSuccessSchema,
  ListProjectsErrorSchema
]);

export type ListProjectsResponse = z.infer<typeof ListProjectsResponseSchema>;
