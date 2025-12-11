import { z } from 'zod';
import { TaskStatusSchema, TaskSummarySchema } from './shared/task.js';

/**
 * Input schema for list_tasks tool.
 *
 * Supports comprehensive filtering by container, tags, status, and dates.
 *
 * ## Filter Combination Logic
 *
 * All filters combine using **AND logic** (intersection). A task must satisfy
 * ALL provided filters to be included in results.
 *
 * ## Key Behaviors
 *
 * - **No filters**: Returns all tasks (subject to includeCompleted default)
 * - **Empty arrays** (tagIds: [], status: []): Treated as "no filter"
 * - **Null dates**: Tasks with null dates are EXCLUDED by date filters
 * - **Date boundaries**: All date filters use inclusive boundaries (>=, <=)
 * - **ID vs Name**: ID parameters take precedence if both provided
 * - **Version check**: plannedBefore/After ignored on OmniFocus < v4.7
 */
export const ListTasksInputSchema = z.object({
  // Container filters (ID takes precedence over Name if both provided)
  projectId: z
    .string()
    .optional()
    .describe('Filter by project ID (takes precedence over projectName)'),
  projectName: z.string().optional().describe('Filter by project name (exact match)'),
  folderId: z
    .string()
    .optional()
    .describe('Filter by folder ID (includes all nested projects recursively)'),
  folderName: z
    .string()
    .optional()
    .describe('Filter by folder name (exact match, includes nested projects)'),

  // Tag filters (combined into single filter set)
  tagIds: z.array(z.string()).optional().describe('Filter by tag IDs (empty array = no filter)'),
  tagNames: z
    .array(z.string())
    .optional()
    .describe('Filter by tag names (empty array = no filter)'),
  tagFilterMode: z
    .enum(['any', 'all'])
    .default('any')
    .describe('Tag filter logic: "any" (OR - has ANY tag, default) or "all" (AND - has ALL tags)'),

  // Status filters
  status: z
    .array(TaskStatusSchema)
    .optional()
    .describe(
      'Filter by status values (OR logic, empty array = no filter). Case-sensitive: Available, Blocked, Completed, Dropped, DueSoon, Next, Overdue'
    ),
  flagged: z
    .boolean()
    .optional()
    .describe('Filter by flagged status (true = flagged only, false = unflagged only)'),
  includeCompleted: z
    .boolean()
    .default(false)
    .describe('Include completed/dropped tasks (default: false excludes Completed AND Dropped)'),

  // Date filters (ISO 8601, inclusive boundaries, null dates excluded)
  dueBefore: z
    .string()
    .optional()
    .describe('Due date upper bound inclusive (ISO 8601). Tasks with null dueDate excluded.'),
  dueAfter: z
    .string()
    .optional()
    .describe('Due date lower bound inclusive (ISO 8601). Tasks with null dueDate excluded.'),
  deferBefore: z
    .string()
    .optional()
    .describe('Defer date upper bound inclusive (ISO 8601). Tasks with null deferDate excluded.'),
  deferAfter: z
    .string()
    .optional()
    .describe('Defer date lower bound inclusive (ISO 8601). Tasks with null deferDate excluded.'),
  plannedBefore: z
    .string()
    .optional()
    .describe(
      'Planned date upper bound inclusive (ISO 8601, v4.7+). Ignored on older versions. Tasks with null plannedDate excluded.'
    ),
  plannedAfter: z
    .string()
    .optional()
    .describe(
      'Planned date lower bound inclusive (ISO 8601, v4.7+). Ignored on older versions. Tasks with null plannedDate excluded.'
    ),
  completedBefore: z
    .string()
    .optional()
    .describe(
      'Completion date upper bound inclusive (ISO 8601). Requires includeCompleted: true to return results.'
    ),
  completedAfter: z
    .string()
    .optional()
    .describe(
      'Completion date lower bound inclusive (ISO 8601). Requires includeCompleted: true to return results.'
    ),

  // Result options
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .describe('Max results (default: 100, max: 1000). Applied post-filter. Values > 1000 clamped.'),
  flatten: z
    .boolean()
    .default(true)
    .describe('Return flat list (true) or nested hierarchy (false). Limit applies to total tasks.')
});

export type ListTasksInput = z.infer<typeof ListTasksInputSchema>;

/**
 * Success response schema for list_tasks tool.
 */
export const ListTasksSuccessSchema = z.object({
  success: z.literal(true),
  tasks: z.array(TaskSummarySchema)
});

export type ListTasksSuccess = z.infer<typeof ListTasksSuccessSchema>;

/**
 * Error response schema for list_tasks tool.
 */
export const ListTasksErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type ListTasksError = z.infer<typeof ListTasksErrorSchema>;

/**
 * Complete response schema for list_tasks tool (discriminated union).
 */
export const ListTasksResponseSchema = z.discriminatedUnion('success', [
  ListTasksSuccessSchema,
  ListTasksErrorSchema
]);

export type ListTasksResponse = z.infer<typeof ListTasksResponseSchema>;
