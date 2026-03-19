import { z } from 'zod';
import {
  BulkBatchItemResultSchema,
  ItemIdentifierSchema,
  SectionPositionSchema,
  SummarySchema
} from './shared/index.js';

/**
 * Input schema for duplicate_sections tool.
 *
 * Duplicates sections to a new location. Each section is duplicated independently.
 *
 * Copies preserve: name, settings, child projects, tasks, review intervals,
 * repetition rules (for projects).
 * Response includes new IDs of created items (FR-017).
 */
export const DuplicateSectionsInputSchema = z.object({
  items: z
    .array(ItemIdentifierSchema)
    .min(1)
    .max(100)
    .describe('Sections to duplicate (1-100). Folders and/or projects. Each must have id or name.'),
  position: SectionPositionSchema.describe(
    'Target location and placement. Sections can only target folders or library root.'
  )
});

export type DuplicateSectionsInput = z.infer<typeof DuplicateSectionsInputSchema>;

/**
 * Success response for duplicate_sections.
 * Per-item results include newId and newName for each duplicate.
 */
export const DuplicateSectionsSuccessSchema = z.object({
  success: z.literal(true),
  results: z
    .array(BulkBatchItemResultSchema)
    .describe('Per-item results at original indices. Successful items include newId and newName.'),
  summary: SummarySchema
});

export type DuplicateSectionsSuccess = z.infer<typeof DuplicateSectionsSuccessSchema>;

/**
 * Error response for duplicate_sections.
 */
export const DuplicateSectionsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Error code: TARGET_NOT_FOUND, VALIDATION_ERROR')
});

export type DuplicateSectionsError = z.infer<typeof DuplicateSectionsErrorSchema>;

export const DuplicateSectionsResponseSchema = z.discriminatedUnion('success', [
  DuplicateSectionsSuccessSchema,
  DuplicateSectionsErrorSchema
]);

export type DuplicateSectionsResponse = z.infer<typeof DuplicateSectionsResponseSchema>;
