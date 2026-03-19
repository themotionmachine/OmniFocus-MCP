import { z } from 'zod';

/**
 * Item identifier schema for window UI operations.
 *
 * Supports identification by ID (preferred) or name (requires disambiguation).
 * At least one of `id` or `name` must be a non-empty string.
 *
 * **Supported Types**: task, project, folder, tag (all 4 types visible in content tree)
 *
 * **ID vs Name Resolution**:
 * - `id` provided: Direct lookup via `Project.byIdentifier(id)`, then `Folder.byIdentifier(id)`,
 *   then `Task.byIdentifier(id)`, then `Tag.byIdentifier(id)` (project/folder first to avoid root task ID collision)
 * - `name` only: Iterate `flattenedProjects`, `flattenedFolders`, `flattenedTasks`, `flattenedTags` comparing `item.name === name` (may return multiple)
 * - Both provided: `id` takes precedence
 *
 * **Disambiguation Handling**:
 * When name lookup returns multiple matches and no `id` is provided:
 * - Batch tools: fail for that item with `code: "DISAMBIGUATION_REQUIRED"` and `candidates` array
 */
export const WindowItemIdentifierSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe('Item ID (preferred — direct lookup, tries project → folder → task → tag)'),
    name: z.string().optional().describe('Item name (fallback — may require disambiguation)')
  })
  .refine((data) => (data.id && data.id.length > 0) || (data.name && data.name.length > 0), {
    message: 'Either id or name must be provided'
  });

export type WindowItemIdentifier = z.infer<typeof WindowItemIdentifierSchema>;
