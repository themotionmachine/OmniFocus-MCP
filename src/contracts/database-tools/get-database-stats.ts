import { z } from 'zod';

/** No input required -- parameterless tool */
export const GetDatabaseStatsInputSchema = z.object({});

export type GetDatabaseStatsInput = z.infer<typeof GetDatabaseStatsInputSchema>;

export const TaskStatsSchema = z.object({
  available: z.number().int().min(0).describe('Available + DueSoon + Next + Overdue tasks'),
  blocked: z.number().int().min(0).describe('Blocked tasks'),
  completed: z.number().int().min(0).describe('Completed tasks'),
  dropped: z.number().int().min(0).describe('Dropped tasks'),
  total: z.number().int().min(0).describe('Sum of all task categories')
});

export type TaskStats = z.infer<typeof TaskStatsSchema>;

export const ProjectStatsSchema = z.object({
  active: z.number().int().min(0).describe('Active projects'),
  onHold: z.number().int().min(0).describe('On Hold projects'),
  completed: z.number().int().min(0).describe('Completed (Done) projects'),
  dropped: z.number().int().min(0).describe('Dropped projects'),
  total: z.number().int().min(0).describe('Sum of all project categories')
});

export type ProjectStats = z.infer<typeof ProjectStatsSchema>;

export const GetDatabaseStatsSuccessSchema = z.object({
  success: z.literal(true),
  tasks: TaskStatsSchema,
  projects: ProjectStatsSchema,
  folders: z.number().int().min(0).describe('Total folder count'),
  tags: z.number().int().min(0).describe('Total tag count'),
  inbox: z.number().int().min(0).describe('Number of items in inbox')
});

export type GetDatabaseStatsSuccess = z.infer<typeof GetDatabaseStatsSuccessSchema>;

export const GetDatabaseStatsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type GetDatabaseStatsError = z.infer<typeof GetDatabaseStatsErrorSchema>;

export const GetDatabaseStatsResponseSchema = z.discriminatedUnion('success', [
  GetDatabaseStatsSuccessSchema,
  GetDatabaseStatsErrorSchema
]);

export type GetDatabaseStatsResponse = z.infer<typeof GetDatabaseStatsResponseSchema>;
