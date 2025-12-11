import { z } from 'zod';
import { BatchItemResultSchema } from './shared/batch-result.js';

export const AssignTagsInputSchema = z.object({
  taskIds: z
    .array(z.string())
    .min(1, 'At least one task ID is required')
    .describe('Array of task IDs or names to assign tags to'),
  tagIds: z
    .array(z.string())
    .min(1, 'At least one tag ID is required')
    .describe('Array of tag IDs or names to assign to the tasks')
});

export const AssignTagsSuccessSchema = z.object({
  success: z.literal(true),
  results: z
    .array(BatchItemResultSchema)
    .min(1, 'At least one result is required')
    .describe('Array of results for each task operation')
});

export const AssignTagsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message describing what went wrong')
});

export const AssignTagsResponseSchema = z.discriminatedUnion('success', [
  AssignTagsSuccessSchema,
  AssignTagsErrorSchema
]);

export type AssignTagsInput = z.infer<typeof AssignTagsInputSchema>;
export type AssignTagsSuccess = z.infer<typeof AssignTagsSuccessSchema>;
export type AssignTagsError = z.infer<typeof AssignTagsErrorSchema>;
export type AssignTagsResponse = z.infer<typeof AssignTagsResponseSchema>;
