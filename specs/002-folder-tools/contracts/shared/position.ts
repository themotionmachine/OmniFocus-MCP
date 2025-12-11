/**
 * Position Schema - Shared Zod Contract
 *
 * Specifies insertion location for create/move operations.
 * Maps directly to Omni Automation `Folder.ChildInsertionLocation`.
 *
 * @see spec.md clarification #33 for requirement rules
 * @see data-model.md Position Mapping table for Omni Automation expressions
 *
 * Zod version: 4.1.x
 */

import { z } from 'zod';

/**
 * Position Schema for folder placement operations.
 *
 * **Placement Options**:
 * - `before`: Insert before the folder specified by `relativeTo` (REQUIRED)
 * - `after`: Insert after the folder specified by `relativeTo` (REQUIRED)
 * - `beginning`: Insert at start of parent folder or library root
 * - `ending`: Insert at end of parent folder or library root
 *
 * **relativeTo Semantics**:
 * - For `before`/`after`: REQUIRED - specifies sibling folder ID
 * - For `beginning`/`ending`: OPTIONAL - specifies parent folder ID (omit for library root)
 *
 * **Null vs Undefined for relativeTo**:
 * The `relativeTo` field uses `.optional()` which means it accepts `string | undefined`,
 * NOT `string | null`. This is intentional:
 * - **Omit relativeTo** (undefined): Maps to library root for beginning/ending
 * - **Passing null**: Will cause a Zod validation error (null is not a valid string)
 *
 * To target library root, simply omit the relativeTo field:
 * ```typescript
 * // Correct - library root
 * { placement: "ending" }
 *
 * // Correct - specific parent folder
 * { placement: "ending", relativeTo: "folder-id" }
 *
 * // WRONG - null causes validation error
 * { placement: "ending", relativeTo: null }
 * ```
 *
 * **Empty String Handling**:
 * An empty string for `relativeTo` is treated as missing. For `before`/`after`
 * placements, this triggers: `"relativeTo is required when placement is 'before' or 'after'"`.
 * For `beginning`/`ending`, an empty string would cause an invalid folder lookup error
 * at the OmniJS layer.
 *
 * **Position Mapping to Omni Automation**:
 * | MCP Position                                      | Omni Automation Expression                    |
 * |--------------------------------------------------|----------------------------------------------|
 * | `{ placement: "beginning" }`                      | `library.beginning`                          |
 * | `{ placement: "ending" }`                         | `library.ending`                             |
 * | `{ placement: "beginning", relativeTo: "id" }`    | `Folder.byIdentifier("id").beginning`        |
 * | `{ placement: "ending", relativeTo: "id" }`       | `Folder.byIdentifier("id").ending`           |
 * | `{ placement: "before", relativeTo: "id" }`       | `Folder.byIdentifier("id").before`           |
 * | `{ placement: "after", relativeTo: "id" }`        | `Folder.byIdentifier("id").after`            |
 *
 * **Error Handling**:
 * - Missing `relativeTo` for before/after: `"relativeTo is required when placement is 'before' or 'after'"`
 * - Empty string `relativeTo` for before/after: Same error as missing (treated as not provided)
 * - Invalid `relativeTo` (folder not found): `"Invalid relativeTo '[id]': folder not found"`
 * - Invalid `relativeTo` (wrong parent for before/after): `"Invalid relativeTo '[id]': folder is not a sibling in target parent"`
 *   This error occurs when using `before`/`after` placement and the `relativeTo` folder exists
 *   but is not a sibling within the intended parent folder (e.g., trying to position before a
 *   folder in a different part of the hierarchy).
 *
 * @see spec.md clarification #11 for invalid relativeTo error format
 * @see data-model.md "Standard Error Messages by Scenario" for complete error list
 */
export const PositionSchema = z
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
        'Folder ID to position relative to. REQUIRED for before/after (sibling), OPTIONAL for beginning/ending (parent; omit for library root). Note: null is not accepted - omit the field entirely for library root.'
      )
  })
  .refine(
    (data) => {
      // For before/after, relativeTo is required and must be non-empty
      // Empty string is treated as missing (same validation error)
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

export type Position = z.infer<typeof PositionSchema>;
