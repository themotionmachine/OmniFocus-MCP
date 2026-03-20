import { z } from 'zod';
import { ExportSummarySchema, TaskpaperStatusFilterSchema } from './shared/index.js';

export const ExportTaskpaperInputSchema = z
  .object({
    projectId: z.string().optional().describe('Export all tasks within a project'),
    folderId: z.string().optional().describe('Export all projects and tasks within a folder'),
    taskIds: z
      .array(z.string())
      .min(1)
      .max(100)
      .optional()
      .describe('Export specific tasks by ID (1-100)'),
    status: TaskpaperStatusFilterSchema.default('active').describe(
      'Status filter: "active" (default), "completed", "dropped", or "all"'
    )
  })
  .refine(
    (data) => {
      const scopeCount = [data.projectId, data.folderId, data.taskIds].filter(
        (v) => v !== undefined
      ).length;
      return scopeCount === 1;
    },
    {
      message: 'Exactly one export scope must be provided: projectId, folderId, or taskIds'
    }
  );

export type ExportTaskpaperInput = z.infer<typeof ExportTaskpaperInputSchema>;

export const ExportTaskpaperSuccessSchema = z.object({
  success: z.literal(true),
  transportText: z.string().describe('Generated transport text'),
  summary: ExportSummarySchema
});

export type ExportTaskpaperSuccess = z.infer<typeof ExportTaskpaperSuccessSchema>;

export const ExportTaskpaperErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type ExportTaskpaperError = z.infer<typeof ExportTaskpaperErrorSchema>;

export const ExportTaskpaperResponseSchema = z.discriminatedUnion('success', [
  ExportTaskpaperSuccessSchema,
  ExportTaskpaperErrorSchema
]);

export type ExportTaskpaperResponse = z.infer<typeof ExportTaskpaperResponseSchema>;
