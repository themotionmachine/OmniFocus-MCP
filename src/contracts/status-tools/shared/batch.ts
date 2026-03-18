import { z } from 'zod';

/**
 * Per-item result for batch status operations (mark_complete, mark_incomplete, drop_items).
 *
 * Each result corresponds to the input item at the same array index.
 *
 * **Success Fields**: itemId, itemName, itemType, success=true
 * **Error Fields**: success=false, error message, code, optional candidates for disambiguation
 *
 * **No-op Codes** (success=true): ALREADY_COMPLETED, ALREADY_DROPPED, ALREADY_ACTIVE
 * **Error Codes** (success=false): NOT_FOUND, DISAMBIGUATION_REQUIRED, VERSION_NOT_SUPPORTED
 */
export const StatusBatchItemResultSchema = z.object({
  itemId: z.string().describe('Resolved item ID (or input if lookup failed)'),
  itemName: z.string().describe('Item name (empty string if lookup failed)'),
  itemType: z.enum(['task', 'project']).describe('Item type'),
  success: z.boolean().describe('Whether the operation succeeded for this item'),
  error: z.string().optional().describe('Error message (present only when success=false)'),
  code: z
    .string()
    .optional()
    .describe(
      'Error/status code: NOT_FOUND, DISAMBIGUATION_REQUIRED, VERSION_NOT_SUPPORTED, ALREADY_COMPLETED, ALREADY_DROPPED, ALREADY_ACTIVE'
    ),
  candidates: z
    .array(z.object({ id: z.string(), name: z.string(), type: z.enum(['task', 'project']) }))
    .optional()
    .describe('Matching items when disambiguation required (id + name + type for user selection)')
});

export type StatusBatchItemResult = z.infer<typeof StatusBatchItemResultSchema>;

/**
 * Summary schema for batch status operations.
 *
 * Runtime invariant: total === succeeded + failed
 * (Not expressible in Zod — enforced by implementation)
 */
export const SummarySchema = z.object({
  total: z.number().int().min(0).describe('Total items in request'),
  succeeded: z.number().int().min(0).describe('Items that succeeded'),
  failed: z.number().int().min(0).describe('Items that failed')
});

export type Summary = z.infer<typeof SummarySchema>;
