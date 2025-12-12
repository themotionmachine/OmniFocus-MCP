import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';
import { ProjectStatusSchema, ReviewIntervalSchema } from './shared/project.js';

/**
 * Input schema for edit_project tool.
 *
 * Updates an existing project's properties.
 *
 * ## Identification
 *
 * At least one of `id` or `name` is required. If both provided, `id` takes precedence.
 *
 * ## Project Type Auto-Clear (Application Logic, NOT Schema Validation)
 *
 * Setting `sequential: true` auto-clears `containsSingletonActions`.
 * Setting `containsSingletonActions: true` auto-clears `sequential`.
 *
 * **This schema intentionally does NOT have a Zod refinement preventing both=true.**
 * Auto-clear is handled at runtime in the primitive, not by schema validation.
 * Reason: Silent auto-clear is the desired behavior (not validation error).
 *
 * **Precedence**: If both provided as `true`, `containsSingletonActions` wins
 * (last processed). See spec.md §Project Type Mutual Exclusion.
 *
 * **Response**: Auto-clear is silent - success response does NOT mention it occurred.
 *
 * **Setting to false**: Does NOT trigger auto-clear of the other property.
 *
 * **Omitting parameters**: Preserves existing project type. Auto-clear only
 * triggers if setting `true` conflicts with existing state.
 *
 * **Unique to Phase 4**: No similar pattern exists in folders, tags, or tasks.
 *
 * ## Null Values
 *
 * Passing `null` for nullable properties clears them:
 * - `deferDate: null` clears the defer date
 * - `dueDate: null` clears the due date
 * - `reviewInterval: null` removes the review schedule
 */
export const EditProjectInputSchema = z
  .object({
    // Identification (at least one required)
    id: z.string().optional().describe('Project ID (takes precedence over name)'),
    name: z.string().optional().describe('Project name (used if no ID provided)'),

    // Properties to update (all optional)
    newName: z.string().min(1).optional().describe('New project name'),
    note: z.string().optional().describe('Note content (replaces existing)'),
    status: ProjectStatusSchema.optional().describe('Project status'),
    sequential: z
      .boolean()
      .optional()
      .describe('Sequential project (auto-clears containsSingletonActions if true)'),
    containsSingletonActions: z
      .boolean()
      .optional()
      .describe('Single-actions list (auto-clears sequential if true)'),
    completedByChildren: z.boolean().optional().describe('Auto-complete when last child completes'),
    defaultSingletonActionHolder: z
      .boolean()
      .optional()
      .describe('Receives inbox items on cleanup'),
    flagged: z.boolean().optional().describe('Flagged status'),

    // Dates (ISO 8601, null to clear)
    deferDate: z.string().nullable().optional().describe('Defer date (ISO 8601, null to clear)'),
    dueDate: z.string().nullable().optional().describe('Due date (ISO 8601, null to clear)'),

    // Review
    reviewInterval: ReviewIntervalSchema.nullable()
      .optional()
      .describe('Review schedule (null to clear)'),

    // Timezone
    shouldUseFloatingTimeZone: z.boolean().optional().describe('Use floating timezone (v3.6+)'),

    // Time Estimation
    estimatedMinutes: z
      .number()
      .nullable()
      .optional()
      .describe('Time estimate in minutes (v3.5+ macOS only, null to clear)')
  })
  .refine((data) => data.id !== undefined || data.name !== undefined, {
    message: 'At least one of id or name is required'
  });

export type EditProjectInput = z.infer<typeof EditProjectInputSchema>;

/**
 * Success response schema for edit_project tool.
 */
export const EditProjectSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('ID of the updated project'),
  name: z.string().describe('Current name of the project (may have changed)')
});

export type EditProjectSuccess = z.infer<typeof EditProjectSuccessSchema>;

/**
 * Standard error response schema for edit_project tool.
 */
export const EditProjectErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type EditProjectError = z.infer<typeof EditProjectErrorSchema>;

/**
 * Complete response schema for edit_project tool.
 *
 * Can return success, standard error, or disambiguation error.
 */
export const EditProjectResponseSchema = z.union([
  EditProjectSuccessSchema,
  DisambiguationErrorSchema,
  EditProjectErrorSchema
]);

export type EditProjectResponse = z.infer<typeof EditProjectResponseSchema>;
