import { z } from 'zod';

/**
 * Item identifier schema for status operations.
 *
 * Supports identification by ID (preferred) or name (requires disambiguation).
 * At least one of `id` or `name` must be a non-empty string.
 *
 * **ID vs Name Resolution**:
 * - `id` provided: Direct lookup via `Task.byIdentifier(id)` then `Project.byIdentifier(id)`
 * - `name` only: Search both `flattenedTasks` and `flattenedProjects` (may return multiple)
 * - Both provided: `id` takes precedence
 *
 * **Disambiguation Handling**:
 * When name lookup returns multiple matches and no `id` is provided:
 * - Batch tools: fail for that item with `code: "DISAMBIGUATION_REQUIRED"` and `candidates` array
 * - Single-item tools: return `DisambiguationError` with `matchingIds`
 */
export const ItemIdentifierSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe('Item ID (preferred — direct lookup, tries task then project)'),
    name: z.string().optional().describe('Item name (fallback — may require disambiguation)')
  })
  .refine((data) => (data.id && data.id.length > 0) || (data.name && data.name.length > 0), {
    message: 'Either id or name must be provided'
  });

export type ItemIdentifier = z.infer<typeof ItemIdentifierSchema>;
