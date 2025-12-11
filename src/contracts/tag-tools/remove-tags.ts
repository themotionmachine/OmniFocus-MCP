import { z } from 'zod';
import { BatchItemResultSchema } from './shared/batch-result.js';

export const RemoveTagsInputSchema = z
  .object({
    taskIds: z
      .array(z.string())
      .min(1, 'At least one task ID is required')
      .describe('Array of task IDs to remove tags from'),
    tagIds: z
      .array(z.string())
      .min(1, 'Tag IDs array cannot be empty when provided')
      .optional()
      .describe('Array of tag IDs to remove (optional if clearAll is true)'),
    clearAll: z
      .boolean()
      .default(false)
      .describe('If true, remove all tags from the specified tasks (default: false)')
  })
  .refine(
    (data) => {
      // Must provide either clearAll=true OR tagIds (but not both)
      const hasClearAll = data.clearAll === true;
      const hasTagIds = data.tagIds !== undefined && data.tagIds.length > 0;
      return hasClearAll || hasTagIds;
    },
    {
      message: 'Must specify either clearAll=true or provide tagIds array'
    }
  )
  .refine(
    (data) => {
      // Cannot have both clearAll=true AND tagIds
      const hasClearAll = data.clearAll === true;
      const hasTagIds = data.tagIds !== undefined && data.tagIds.length > 0;
      return !(hasClearAll && hasTagIds);
    },
    {
      message: 'Cannot specify both clearAll=true and tagIds array - choose one'
    }
  );

export type RemoveTagsInput = z.infer<typeof RemoveTagsInputSchema>;

export const RemoveTagsSuccessSchema = z.object({
  success: z.literal(true),
  results: z
    .array(BatchItemResultSchema)
    .describe('Results for each task (per-item success/failure)')
});

export type RemoveTagsSuccess = z.infer<typeof RemoveTagsSuccessSchema>;

export const RemoveTagsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message'),
  code: z.string().optional().describe('Error code (e.g., "DISAMBIGUATION_REQUIRED")'),
  matchingIds: z
    .array(z.string())
    .optional()
    .describe('Matching tag IDs when disambiguation is required')
});

export type RemoveTagsError = z.infer<typeof RemoveTagsErrorSchema>;

export const RemoveTagsResponseSchema = z.discriminatedUnion('success', [
  RemoveTagsSuccessSchema,
  RemoveTagsErrorSchema
]);

export type RemoveTagsResponse = z.infer<typeof RemoveTagsResponseSchema>;
