/**
 * add_folder - Zod Schema Contract
 *
 * Creates a new folder in the OmniFocus database at a specified position.
 *
 * This tool creates folders only. For other operations:
 * - Use `edit_folder` to modify folder properties (name, status)
 * - Use `move_folder` to change folder position in the hierarchy
 * - Use `remove_folder` to delete folders
 * - Use `list_folders` to query existing folders
 *
 * @see spec.md FR-007 to FR-011a for functional requirements
 * @see data-model.md for Position mapping to Omni Automation
 *
 * Zod version: 4.1.x
 */

import { z } from 'zod';
import { type Position, PositionSchema } from './shared/index.js';

// Re-export for backward compatibility
export { PositionSchema, type Position };

/**
 * Input Schema for add_folder
 *
 * **Disambiguation**:
 * This tool does NOT support disambiguation because it creates new folders
 * rather than looking up existing ones by name. Only tools that accept a `name`
 * parameter for folder identification support disambiguation.
 *
 * **Default Position Behavior**:
 * When the `position` field is omitted, the primitive layer applies the default:
 * `{ placement: "ending" }` which maps to `library.ending` in Omni Automation.
 * This is an implementation-level default, not a Zod schema default, to keep
 * the schema simple and allow explicit override checking in the primitive.
 *
 * **Error Handling**:
 * - Empty name (after trim): `"Folder name is required and must be a non-empty string"`
 * - Invalid relativeTo (not found): `"Invalid relativeTo '[id]': folder not found"`
 * - Invalid relativeTo (wrong parent): `"Invalid relativeTo '[id]': folder is not a sibling in target parent"`
 * - Missing relativeTo for before/after: `"relativeTo is required when placement is 'before' or 'after'"`
 *
 * @see spec.md clarification #17 for trim behavior
 * @see spec.md clarification #11 for invalid relativeTo error format
 * @see data-model.md "Disambiguation Support by Tool" for disambiguation rules
 */
export const AddFolderInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Folder name is required and must be a non-empty string')
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, {
      message: 'Folder name is required and must be a non-empty string'
    })
    .describe(
      'Name for the new folder (required, non-empty after trim). Whitespace is trimmed automatically.'
    ),
  position: PositionSchema.optional().describe(
    'Where to create the folder. Default (implementation-level): { placement: "ending" } (appended to library root). See PositionSchema for null vs undefined semantics.'
  )
});

export type AddFolderInput = z.infer<typeof AddFolderInputSchema>;

// Success Response
export const AddFolderSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe("Created folder's unique identifier (Omni Automation primaryKey)"),
  name: z.string().describe("Created folder's name (after trim)")
});

/**
 * Error Response
 *
 * **Possible Error Scenarios**:
 * - Empty name after trim: `"Folder name is required and must be a non-empty string"`
 * - Invalid relativeTo (not found): `"Invalid relativeTo '[id]': folder not found"`
 * - Invalid relativeTo (wrong parent): `"Invalid relativeTo '[id]': folder is not a sibling in target parent"`
 * - Missing relativeTo for before/after: `"relativeTo is required when placement is 'before' or 'after'"`
 *
 * @see spec.md clarification #9 for standard error format
 * @see spec.md clarification #11 for invalid relativeTo error format
 * @see data-model.md "Standard Error Messages by Scenario" for complete list
 */
export const AddFolderErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message following format standards')
});

// Combined Response
export const AddFolderResponseSchema = z.discriminatedUnion('success', [
  AddFolderSuccessSchema,
  AddFolderErrorSchema
]);

export type AddFolderResponse = z.infer<typeof AddFolderResponseSchema>;
