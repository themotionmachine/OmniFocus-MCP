import { z } from 'zod';

/** Status filter for export (mirrors TaskStatusFilterSchema pattern from search-tasks) */
export const TaskpaperStatusFilterSchema = z.enum(['active', 'completed', 'dropped', 'all']);

export type TaskpaperStatusFilter = z.infer<typeof TaskpaperStatusFilterSchema>;

/** Summary of export operation */
export const ExportSummarySchema = z.object({
  totalItems: z.number().int().min(0).describe('Total items exported'),
  tasks: z.number().int().min(0).describe('Tasks exported'),
  projects: z.number().int().min(0).describe('Projects exported'),
  maxDepth: z.number().int().min(0).describe('Maximum nesting depth in output')
});

export type ExportSummary = z.infer<typeof ExportSummarySchema>;
