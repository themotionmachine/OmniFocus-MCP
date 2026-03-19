/**
 * Database Tools Contract Definitions (Design Artifact)
 *
 * These Zod schemas define the contracts for get_database_stats, get_inbox_count,
 * save_database, cleanup_database, undo, and redo tools.
 *
 * During implementation, these will be placed in src/contracts/database-tools/
 * with one file per tool.
 *
 * File mapping:
 *   src/contracts/database-tools/get-database-stats.ts  — Stats I/O
 *   src/contracts/database-tools/get-inbox-count.ts     — Inbox count I/O
 *   src/contracts/database-tools/save-database.ts       — Save I/O
 *   src/contracts/database-tools/cleanup-database.ts    — Cleanup I/O
 *   src/contracts/database-tools/undo.ts                — Undo I/O
 *   src/contracts/database-tools/redo.ts                — Redo I/O
 *   src/contracts/database-tools/index.ts               — Barrel exports
 */

import { z } from 'zod';

// =============================================================================
// get-database-stats.ts
// =============================================================================

/** No input required — parameterless tool */
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

// =============================================================================
// get-inbox-count.ts
// =============================================================================

/** No input required — parameterless tool */
export const GetInboxCountInputSchema = z.object({});

export type GetInboxCountInput = z.infer<typeof GetInboxCountInputSchema>;

export const GetInboxCountSuccessSchema = z.object({
  success: z.literal(true),
  count: z.number().int().min(0).describe('Number of items in inbox')
});

export type GetInboxCountSuccess = z.infer<typeof GetInboxCountSuccessSchema>;

export const GetInboxCountErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type GetInboxCountError = z.infer<typeof GetInboxCountErrorSchema>;

export const GetInboxCountResponseSchema = z.discriminatedUnion('success', [
  GetInboxCountSuccessSchema,
  GetInboxCountErrorSchema
]);

export type GetInboxCountResponse = z.infer<typeof GetInboxCountResponseSchema>;

// =============================================================================
// save-database.ts
// =============================================================================

/** No input required — parameterless tool */
export const SaveDatabaseInputSchema = z.object({});

export type SaveDatabaseInput = z.infer<typeof SaveDatabaseInputSchema>;

export const SaveDatabaseSuccessSchema = z.object({
  success: z.literal(true)
});

export type SaveDatabaseSuccess = z.infer<typeof SaveDatabaseSuccessSchema>;

export const SaveDatabaseErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SaveDatabaseError = z.infer<typeof SaveDatabaseErrorSchema>;

export const SaveDatabaseResponseSchema = z.discriminatedUnion('success', [
  SaveDatabaseSuccessSchema,
  SaveDatabaseErrorSchema
]);

export type SaveDatabaseResponse = z.infer<typeof SaveDatabaseResponseSchema>;

// =============================================================================
// cleanup-database.ts
// =============================================================================

/** No input required — parameterless tool */
export const CleanupDatabaseInputSchema = z.object({});

export type CleanupDatabaseInput = z.infer<typeof CleanupDatabaseInputSchema>;

export const CleanupDatabaseSuccessSchema = z.object({
  success: z.literal(true)
});

export type CleanupDatabaseSuccess = z.infer<typeof CleanupDatabaseSuccessSchema>;

export const CleanupDatabaseErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type CleanupDatabaseError = z.infer<typeof CleanupDatabaseErrorSchema>;

export const CleanupDatabaseResponseSchema = z.discriminatedUnion('success', [
  CleanupDatabaseSuccessSchema,
  CleanupDatabaseErrorSchema
]);

export type CleanupDatabaseResponse = z.infer<typeof CleanupDatabaseResponseSchema>;

// =============================================================================
// undo.ts
// =============================================================================

/** No input required — parameterless tool */
export const UndoInputSchema = z.object({});

export type UndoInput = z.infer<typeof UndoInputSchema>;

export const UndoSuccessSchema = z.object({
  success: z.literal(true),
  performed: z.boolean().describe('True if undo was executed, false if stack was empty'),
  canUndo: z.boolean().describe('Post-operation undo availability'),
  canRedo: z.boolean().describe('Post-operation redo availability')
});

export type UndoSuccess = z.infer<typeof UndoSuccessSchema>;

export const UndoErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type UndoError = z.infer<typeof UndoErrorSchema>;

export const UndoResponseSchema = z.discriminatedUnion('success', [
  UndoSuccessSchema,
  UndoErrorSchema
]);

export type UndoResponse = z.infer<typeof UndoResponseSchema>;

// =============================================================================
// redo.ts
// =============================================================================

/** No input required — parameterless tool */
export const RedoInputSchema = z.object({});

export type RedoInput = z.infer<typeof RedoInputSchema>;

export const RedoSuccessSchema = z.object({
  success: z.literal(true),
  performed: z.boolean().describe('True if redo was executed, false if stack was empty'),
  canUndo: z.boolean().describe('Post-operation undo availability'),
  canRedo: z.boolean().describe('Post-operation redo availability')
});

export type RedoSuccess = z.infer<typeof RedoSuccessSchema>;

export const RedoErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type RedoError = z.infer<typeof RedoErrorSchema>;

export const RedoResponseSchema = z.discriminatedUnion('success', [
  RedoSuccessSchema,
  RedoErrorSchema
]);

export type RedoResponse = z.infer<typeof RedoResponseSchema>;
