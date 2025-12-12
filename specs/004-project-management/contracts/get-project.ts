import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';
import { ProjectFullSchema } from './shared/project.js';

/**
 * Input schema for get_project tool.
 *
 * Requires at least one of id or name. If both provided, id takes precedence.
 */
export const GetProjectInputSchema = z
  .object({
    id: z.string().optional().describe('Project ID (takes precedence over name)'),
    name: z.string().optional().describe('Project name (used if no ID provided)')
  })
  .refine((data) => data.id !== undefined || data.name !== undefined, {
    message: 'At least one of id or name is required'
  });

export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;

/**
 * Success response schema for get_project tool.
 */
export const GetProjectSuccessSchema = z.object({
  success: z.literal(true),
  project: ProjectFullSchema
});

export type GetProjectSuccess = z.infer<typeof GetProjectSuccessSchema>;

/**
 * Standard error response schema for get_project tool.
 */
export const GetProjectErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type GetProjectError = z.infer<typeof GetProjectErrorSchema>;

/**
 * Complete response schema for get_project tool.
 *
 * Can return success, standard error, or disambiguation error.
 * Uses discriminated union on 'success' field for type narrowing.
 */
export const GetProjectResponseSchema = z.discriminatedUnion('success', [
  GetProjectSuccessSchema,
  DisambiguationErrorSchema,
  GetProjectErrorSchema
]);

export type GetProjectResponse = z.infer<typeof GetProjectResponseSchema>;
