import { z } from 'zod';
import { SearchTagResultSchema } from './shared/search-result.js';

export const SearchTagsInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'Search query must be at least 1 character after trimming')
    .max(1000, 'Search query must not exceed 1000 characters')
    .describe('Search string for Smart Match relevance matching (Quick Open semantics)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe('Maximum number of results to return (1-1000, default 50)')
});

export type SearchTagsInput = z.infer<typeof SearchTagsInputSchema>;

export const SearchTagsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(SearchTagResultSchema),
  totalMatches: z.number().int().min(0).describe('Total matches before limit applied')
});

export type SearchTagsSuccess = z.infer<typeof SearchTagsSuccessSchema>;

export const SearchTagsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SearchTagsError = z.infer<typeof SearchTagsErrorSchema>;

export const SearchTagsResponseSchema = z.discriminatedUnion('success', [
  SearchTagsSuccessSchema,
  SearchTagsErrorSchema
]);

export type SearchTagsResponse = z.infer<typeof SearchTagsResponseSchema>;
