/**
 * list_folders - Zod Schema Contract
 *
 * Lists folders from the OmniFocus database with optional filtering.
 *
 * This tool retrieves folder information without modifying the database.
 * Use `add_folder` to create new folders, `edit_folder` to modify properties,
 * `move_folder` to change hierarchy position, or `remove_folder` to delete.
 *
 * @see spec.md FR-001 to FR-006 for functional requirements
 * @see data-model.md for Folder entity definition
 *
 * Zod version: 4.1.x
 */

import { z } from 'zod';
import { type Folder, FolderSchema } from './shared/index.js';

// Re-export shared Folder schema for backward compatibility
export { FolderSchema, type Folder };

/**
 * Input Schema for list_folders
 *
 * **Behavior Matrix (parentId × includeChildren)**:
 *
 * | parentId  | includeChildren   | Result                                         |
 * |-----------|-------------------|------------------------------------------------|
 * | omitted   | omitted/true      | All folders via `flattenedFolders`             |
 * | omitted   | false             | Top-level only via `database.folders`          |
 * | specified | omitted/true      | Recursive children via `folder.flattenedFolders` |
 * | specified | false             | Immediate children via `folder.folders`        |
 *
 * **parentId Semantics**:
 * Both omitting `parentId` and passing `null` are semantically equivalent and
 * target the library root. This mirrors Omni Automation's behavior where `null`
 * or omitting position creates at library root.
 *
 * **Disambiguation**:
 * This tool does NOT support disambiguation because it filters by `parentId`
 * (an ID), not by name lookup. Only tools that accept a `name` parameter for
 * folder identification support disambiguation.
 *
 * **Error Handling**:
 * - Invalid parentId: `"Invalid parentId '[id]': folder not found"`
 * - Invalid status enum: Zod validation error (e.g., `"status: Invalid enum value"`)
 * - Invalid includeChildren type: Zod validation error (e.g., `"includeChildren: Expected boolean"`)
 *
 * @see spec.md FR-006 for includeChildren behavior
 * @see spec.md clarification #8 for parentId null semantics
 * @see spec.md clarification #19 for invalid parentId error format
 * @see data-model.md "Disambiguation Support by Tool" for disambiguation rules
 */
export const ListFoldersInputSchema = z.object({
  status: z
    .enum(['active', 'dropped'])
    .optional()
    .describe("Filter folders by status ('active' or 'dropped')"),
  parentId: z
    .string()
    .optional()
    .describe(
      'Filter to children of this folder ID. Omit (or pass null) to target library root - returns all folders or top-level only depending on includeChildren.'
    ),
  includeChildren: z
    .boolean()
    .default(true)
    .describe(
      'Include nested folders recursively (default: true). When false, returns only immediate children or top-level folders.'
    )
});

export type ListFoldersInput = z.infer<typeof ListFoldersInputSchema>;

// Success Response
export const ListFoldersSuccessSchema = z.object({
  success: z.literal(true),
  folders: z.array(FolderSchema).describe('Array of folder objects matching the filter criteria')
});

/**
 * Error Response
 *
 * **Possible Error Scenarios**:
 * - Invalid parentId: `"Invalid parentId '[id]': folder not found"`
 * - Zod validation errors: `"[field]: [validation message]"`
 *
 * @see spec.md clarification #9 for standard error format
 * @see spec.md clarification #19 for invalid parentId error format
 * @see data-model.md "Zod Validation Error Handling" for validation error format
 */
export const ListFoldersErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message following format standards')
});

// Combined Response
export const ListFoldersResponseSchema = z.discriminatedUnion('success', [
  ListFoldersSuccessSchema,
  ListFoldersErrorSchema
]);

export type ListFoldersResponse = z.infer<typeof ListFoldersResponseSchema>;
