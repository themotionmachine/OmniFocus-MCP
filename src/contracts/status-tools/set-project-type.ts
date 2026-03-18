import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/index.js';

/**
 * Input schema for set_project_type tool.
 *
 * Identifies a project by ID (preferred) or name (fallback with disambiguation).
 * Sets the project type, handling mutual exclusion automatically:
 * - 'sequential'     → sequential=true,  containsSingletonActions=false
 * - 'parallel'       → sequential=false, containsSingletonActions=false
 * - 'single-actions' → containsSingletonActions=true, sequential=false
 */
export const SetProjectTypeInputSchema = z
  .object({
    id: z.string().optional().describe('Project ID (preferred — direct lookup)'),
    name: z.string().optional().describe('Project name (fallback — may require disambiguation)'),
    projectType: z
      .enum(['sequential', 'parallel', 'single-actions'])
      .describe('Project type to set')
  })
  .refine((data) => (data.id && data.id.length > 0) || (data.name && data.name.length > 0), {
    message: 'Either id or name must be provided'
  });

/**
 * Success response schema for set_project_type.
 *
 * Returns resolved boolean flags along with project identity and the
 * canonical projectType enum value.
 */
export const SetProjectTypeSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string(),
  name: z.string(),
  projectType: z.enum(['sequential', 'parallel', 'single-actions']),
  sequential: z.boolean(),
  containsSingletonActions: z.boolean()
});

/**
 * Error schema for set_project_type.
 *
 * Union of disambiguation error (multiple name matches) and standard error
 * (not found, OmniJS failure). Disambiguation is checked first to enforce
 * matchingIds min(2) constraint. Standard error uses strict object to reject
 * unexpected extra fields like `code` and `matchingIds`.
 */
export const SetProjectTypeErrorSchema = z.union([
  DisambiguationErrorSchema,
  z.object({ success: z.literal(false), error: z.string() }).strict()
]);

/**
 * Full response schema — discriminated on success field.
 */
export const SetProjectTypeResponseSchema = z.union([
  SetProjectTypeSuccessSchema,
  SetProjectTypeErrorSchema
]);

export type SetProjectTypeInput = z.infer<typeof SetProjectTypeInputSchema>;
export type SetProjectTypeSuccess = z.infer<typeof SetProjectTypeSuccessSchema>;
export type SetProjectTypeError = z.infer<typeof SetProjectTypeErrorSchema>;
export type SetProjectTypeResponse = z.infer<typeof SetProjectTypeResponseSchema>;
