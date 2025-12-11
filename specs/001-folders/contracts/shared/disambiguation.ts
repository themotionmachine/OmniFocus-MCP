/**
 * Disambiguation Error Schema - Shared Zod Contract
 *
 * Returned when a name-based lookup matches multiple folders.
 * This schema is used by edit_folder, remove_folder, and move_folder.
 *
 * Tools that DO NOT support disambiguation:
 * - list_folders: Filters by parentId (an ID), not by name lookup
 * - add_folder: Creates new folders, does not look up existing by name
 *
 * @see spec.md FR-027 for disambiguation requirements
 * @see spec.md clarification #34 for response format
 * @see data-model.md "Disambiguation Support by Tool" for tool matrix
 *
 * Zod version: 4.1.x
 */

import { z } from 'zod';

/**
 * Disambiguation Error Response Schema
 *
 * **When Triggered**:
 * Disambiguation errors are returned when a name-based lookup matches
 * MORE THAN ONE folder (count > 1). A single match proceeds normally;
 * zero matches returns a standard "folder not found" error.
 *
 * **Response Structure**:
 * ```json
 * {
 *   "success": false,
 *   "error": "Ambiguous name 'Archive': found 3 matches",
 *   "code": "DISAMBIGUATION_REQUIRED",
 *   "matchingIds": ["id1", "id2", "id3"]
 * }
 * ```
 *
 * **AI Agent Workflow**:
 * 1. Detect disambiguation via `code: 'DISAMBIGUATION_REQUIRED'`
 * 2. Query folder details using IDs from `matchingIds`
 * 3. Present user with contextual choices
 * 4. Retry operation with selected ID
 *
 * @see spec.md clarification #34 for AI agent workflow
 * @see data-model.md "Disambiguation Error Message Quality" for message format
 */
export const DisambiguationSchema = z.object({
  success: z.literal(false),
  error: z
    .string()
    .describe('Human-readable message: "Ambiguous name \'[name]\': found [count] matches"'),
  code: z.literal('DISAMBIGUATION_REQUIRED'),
  matchingIds: z
    .array(z.string())
    .describe('IDs of all matching folders. Retry with one of these IDs.')
});

export type DisambiguationError = z.infer<typeof DisambiguationSchema>;

/**
 * Type guard to check if an error response is a disambiguation error.
 *
 * @example
 * ```typescript
 * if (isDisambiguationError(response)) {
 *   // response.matchingIds is available
 *   console.log('Multiple matches:', response.matchingIds);
 * }
 * ```
 */
export function isDisambiguationError(response: unknown): response is DisambiguationError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    response.code === 'DISAMBIGUATION_REQUIRED'
  );
}
