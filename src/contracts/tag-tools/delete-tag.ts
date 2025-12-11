import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';

/**
 * Input schema for delete_tag tool.
 * Requires either id or name to identify the tag to delete.
 */
export const DeleteTagInputSchema = z
  .object({
    id: z.string().min(1).optional().describe('Tag identifier'),
    name: z.string().min(1).optional().describe('Tag name')
  })
  .refine((data) => data.id || data.name, {
    message: 'Either id or name must be provided'
  });

/**
 * Success response schema for delete_tag tool.
 */
export const DeleteTagSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe("Deleted tag's identifier"),
  name: z.string().describe("Deleted tag's name")
});

/**
 * Error response schema for delete_tag tool.
 * Includes standard error and disambiguation error.
 */
export const DeleteTagErrorSchema = z.union([
  z.object({
    success: z.literal(false),
    error: z.string().describe('Error message')
  }),
  DisambiguationErrorSchema
]);

/**
 * Combined response schema for delete_tag tool.
 */
export const DeleteTagResponseSchema = z.union([DeleteTagSuccessSchema, DeleteTagErrorSchema]);

export type DeleteTagInput = z.infer<typeof DeleteTagInputSchema>;
export type DeleteTagSuccess = z.infer<typeof DeleteTagSuccessSchema>;
export type DeleteTagError = z.infer<typeof DeleteTagErrorSchema>;
export type DeleteTagResponse = z.infer<typeof DeleteTagResponseSchema>;
