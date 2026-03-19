import { z } from 'zod';
import { BulkBatchItemResultSchema, ItemIdentifierSchema, SummarySchema } from './shared/index.js';

/**
 * Input schema for convert_tasks_to_projects tool.
 *
 * Converts tasks to projects. Each task is converted independently.
 *
 * Target Folder:
 * - targetFolderId: Place new projects in this folder (takes precedence over targetFolderName)
 * - targetFolderName: Place new projects in this folder (used if no targetFolderId)
 * - Neither specified: Place at library root (default per FR-003)
 * - Both specified: targetFolderId takes precedence
 *
 * Conversion Rules:
 * - Task name becomes project name
 * - Task note becomes project note
 * - Subtasks become project child tasks
 * - Tags and dates transfer where applicable
 * - Original task is consumed (removed)
 * - One-way: no project-to-task conversion (FR-012)
 * - Already-a-project root task returns ALREADY_A_PROJECT error (FR-012)
 */
export const ConvertTasksToProjectsInputSchema = z.object({
  items: z
    .array(ItemIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Tasks to convert to projects (1-100). Each must have id or name.'),
  targetFolderId: z
    .string()
    .optional()
    .describe('Target folder ID for new projects (takes precedence over targetFolderName)'),
  targetFolderName: z
    .string()
    .optional()
    .describe('Target folder name for new projects (used if no targetFolderId)')
});

export type ConvertTasksToProjectsInput = z.infer<typeof ConvertTasksToProjectsInputSchema>;

/**
 * Success response for convert_tasks_to_projects.
 * Per-item results include newId and newName for each new project.
 */
export const ConvertTasksToProjectsSuccessSchema = z.object({
  success: z.literal(true),
  results: z
    .array(BulkBatchItemResultSchema)
    .describe('Per-item results at original indices. Successful items include newId and newName.'),
  summary: SummarySchema
});

export type ConvertTasksToProjectsSuccess = z.infer<typeof ConvertTasksToProjectsSuccessSchema>;

/**
 * Error response for convert_tasks_to_projects.
 */
export const ConvertTasksToProjectsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z
    .string()
    .optional()
    .describe('Error code: TARGET_NOT_FOUND, TARGET_DISAMBIGUATION_REQUIRED, VALIDATION_ERROR')
});

export type ConvertTasksToProjectsError = z.infer<typeof ConvertTasksToProjectsErrorSchema>;

export const ConvertTasksToProjectsResponseSchema = z.discriminatedUnion('success', [
  ConvertTasksToProjectsSuccessSchema,
  ConvertTasksToProjectsErrorSchema
]);

export type ConvertTasksToProjectsResponse = z.infer<typeof ConvertTasksToProjectsResponseSchema>;
