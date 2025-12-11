import { z } from 'zod';
import { TagSchema } from './shared/tag.js';

/**
 * Input schema for list_tags tool.
 * Supports filtering by status, parent tag, and hierarchy inclusion.
 */
export const ListTagsInputSchema = z.object({
  status: z.enum(['active', 'onHold', 'dropped']).optional().describe('Filter by tag status'),
  parentId: z.string().optional().describe('Filter to children of this tag ID'),
  includeChildren: z.boolean().default(true).describe('Include nested tags recursively')
});

export type ListTagsInput = z.infer<typeof ListTagsInputSchema>;

/**
 * Success response schema for list_tags tool.
 */
export const ListTagsSuccessSchema = z.object({
  success: z.literal(true),
  tags: z.array(TagSchema)
});

export type ListTagsSuccess = z.infer<typeof ListTagsSuccessSchema>;

/**
 * Error response schema for list_tags tool.
 */
export const ListTagsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type ListTagsError = z.infer<typeof ListTagsErrorSchema>;

/**
 * Complete response schema for list_tags tool (discriminated union).
 */
export const ListTagsResponseSchema = z.discriminatedUnion('success', [
  ListTagsSuccessSchema,
  ListTagsErrorSchema
]);

export type ListTagsResponse = z.infer<typeof ListTagsResponseSchema>;
