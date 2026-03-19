import { z } from 'zod';
import { SearchProjectResultSchema } from './shared/search-result.js';

export const SearchProjectsInputSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query must be at least 1 character')
    .describe('Search string for Smart Match relevance matching (Quick Open semantics)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe('Maximum number of results to return (1-1000, default 50)')
});

export type SearchProjectsInput = z.infer<typeof SearchProjectsInputSchema>;

export const SearchProjectsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(SearchProjectResultSchema),
  totalMatches: z.number().int().min(0).describe('Total matches before limit applied')
});

export type SearchProjectsSuccess = z.infer<typeof SearchProjectsSuccessSchema>;

export const SearchProjectsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SearchProjectsError = z.infer<typeof SearchProjectsErrorSchema>;

export const SearchProjectsResponseSchema = z.discriminatedUnion('success', [
  SearchProjectsSuccessSchema,
  SearchProjectsErrorSchema
]);

export type SearchProjectsResponse = z.infer<typeof SearchProjectsResponseSchema>;
