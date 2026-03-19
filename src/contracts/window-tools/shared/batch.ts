import { z } from 'zod';

/**
 * Item type enum for window UI operations.
 *
 * All 4 OmniFocus item types that can appear in the content tree.
 */
export const WindowItemTypeSchema = z.enum(['task', 'project', 'folder', 'tag']);

export type WindowItemType = z.infer<typeof WindowItemTypeSchema>;

/**
 * Disambiguation candidate for name-based lookups.
 */
export const DisambiguationCandidateSchema = z.object({
  id: z.string().describe('Item ID'),
  name: z.string().describe('Item display name'),
  type: WindowItemTypeSchema.describe('Item type')
});

export type DisambiguationCandidate = z.infer<typeof DisambiguationCandidateSchema>;

/**
 * Per-item result for batch window UI operations.
 *
 * Each result corresponds to the input item at the same array index.
 *
 * **Success Fields**: itemId, itemName, itemType, success=true
 * **Error Fields**: success=false, error message, code, optional candidates
 *
 * **No-op Codes** (success=true): ALREADY_EXPANDED, ALREADY_COLLAPSED, NO_NOTE
 * **Error Codes** (success=false): NOT_FOUND, NODE_NOT_FOUND, DISAMBIGUATION_REQUIRED, INVALID_TYPE
 */
export const WindowBatchItemResultSchema = z.object({
  itemId: z.string().describe('Resolved item ID (or input if lookup failed)'),
  itemName: z.string().describe('Item name (empty string if lookup failed)'),
  itemType: WindowItemTypeSchema.describe('Item type'),
  success: z.boolean().describe('Whether the operation succeeded for this item'),
  error: z.string().optional().describe('Error message (present only when success=false)'),
  code: z
    .enum([
      'NOT_FOUND',
      'NODE_NOT_FOUND',
      'DISAMBIGUATION_REQUIRED',
      'INVALID_TYPE',
      'ALREADY_EXPANDED',
      'ALREADY_COLLAPSED',
      'NO_NOTE'
    ])
    .optional()
    .describe('Status/error code for this item'),
  candidates: z
    .array(DisambiguationCandidateSchema)
    .optional()
    .describe('Matching items when disambiguation required')
});

export type WindowBatchItemResult = z.infer<typeof WindowBatchItemResultSchema>;

/**
 * Summary schema for batch window UI operations.
 *
 * Runtime invariant: total === succeeded + failed
 * (Not expressible in Zod — enforced by implementation)
 */
export const WindowBatchSummarySchema = z.object({
  total: z.number().int().min(0).describe('Total items in request'),
  succeeded: z.number().int().min(0).describe('Items that succeeded'),
  failed: z.number().int().min(0).describe('Items that failed')
});

export type WindowBatchSummary = z.infer<typeof WindowBatchSummarySchema>;
