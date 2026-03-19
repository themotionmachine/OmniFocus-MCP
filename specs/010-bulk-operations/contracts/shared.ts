/**
 * Shared Schema Contracts for bulk-tools
 *
 * Common schemas reused across all 6 bulk operation tools:
 * move_tasks, duplicate_tasks, batch_update_tasks,
 * convert_tasks_to_projects, move_sections, duplicate_sections
 *
 * Design Decisions:
 * - ItemIdentifierSchema reused from status-tools (domain-agnostic)
 * - BulkBatchItemResultSchema is bulk-tools-specific (has newId/newName for duplicates)
 * - SummarySchema reused from status-tools pattern (identical structure)
 * - TaskPositionSchema is new (supports project, task, inbox targets)
 * - SectionPositionSchema reuses folder-tools PositionSchema
 *
 * Zod version: 4.2.x
 */

import { z } from 'zod';

// --- Item Identifier (same structure as status-tools, owned by bulk-tools) ---

/**
 * Item identifier for bulk operations.
 *
 * Supports identification by ID (preferred) or name (fallback with disambiguation).
 * At least one of `id` or `name` must be a non-empty string.
 */
export const ItemIdentifierSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe('Item ID (preferred -- direct lookup, tries task then project)'),
    name: z.string().optional().describe('Item name (fallback -- may require disambiguation)')
  })
  .refine((data) => (data.id && data.id.length > 0) || (data.name && data.name.length > 0), {
    message: 'Either id or name must be provided'
  });

export type ItemIdentifier = z.infer<typeof ItemIdentifierSchema>;

// --- Batch Item Result ---

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

// --- Summary ---

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

// --- Task Position ---

/**
 * Position schema for task operations (move_tasks, duplicate_tasks).
 *
 * Task positions can target:
 * - A project (by ID or name)
 * - A parent task (by ID or name, for subtask placement)
 * - The inbox
 *
 * Placement controls where within the target:
 * - beginning/ending: At start/end of target
 * - before/after: Relative to a sibling task (requires relativeTo)
 *
 * OmniJS Mapping:
 * | Target + Placement                  | OmniJS Expression                    |
 * |--------------------------------------|--------------------------------------|
 * | project + ending                     | project.ending                       |
 * | project + beginning                  | project.beginning                    |
 * | task + ending                        | task.ending                          |
 * | inbox + ending                       | inbox.ending                         |
 * | before sibling                       | siblingTask.before                   |
 * | after sibling                        | siblingTask.after                    |
 */
export const TaskPositionSchema = z
  .object({
    // Target: exactly one must be specified
    projectId: z.string().optional().describe('Target project ID'),
    projectName: z.string().optional().describe('Target project name'),
    taskId: z.string().optional().describe('Target parent task ID (for subtask placement)'),
    taskName: z.string().optional().describe('Target parent task name (for subtask placement)'),
    inbox: z.literal(true).optional().describe('Target the inbox'),

    // Placement within target
    placement: z
      .enum(['beginning', 'ending', 'before', 'after'])
      .default('ending')
      .describe("Position within target: 'beginning', 'ending' (default), 'before', 'after'"),
    relativeTo: z
      .string()
      .optional()
      .describe(
        'Sibling task ID for before/after placement. Required when placement is before or after.'
      )
  })
  .refine(
    (data) => {
      // At least one target must be specified
      const targets = [
        data.projectId !== undefined,
        data.projectName !== undefined,
        data.taskId !== undefined,
        data.taskName !== undefined,
        data.inbox === true
      ].filter(Boolean).length;
      return targets >= 1;
    },
    {
      message:
        'Exactly one target must be specified: projectId, projectName, taskId, taskName, or inbox'
    }
  )
  .refine(
    (data) => {
      // No more than one target type must be specified
      const targets = [
        data.projectId !== undefined,
        data.projectName !== undefined,
        data.taskId !== undefined,
        data.taskName !== undefined,
        data.inbox === true
      ].filter(Boolean).length;
      return targets <= 1;
    },
    {
      message:
        'Only one target may be specified: projectId, projectName, taskId, taskName, or inbox (not multiple)'
    }
  )
  .refine(
    (data) => {
      // For before/after, relativeTo is required
      if (data.placement === 'before' || data.placement === 'after') {
        return data.relativeTo !== undefined && data.relativeTo.length > 0;
      }
      return true;
    },
    {
      message: "relativeTo is required when placement is 'before' or 'after'",
      path: ['relativeTo']
    }
  );

export type TaskPosition = z.infer<typeof TaskPositionSchema>;

// --- Section Position (reuse folder-tools pattern) ---

/**
 * Position schema for section operations (move_sections, duplicate_sections).
 *
 * Sections (folders and projects) can only be placed within folders or at the library root.
 * This is the same schema shape as folder-tools PositionSchema.
 *
 * OmniJS Mapping:
 * | Placement + relativeTo               | OmniJS Expression                    |
 * |---------------------------------------|--------------------------------------|
 * | beginning (no relativeTo)             | library.beginning                    |
 * | ending (no relativeTo)                | library.ending                       |
 * | beginning + folder ID                 | folder.beginning                     |
 * | ending + folder ID                    | folder.ending                        |
 * | before + section ID                   | section.before                       |
 * | after + section ID                    | section.after                        |
 */
export const SectionPositionSchema = z
  .object({
    placement: z
      .enum(['before', 'after', 'beginning', 'ending'])
      .describe(
        "Position type: 'before'/'after' (relative to sibling), 'beginning'/'ending' (within parent)"
      ),
    relativeTo: z
      .string()
      .optional()
      .describe(
        'Folder or section ID. Required for before/after. Optional for beginning/ending (omit for library root).'
      )
  })
  .refine(
    (data) => {
      if (data.placement === 'before' || data.placement === 'after') {
        return data.relativeTo !== undefined && data.relativeTo.length > 0;
      }
      return true;
    },
    {
      message: "relativeTo is required when placement is 'before' or 'after'",
      path: ['relativeTo']
    }
  );

export type SectionPosition = z.infer<typeof SectionPositionSchema>;

// --- Property Update Set ---

/**
 * Properties to apply uniformly to all tasks in a batch_update_tasks operation.
 *
 * At least one property must be specified (FR-013).
 * Tag removals processed before additions (FR-014).
 * plannedDate/clearPlannedDate require OmniFocus v4.7+ (version-gated at runtime).
 *
 * Mutual Exclusions (enforced by refine):
 * - dueDate vs clearDueDate
 * - deferDate vs clearDeferDate
 * - estimatedMinutes vs clearEstimatedMinutes
 * - plannedDate vs clearPlannedDate
 */
export const PropertyUpdateSetSchema = z
  .object({
    flagged: z.boolean().optional().describe('Set flagged status'),
    dueDate: z.string().optional().describe('Set due date (ISO 8601)'),
    clearDueDate: z.boolean().optional().describe('Clear due date'),
    deferDate: z.string().optional().describe('Set defer date (ISO 8601)'),
    clearDeferDate: z.boolean().optional().describe('Clear defer date'),
    estimatedMinutes: z.number().min(0).optional().describe('Set estimated minutes'),
    clearEstimatedMinutes: z.boolean().optional().describe('Clear estimated minutes'),
    plannedDate: z
      .string()
      .optional()
      .describe('Set planned date (ISO 8601, requires OmniFocus v4.7+)'),
    clearPlannedDate: z
      .boolean()
      .optional()
      .describe('Clear planned date (requires OmniFocus v4.7+)'),
    addTags: z
      .array(z.string())
      .min(1, 'addTags array cannot be empty when provided')
      .optional()
      .describe('Tag names or IDs to add (processed after removals)'),
    removeTags: z
      .array(z.string())
      .min(1, 'removeTags array cannot be empty when provided')
      .optional()
      .describe('Tag names or IDs to remove (processed before additions)'),
    note: z.string().optional().describe('Text to append to existing note')
  })
  .refine(
    (data) => {
      // At least one substantive property must be specified (FR-013).
      // clearX: false is a no-op and does not count as specified.
      // Empty arrays (addTags: [], removeTags: []) are rejected by .min(1) above.
      const hasSubstantive =
        data.flagged !== undefined ||
        data.dueDate !== undefined ||
        data.deferDate !== undefined ||
        data.estimatedMinutes !== undefined ||
        data.plannedDate !== undefined ||
        data.note !== undefined ||
        (data.addTags !== undefined && data.addTags.length > 0) ||
        (data.removeTags !== undefined && data.removeTags.length > 0) ||
        data.clearDueDate === true ||
        data.clearDeferDate === true ||
        data.clearEstimatedMinutes === true ||
        data.clearPlannedDate === true;
      return hasSubstantive;
    },
    { message: 'At least one property must be specified' }
  )
  .refine((data) => !(data.dueDate !== undefined && data.clearDueDate === true), {
    message: 'Cannot specify both dueDate and clearDueDate'
  })
  .refine((data) => !(data.deferDate !== undefined && data.clearDeferDate === true), {
    message: 'Cannot specify both deferDate and clearDeferDate'
  })
  .refine((data) => !(data.estimatedMinutes !== undefined && data.clearEstimatedMinutes === true), {
    message: 'Cannot specify both estimatedMinutes and clearEstimatedMinutes'
  })
  .refine((data) => !(data.plannedDate !== undefined && data.clearPlannedDate === true), {
    message: 'Cannot specify both plannedDate and clearPlannedDate'
  });

export type PropertyUpdateSet = z.infer<typeof PropertyUpdateSetSchema>;
