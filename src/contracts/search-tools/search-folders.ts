import { z } from 'zod';
import { SearchFolderResultSchema } from './shared/search-result.js';

export const SearchFoldersInputSchema = z.object({
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

export type SearchFoldersInput = z.infer<typeof SearchFoldersInputSchema>;

export const SearchFoldersSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(SearchFolderResultSchema),
  totalMatches: z.number().int().min(0).describe('Total matches before limit applied')
});

export type SearchFoldersSuccess = z.infer<typeof SearchFoldersSuccessSchema>;

export const SearchFoldersErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SearchFoldersError = z.infer<typeof SearchFoldersErrorSchema>;

export const SearchFoldersResponseSchema = z.discriminatedUnion('success', [
  SearchFoldersSuccessSchema,
  SearchFoldersErrorSchema
]);

export type SearchFoldersResponse = z.infer<typeof SearchFoldersResponseSchema>;
