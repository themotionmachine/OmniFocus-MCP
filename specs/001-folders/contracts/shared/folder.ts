/**
 * Folder Entity Schema - Shared Zod Contract
 *
 * Represents a folder in the OmniFocus database hierarchy.
 * This schema is used by list_folders responses and can be reused
 * by any tool that needs to return folder entity data.
 *
 * @see data-model.md Entity Definitions for complete specification
 * @see spec.md FR-002 for response field requirements
 *
 * Zod version: 4.1.x
 */

import { z } from 'zod';

/**
 * Folder entity schema matching data-model.md Folder definition.
 *
 * **Field Sources (Omni Automation)**:
 * | Field    | Source                           |
 * |----------|----------------------------------|
 * | id       | `folder.id.primaryKey`           |
 * | name     | `folder.name`                    |
 * | status   | `folder.status` (enum mapping)   |
 * | parentId | `folder.parent?.id.primaryKey`   |
 *
 * **Excluded Properties**:
 * The following Omni Automation properties are intentionally NOT included:
 * - `effectiveActive`: Computed from ancestor chain, not a stored property
 * - `creationDate`/`modificationDate`: Not exposed by Folder class
 * - `children`/`sections`: Use list_folders with parentId filter instead
 * - `projects`: Out of scope for folder tools
 *
 * @see spec.md clarification #6 for field selection rationale
 * @see spec.md clarification #7 for effectiveActive exclusion
 */
export const FolderSchema = z.object({
  id: z.string().describe("Folder's unique identifier (Omni Automation primaryKey)"),
  name: z.string().describe("Folder's display name"),
  status: z
    .enum(['active', 'dropped'])
    .describe("Folder's current status: 'active' (visible) or 'dropped' (archived)"),
  parentId: z
    .string()
    .nullable()
    .describe('Parent folder ID (null for root-level folders in library)')
});

export type Folder = z.infer<typeof FolderSchema>;
