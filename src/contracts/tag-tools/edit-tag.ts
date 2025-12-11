import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';

/**
 * Input schema for editing a tag.
 *
 * Requires either id or name to identify the tag.
 * Requires at least one update field (newName, status, or allowsNextAction).
 */
export const EditTagInputSchema = z
  .object({
    id: z.string().optional().describe('Tag ID (exact match)'),
    name: z.string().optional().describe('Tag name (for lookup)'),
    newName: z.string().optional().describe('New name for the tag'),
    status: z.enum(['active', 'onHold', 'dropped']).optional().describe('New status for the tag'),
    allowsNextAction: z
      .boolean()
      .optional()
      .describe('Whether tasks with this tag can be next actions')
  })
  .refine((data) => data.id !== undefined || data.name !== undefined, {
    message: 'Must provide either id OR name to identify the tag'
  })
  .refine(
    (data) =>
      data.newName !== undefined ||
      data.status !== undefined ||
      data.allowsNextAction !== undefined,
    {
      message: 'Must provide at least one field to update (newName, status, or allowsNextAction)'
    }
  );

export type EditTagInput = z.infer<typeof EditTagInputSchema>;

/**
 * Success response schema for editing a tag.
 */
export const EditTagSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Tag ID'),
  name: z.string().describe('Tag name (after update)')
});

export type EditTagSuccess = z.infer<typeof EditTagSuccessSchema>;

/**
 * Error response schema for editing a tag.
 */
export const EditTagErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message')
});

export type EditTagError = z.infer<typeof EditTagErrorSchema>;

/**
 * Response schema for editing a tag.
 * Can be success, error, or disambiguation error.
 */
export const EditTagResponseSchema = z.union([
  EditTagSuccessSchema,
  EditTagErrorSchema,
  DisambiguationErrorSchema
]);

export type EditTagResponse = z.infer<typeof EditTagResponseSchema>;
