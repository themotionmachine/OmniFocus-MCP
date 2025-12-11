import { z } from 'zod';
import { TagPositionSchema } from './shared/position.js';

/**
 * Input schema for creating a new tag.
 */
export const CreateTagInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tag name cannot be empty')
    .describe('The name of the tag to create'),
  parentId: z.string().optional().describe('Optional parent tag ID to create a nested tag'),
  position: TagPositionSchema.optional().describe(
    'Optional position for the new tag (relative to siblings or parent)'
  ),
  allowsNextAction: z
    .boolean()
    .default(true)
    .describe('Whether tasks with this tag can be next actions (default: true)')
});

/**
 * Success response schema for create_tag operation.
 */
export const CreateTagSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('The ID of the newly created tag'),
  name: z.string().describe('The name of the newly created tag')
});

/**
 * Error response schema for create_tag operation.
 */
export const CreateTagErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message describing what went wrong')
});

/**
 * Combined response schema for create_tag operation.
 */
export const CreateTagResponseSchema = z.discriminatedUnion('success', [
  CreateTagSuccessSchema,
  CreateTagErrorSchema
]);

export type CreateTagInput = z.infer<typeof CreateTagInputSchema>;
export type CreateTagResponse = z.infer<typeof CreateTagResponseSchema>;
