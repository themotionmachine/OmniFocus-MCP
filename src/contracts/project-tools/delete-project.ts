import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';

/**
 * Input schema for delete_project tool.
 *
 * Requires at least one of id or name. If both provided, id takes precedence.
 *
 * ## Cascade Behavior
 *
 * Deleting a project removes ALL child tasks automatically.
 * This is OmniFocus's native behavior and cannot be prevented.
 * The success response includes a message confirming this cascade.
 */
export const DeleteProjectInputSchema = z
  .object({
    id: z.string().min(1).optional().describe('Project ID (takes precedence over name)'),
    name: z.string().min(1).optional().describe('Project name (used if no ID provided)')
  })
  .refine((data) => data.id !== undefined || data.name !== undefined, {
    message: 'At least one of id or name is required'
  });

export type DeleteProjectInput = z.infer<typeof DeleteProjectInputSchema>;

/**
 * Success response schema for delete_project tool.
 */
export const DeleteProjectSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('ID of the deleted project'),
  name: z.string().describe('Name of the deleted project'),
  message: z.string().describe('Confirmation message including cascade info')
});

export type DeleteProjectSuccess = z.infer<typeof DeleteProjectSuccessSchema>;

/**
 * Error response schema for delete_project tool.
 * Includes standard error and disambiguation error.
 */
export const DeleteProjectErrorSchema = z.union([
  z.object({
    success: z.literal(false),
    error: z.string().describe('Error message')
  }),
  DisambiguationErrorSchema
]);

export type DeleteProjectError = z.infer<typeof DeleteProjectErrorSchema>;

/**
 * Complete response schema for delete_project tool.
 *
 * Can return success, standard error, or disambiguation error.
 */
export const DeleteProjectResponseSchema = z.union([
  DeleteProjectSuccessSchema,
  DeleteProjectErrorSchema
]);

export type DeleteProjectResponse = z.infer<typeof DeleteProjectResponseSchema>;
