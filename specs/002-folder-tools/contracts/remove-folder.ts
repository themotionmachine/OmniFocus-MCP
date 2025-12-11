/**
 * remove_folder - Zod Schema Contract
 *
 * Removes a folder and all its contents from the OmniFocus database.
 * This is a recursive deletion - all nested folders and projects are also removed.
 *
 * **Design Note**: There is no `force` parameter because OmniFocus handles
 * folder removal natively without requiring confirmation. The recursive deletion
 * behavior matches OmniFocus's native Omni Automation API.
 *
 * **Name Lookup Trimming Behavior**:
 * The `name` field used for folder identification does NOT trim whitespace.
 * This is intentional: folder lookups use exact matching per spec clarification #4.
 *
 * For other operations:
 * - Use `add_folder` to create new folders
 * - Use `edit_folder` to modify folder properties (name, status)
 * - Use `move_folder` to change folder position in the hierarchy
 * - Use `list_folders` to query existing folders
 *
 * @see spec.md FR-017 to FR-020 for functional requirements
 * @see spec.md clarification #22 for removal of force parameter
 *
 * Zod version: 4.1.x
 */

import { z } from 'zod';
import { type DisambiguationError, DisambiguationSchema } from './shared/index.js';

// Re-export disambiguation schema for backward compatibility
export { DisambiguationSchema as RemoveFolderDisambiguationSchema };
export type { DisambiguationError as RemoveFolderDisambiguationError };

/**
 * Input Schema for remove_folder
 *
 * **Identification**:
 * Folders can be identified by `id` (takes precedence) or `name` (fallback).
 * Name matching is case-sensitive (exact match required).
 *
 * **Error Handling**:
 * - Folder not found (by ID): `"Invalid id '[id]': folder not found"`
 * - Folder not found (by name): `"Invalid name '[name]': folder not found"`
 * - Multiple name matches: `"Ambiguous name '[name]': found [count] matches"` with `code: 'DISAMBIGUATION_REQUIRED'`
 * - Library root operation: `"Cannot delete library: not a valid folder target"`
 * - Missing identifier: `"Either id or name must be provided to identify the folder"`
 *
 * @see spec.md clarification #4 for case-sensitive matching
 * @see spec.md clarification #28 for library root operation rejection
 * @see spec.md clarification #34 for disambiguation error format
 * @see data-model.md "Standard Error Messages by Scenario" for complete error list
 */
export const RemoveFolderInputSchema = z
  .object({
    id: z.string().optional().describe('Folder ID to remove (takes precedence over name)'),
    name: z
      .string()
      .optional()
      .describe(
        'Folder name to find (fallback if no id). Case-sensitive exact match. No trimming applied - must match folder name exactly.'
      )
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
  );

export type RemoveFolderInput = z.infer<typeof RemoveFolderInputSchema>;

// Success Response
export const RemoveFolderSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe("Removed folder's identifier (captured before deletion)"),
  name: z.string().describe("Removed folder's name (captured before deletion)")
});

/**
 * Standard Error Response
 *
 * **Possible Error Scenarios**:
 * - Folder not found (by ID): `"Invalid id '[id]': folder not found"`
 * - Folder not found (by name): `"Invalid name '[name]': folder not found"`
 * - Library root operation: `"Cannot delete library: not a valid folder target"`
 * - Missing identifier: `"Either id or name must be provided to identify the folder"`
 *
 * @see spec.md clarification #9 for standard error format
 * @see spec.md clarification #28 for library root rejection
 * @see data-model.md "Standard Error Messages by Scenario" for complete error list
 */
export const RemoveFolderErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message following format standards')
});

/**
 * Combined Response Schema
 *
 * Uses `z.union()` instead of `z.discriminatedUnion()` because both
 * `RemoveFolderErrorSchema` and `DisambiguationSchema` have
 * `success: false`, making discrimination by the `success` field impossible.
 * Consumers should check for the presence of `code: 'DISAMBIGUATION_REQUIRED'`
 * to distinguish between standard errors and disambiguation errors.
 *
 * @see shared/disambiguation.ts for isDisambiguationError() type guard
 */
export const RemoveFolderResponseSchema = z.union([
  RemoveFolderSuccessSchema,
  DisambiguationSchema,
  RemoveFolderErrorSchema
]);

export type RemoveFolderResponse = z.infer<typeof RemoveFolderResponseSchema>;
