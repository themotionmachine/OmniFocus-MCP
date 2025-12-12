import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';

/**
 * Input schema for move_project tool.
 *
 * Moves a project to a different folder or to the library root.
 *
 * ## Target Specification
 *
 * - `targetFolderId` / `targetFolderName`: Move to specific folder
 * - `root: true`: Move to library root (top-level, no folder)
 * - If neither specified, returns validation error
 *
 * ## Position Behavior
 *
 * - Default: Project added at 'ending' of target
 * - `position: 'beginning'`: Project added at start of target
 * - `beforeProject` / `afterProject`: Precise sibling positioning
 */
export const MoveProjectInputSchema = z
  .object({
    // Identification (at least one required)
    id: z.string().optional().describe('Project ID (takes precedence over name)'),
    name: z.string().optional().describe('Project name (used if no ID provided)'),

    // Target (mutually exclusive with root: true)
    targetFolderId: z
      .string()
      .optional()
      .describe('Target folder ID (takes precedence over targetFolderName)'),
    targetFolderName: z
      .string()
      .optional()
      .describe('Target folder name (used if no targetFolderId)'),

    // Root level
    root: z
      .boolean()
      .optional()
      .describe('Move to root level (no folder, mutually exclusive with targetFolder*)'),

    // Position
    position: z
      .enum(['beginning', 'ending'])
      .default('ending')
      .describe("Position in target: 'beginning' or 'ending' (default)"),
    beforeProject: z
      .string()
      .optional()
      .describe('Place before this project (ID or name, overrides position)'),
    afterProject: z
      .string()
      .optional()
      .describe('Place after this project (ID or name, overrides position)')
  })
  .refine((data) => data.id !== undefined || data.name !== undefined, {
    message: 'At least one of id or name is required'
  })
  .refine(
    (data) => {
      // Must specify either target folder OR root
      const hasTargetFolder =
        data.targetFolderId !== undefined || data.targetFolderName !== undefined;
      const hasRoot = data.root === true;
      return hasTargetFolder || hasRoot;
    },
    {
      message: 'Must specify targetFolderId, targetFolderName, or root: true'
    }
  )
  .refine(
    (data) => {
      // Cannot specify both target folder AND root
      const hasTargetFolder =
        data.targetFolderId !== undefined || data.targetFolderName !== undefined;
      const hasRoot = data.root === true;
      return !(hasTargetFolder && hasRoot);
    },
    {
      message: 'Cannot specify both targetFolder and root: true'
    }
  );

export type MoveProjectInput = z.infer<typeof MoveProjectInputSchema>;

/**
 * Success response schema for move_project tool.
 */
export const MoveProjectSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('ID of the moved project'),
  name: z.string().describe('Name of the moved project'),
  parentFolderId: z.string().nullable().describe('New parent folder ID (null if root)'),
  parentFolderName: z.string().nullable().describe('New parent folder name (null if root)')
});

export type MoveProjectSuccess = z.infer<typeof MoveProjectSuccessSchema>;

/**
 * Standard error response schema for move_project tool.
 */
export const MoveProjectErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type MoveProjectError = z.infer<typeof MoveProjectErrorSchema>;

/**
 * Complete response schema for move_project tool.
 *
 * Can return success, standard error, or disambiguation error.
 */
export const MoveProjectResponseSchema = z.union([
  MoveProjectSuccessSchema,
  DisambiguationErrorSchema,
  MoveProjectErrorSchema
]);

export type MoveProjectResponse = z.infer<typeof MoveProjectResponseSchema>;
