/**
 * move_folder - Zod Schema Contract
 *
 * Moves a folder to a new location in the OmniFocus hierarchy.
 * This tool handles all position and parent changes for folders.
 *
 * This tool relocates folders only. For other operations:
 * - Use `edit_folder` to modify folder properties (name, status) - NOT for hierarchy changes
 * - Use `add_folder` to create new folders
 * - Use `remove_folder` to delete folders
 * - Use `list_folders` to query existing folders
 *
 * **Key Distinction from edit_folder**:
 * `edit_folder` modifies folder properties (name, status).
 * `move_folder` changes folder position/parent in the hierarchy.
 * Parent changes are exclusively handled by `move_folder`.
 *
 * **Circular Move Prevention**:
 * The system prevents moving a folder into its own descendants to avoid
 * creating circular hierarchies. Attempting this returns an error.
 *
 * **Name Lookup Trimming Behavior**:
 * The `name` field used for folder identification does NOT trim whitespace.
 * This is intentional: folder lookups use exact matching per spec clarification #4.
 *
 * @see spec.md FR-021 to FR-026 for functional requirements
 * @see spec.md clarification #13 for edit_folder distinction
 * @see spec.md FR-025 for circular move prevention
 * @see data-model.md for Position mapping to Omni Automation
 *
 * Zod version: 4.1.x
 */

import { z } from 'zod';
import {
  type DisambiguationError,
  DisambiguationSchema,
  type Position,
  PositionSchema
} from './shared/index.js';

// Re-export for backward compatibility
export { PositionSchema, type Position };
export { DisambiguationSchema as MoveFolderDisambiguationSchema };
export type { DisambiguationError as MoveFolderDisambiguationError };

/**
 * Input Schema for move_folder
 *
 * **Identification**:
 * Folders can be identified by `id` (takes precedence) or `name` (fallback).
 * Name matching is case-sensitive (exact match required).
 *
 * **Position Requirement**:
 * Unlike `add_folder`, the `position` field is REQUIRED for move operations.
 * There is no default position - you must specify where to move the folder.
 *
 * **Error Handling**:
 * - Folder not found (by ID): `"Invalid id '[id]': folder not found"`
 * - Folder not found (by name): `"Invalid name '[name]': folder not found"`
 * - Multiple name matches: `"Ambiguous name '[name]': found [count] matches"` with `code: 'DISAMBIGUATION_REQUIRED'`
 * - Invalid relativeTo (not found): `"Invalid relativeTo '[id]': folder not found"`
 * - Invalid relativeTo (wrong parent): `"Invalid relativeTo '[id]': folder is not a sibling in target parent"`
 * - Circular move: `"Cannot move folder '[id]': target is a descendant of source"`
 * - Library root operation: `"Cannot move library: not a valid folder target"`
 * - Missing identifier: `"Either id or name must be provided to identify the folder"`
 *
 * @see spec.md clarification #4 for case-sensitive matching
 * @see spec.md clarification #11 for invalid relativeTo error format
 * @see spec.md clarification #28 for library root operation rejection
 * @see spec.md clarification #34 for disambiguation error format
 * @see data-model.md "Standard Error Messages by Scenario" for complete error list
 */
export const MoveFolderInputSchema = z
  .object({
    // Identification (at least one required)
    id: z.string().optional().describe('Folder ID to move (takes precedence over name)'),
    name: z
      .string()
      .optional()
      .describe(
        'Folder name to find (fallback if no id). Case-sensitive exact match. No trimming applied - must match folder name exactly.'
      ),

    // Position (required for move - no default)
    position: PositionSchema.describe(
      'Target position for the folder. REQUIRED for move operations (unlike add_folder which defaults to library ending). See PositionSchema for null vs undefined semantics.'
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

export type MoveFolderInput = z.infer<typeof MoveFolderInputSchema>;

// Success Response
export const MoveFolderSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe("Moved folder's unique identifier"),
  name: z.string().describe("Moved folder's name")
});

/**
 * Standard Error Response
 *
 * **Possible Error Scenarios**:
 * - Folder not found (by ID): `"Invalid id '[id]': folder not found"`
 * - Folder not found (by name): `"Invalid name '[name]': folder not found"`
 * - Invalid relativeTo (not found): `"Invalid relativeTo '[id]': folder not found"`
 * - Invalid relativeTo (wrong parent): `"Invalid relativeTo '[id]': folder is not a sibling in target parent"`
 * - Circular move: `"Cannot move folder '[id]': target is a descendant of source"`
 * - Library root operation: `"Cannot move library: not a valid folder target"`
 * - Missing identifier: `"Either id or name must be provided to identify the folder"`
 *
 * @see spec.md clarification #9 for standard error format
 * @see spec.md clarification #11 for invalid relativeTo error
 * @see spec.md FR-025 for circular move prevention
 * @see spec.md clarification #28 for library root rejection
 * @see data-model.md "Standard Error Messages by Scenario" for complete error list
 */
export const MoveFolderErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message following format standards')
});

/**
 * Combined Response Schema
 *
 * Uses `z.union()` instead of `z.discriminatedUnion()` because both
 * `MoveFolderErrorSchema` and `DisambiguationSchema` have
 * `success: false`, making discrimination by the `success` field impossible.
 * Consumers should check for the presence of `code: 'DISAMBIGUATION_REQUIRED'`
 * to distinguish between standard errors and disambiguation errors.
 *
 * @see shared/disambiguation.ts for isDisambiguationError() type guard
 */
export const MoveFolderResponseSchema = z.union([
  MoveFolderSuccessSchema,
  DisambiguationSchema,
  MoveFolderErrorSchema
]);

export type MoveFolderResponse = z.infer<typeof MoveFolderResponseSchema>;
