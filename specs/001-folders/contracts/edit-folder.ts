/**
 * edit_folder - Zod Schema Contract
 *
 * Edits folder properties (name and/or status) using partial update semantics.
 * Only the fields you provide will be modified; omitted fields remain unchanged.
 *
 * This tool modifies folder properties only. For hierarchy changes:
 * - Use `move_folder` to change folder position (parent changes are exclusively handled by move_folder)
 * - Use `add_folder` to create new folders
 * - Use `remove_folder` to delete folders
 * - Use `list_folders` to query existing folders
 *
 * **Update Field Naming Convention**:
 * Fields prefixed with `new*` (e.g., `newName`, `newStatus`) indicate the target value
 * for the update operation, distinguishing them from identification fields.
 *
 * **Name Lookup Trimming Behavior**:
 * The `name` field used for folder identification does NOT trim whitespace.
 * This is intentional: folder lookups use exact matching per spec clarification #4.
 * Only the `newName` update field trims whitespace (matching folder creation behavior).
 *
 * @see spec.md FR-012 to FR-016 for functional requirements
 * @see spec.md clarification #13 for move_folder distinction
 * @see spec.md clarification #31 for new* prefix convention
 *
 * Zod version: 4.1.x
 */

import { z } from 'zod';
import { type DisambiguationError, DisambiguationSchema } from './shared/index.js';

// Re-export disambiguation schema for backward compatibility
export { DisambiguationSchema as EditFolderDisambiguationSchema };
export type { DisambiguationError as EditFolderDisambiguationError };

/**
 * Input Schema for edit_folder
 *
 * **Identification**:
 * Folders can be identified by `id` (takes precedence) or `name` (fallback).
 * Name matching is case-sensitive (exact match required).
 *
 * **Update Semantics**:
 * - Partial updates: Only provided fields are modified
 * - At least one update field (newName or newStatus) is required
 *
 * **Error Handling**:
 * - Folder not found (by ID): `"Invalid id '[id]': folder not found"`
 * - Folder not found (by name): `"Invalid name '[name]': folder not found"`
 * - Multiple name matches: `"Ambiguous name '[name]': found [count] matches"` with `code: 'DISAMBIGUATION_REQUIRED'`
 * - Empty newName (after trim): `"newName must be a non-empty string if provided"`
 * - Missing identifier: `"Either id or name must be provided to identify the folder"`
 * - Missing update field: `"At least one of newName or newStatus must be provided"`
 *
 * @see spec.md clarification #4 for case-sensitive matching
 * @see spec.md clarification #17 for trim behavior
 * @see spec.md clarification #34 for disambiguation error format
 * @see data-model.md "Standard Error Messages by Scenario" for complete error list
 */
export const EditFolderInputSchema = z
  .object({
    // Identification (at least one required)
    id: z.string().optional().describe('Folder ID to edit (takes precedence over name)'),
    name: z
      .string()
      .optional()
      .describe(
        'Folder name to find (fallback if no id). Case-sensitive exact match. No trimming applied - must match folder name exactly.'
      ),

    // Update fields (at least one required)
    // Prefixed with "new" to distinguish from identification fields
    newName: z
      .string()
      .transform((val) => val.trim())
      .refine((val) => val.length > 0, {
        message: 'newName must be a non-empty string if provided'
      })
      .optional()
      .describe(
        'New name for the folder. Whitespace is trimmed automatically. Must be non-empty after trim.'
      ),
    newStatus: z
      .enum(['active', 'dropped'])
      .optional()
      .describe("New status for the folder: 'active' (visible) or 'dropped' (archived)")
  })
  .refine(
    (data) => {
      // At least one identifier required
      return data.id !== undefined || data.name !== undefined;
    },
    {
      message: 'Either id or name must be provided to identify the folder',
      path: ['id']
    }
  )
  .refine(
    (data) => {
      // At least one update field required
      return data.newName !== undefined || data.newStatus !== undefined;
    },
    {
      message: 'At least one of newName or newStatus must be provided',
      path: ['newName']
    }
  );

export type EditFolderInput = z.infer<typeof EditFolderInputSchema>;

// Success Response
export const EditFolderSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe("Edited folder's unique identifier"),
  name: z.string().describe("Edited folder's current name (reflects newName if provided)")
});

/**
 * Standard Error Response
 *
 * **Possible Error Scenarios**:
 * - Folder not found (by ID): `"Invalid id '[id]': folder not found"`
 * - Folder not found (by name): `"Invalid name '[name]': folder not found"`
 * - Empty newName after trim: `"newName must be a non-empty string if provided"`
 * - Missing identifier: `"Either id or name must be provided to identify the folder"`
 * - Missing update field: `"At least one of newName or newStatus must be provided"`
 *
 * @see spec.md clarification #9 for standard error format
 * @see data-model.md "Standard Error Messages by Scenario" for complete error list
 */
export const EditFolderErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message following format standards')
});

/**
 * Combined Response Schema
 *
 * Uses `z.union()` instead of `z.discriminatedUnion()` because both
 * `EditFolderErrorSchema` and `DisambiguationSchema` have
 * `success: false`, making discrimination by the `success` field impossible.
 * Consumers should check for the presence of `code: 'DISAMBIGUATION_REQUIRED'`
 * to distinguish between standard errors and disambiguation errors.
 *
 * @see shared/disambiguation.ts for isDisambiguationError() type guard
 */
export const EditFolderResponseSchema = z.union([
  EditFolderSuccessSchema,
  DisambiguationSchema,
  EditFolderErrorSchema
]);

export type EditFolderResponse = z.infer<typeof EditFolderResponseSchema>;
