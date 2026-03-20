import { z } from 'zod';
import { SearchTaskResultSchema } from './shared/search-result.js';

/** Status filter parameter for task search */
export const TaskStatusFilterSchema = z.enum(['active', 'completed', 'dropped', 'all']);

export type TaskStatusFilter = z.infer<typeof TaskStatusFilterSchema>;

export const SearchTasksInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'Search query must be at least 1 character after trimming')
    .max(1000, 'Search query must not exceed 1000 characters')
    .describe('Search string for case-insensitive substring matching'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe('Maximum number of results to return (1-1000, default 50)'),
  status: TaskStatusFilterSchema.default('active').describe(
    'Status filter: "active" (default), "completed", "dropped", or "all"'
  )
});

export type SearchTasksInput = z.infer<typeof SearchTasksInputSchema>;

export const SearchTasksSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(SearchTaskResultSchema),
  totalMatches: z.number().int().min(0).describe('Total matches before limit applied')
});

export type SearchTasksSuccess = z.infer<typeof SearchTasksSuccessSchema>;

export const SearchTasksErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SearchTasksError = z.infer<typeof SearchTasksErrorSchema>;

export const SearchTasksResponseSchema = z.discriminatedUnion('success', [
  SearchTasksSuccessSchema,
  SearchTasksErrorSchema
]);

export type SearchTasksResponse = z.infer<typeof SearchTasksResponseSchema>;
