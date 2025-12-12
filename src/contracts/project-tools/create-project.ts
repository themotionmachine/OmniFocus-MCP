import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';
import { ProjectStatusSchema, ReviewIntervalSchema } from './shared/project.js';

/**
 * Input schema for create_project tool.
 *
 * Creates a new project with optional container, position, and properties.
 *
 * ## Position Behavior
 *
 * - Default: Project added at 'ending' of target folder (or library root)
 * - `position: 'beginning'`: Project added at start of container
 * - `beforeProject` / `afterProject`: Precise sibling positioning
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
 * **Unique to Phase 4**: No similar pattern exists in folders, tags, or tasks.
 */
export const CreateProjectInputSchema = z.object({
  // Required
  name: z.string().min(1).describe('Project name (required)'),

  // Container
  folderId: z.string().optional().describe('Target folder ID (takes precedence over folderName)'),
  folderName: z.string().optional().describe('Target folder name (used if no folderId)'),

  // Position
  position: z
    .enum(['beginning', 'ending'])
    .default('ending')
    .describe("Position in folder: 'beginning' or 'ending' (default)"),
  beforeProject: z
    .string()
    .optional()
    .describe('Place before this project (ID or name, overrides position)'),
  afterProject: z
    .string()
    .optional()
    .describe('Place after this project (ID or name, overrides position)'),

  // Project Type (mutually exclusive - auto-clear behavior)
  sequential: z
    .boolean()
    .optional()
    .describe('Sequential project (auto-clears containsSingletonActions if true)'),
  containsSingletonActions: z
    .boolean()
    .optional()
    .describe('Single-actions list (auto-clears sequential if true)'),

  // Properties
  note: z.string().optional().describe('Note content'),
  status: ProjectStatusSchema.default('Active').describe("Initial status (default: 'Active')"),
  flagged: z.boolean().optional().describe('Flagged status'),
  completedByChildren: z.boolean().optional().describe('Auto-complete when last child completes'),
  defaultSingletonActionHolder: z.boolean().optional().describe('Receives inbox items on cleanup'),

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
    .describe('Time estimate in minutes (v3.5+ macOS only)')
});

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

/**
 * Success response schema for create_project tool.
 */
export const CreateProjectSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('ID of the created project'),
  name: z.string().describe('Name of the created project')
});

export type CreateProjectSuccess = z.infer<typeof CreateProjectSuccessSchema>;

/**
 * Standard error response schema for create_project tool.
 */
export const CreateProjectErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type CreateProjectError = z.infer<typeof CreateProjectErrorSchema>;

/**
 * Complete response schema for create_project tool.
 *
 * Can return success, standard error, or disambiguation error (for folder/sibling lookup).
 * Uses union (not discriminatedUnion) because DisambiguationErrorSchema and
 * CreateProjectErrorSchema both have success: false, creating duplicate discriminator values.
 */
export const CreateProjectResponseSchema = z.union([
  CreateProjectSuccessSchema,
  DisambiguationErrorSchema,
  CreateProjectErrorSchema
]);

export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;
