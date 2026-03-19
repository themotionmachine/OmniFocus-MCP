import { z } from 'zod';
import {
  BulkBatchItemResultSchema,
  ItemIdentifierSchema,
  SectionPositionSchema,
  SummarySchema
} from './shared/index.js';

/**
 * Input schema for move_sections tool.
 *
 * Moves sections to a new location. Each section is moved independently.
 *
 * Section types: folders and projects.
 * Target locations: folders or library root only (not inbox or tasks).
 *
 * Item Resolution:
 * - ID lookup tries Folder.byIdentifier first, then Project.byIdentifier
 * - Name lookup searches both flattenedFolders and flattenedProjects
 */
export const MoveSectionsInputSchema = z.object({
  items: z
    .array(ItemIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Sections to move (1-100). Folders and/or projects. Each must have id or name.'),
  position: SectionPositionSchema.describe(
    'Target location and placement. Sections can only target folders or library root.'
  )
});

export type MoveSectionsInput = z.infer<typeof MoveSectionsInputSchema>;

/**
 * Success response for move_sections.
 */
export const MoveSectionsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(BulkBatchItemResultSchema).describe('Per-item results at original indices'),
  summary: SummarySchema
});

export type MoveSectionsSuccess = z.infer<typeof MoveSectionsSuccessSchema>;

/**
 * Error response for move_sections.
 */
export const MoveSectionsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Error code: TARGET_NOT_FOUND, VALIDATION_ERROR')
});

export type MoveSectionsError = z.infer<typeof MoveSectionsErrorSchema>;

export const MoveSectionsResponseSchema = z.discriminatedUnion('success', [
  MoveSectionsSuccessSchema,
  MoveSectionsErrorSchema
]);

export type MoveSectionsResponse = z.infer<typeof MoveSectionsResponseSchema>;
