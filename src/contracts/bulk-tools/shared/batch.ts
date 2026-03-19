import { z } from 'zod';

/**
 * Per-item result for bulk operations.
 *
 * Extends the status-tools pattern with `newId`/`newName` for duplicate and convert operations.
 * `itemType` includes 'folder' for section operations.
 *
 * Error Codes:
 * - NOT_FOUND: Item not found
 * - DISAMBIGUATION_REQUIRED: Name matches multiple items (candidates populated)
 * - OPERATION_FAILED: OmniJS exception during operation
 * - TAG_NOT_FOUND: Referenced tag not found (batch_update_tasks)
 * - RELATIVE_TARGET_NOT_FOUND: relativeTo sibling not found
 * - ALREADY_A_PROJECT: Task is already a project root (convert_tasks_to_projects)
 * - VERSION_NOT_SUPPORTED: OmniFocus version too old for feature
 */
export const BulkBatchItemResultSchema = z.object({
  itemId: z.string().describe('Resolved item ID (or input identifier if lookup failed)'),
  itemName: z.string().describe('Item name (empty string if lookup failed)'),
  itemType: z.enum(['task', 'project', 'folder']).describe('Item type'),
  success: z.boolean().describe('Whether the operation succeeded for this item'),
  error: z.string().optional().describe('Error message (present only when success=false)'),
  code: z
    .string()
    .optional()
    .describe(
      'Error/status code: NOT_FOUND, DISAMBIGUATION_REQUIRED, OPERATION_FAILED, TAG_NOT_FOUND, RELATIVE_TARGET_NOT_FOUND, ALREADY_A_PROJECT, VERSION_NOT_SUPPORTED'
    ),
  candidates: z
    .array(
      z.object({ id: z.string(), name: z.string(), type: z.enum(['task', 'project', 'folder']) })
    )
    .optional()
    .describe('Matching items when disambiguation required'),
  newId: z.string().optional().describe('New item ID (duplicate/convert operations only)'),
  newName: z.string().optional().describe('New item name (duplicate/convert operations only)'),
  warning: z
    .string()
    .optional()
    .describe(
      'Non-fatal warning message (e.g., target project is completed/dropped). Present only when success=true but a concern exists.'
    )
});

export type BulkBatchItemResult = z.infer<typeof BulkBatchItemResultSchema>;

/**
 * Summary for bulk batch operations.
 *
 * Runtime invariant: total === succeeded + failed
 * (Not expressible in Zod -- enforced by implementation)
 */
export const SummarySchema = z.object({
  total: z.number().int().min(0).describe('Total items in request'),
  succeeded: z.number().int().min(0).describe('Items that succeeded'),
  failed: z.number().int().min(0).describe('Items that failed')
});

export type Summary = z.infer<typeof SummarySchema>;
