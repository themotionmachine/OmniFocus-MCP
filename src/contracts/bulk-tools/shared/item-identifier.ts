import { z } from 'zod';

/**
 * Item identifier for bulk operations.
 *
 * Supports identification by ID (preferred) or name (fallback with disambiguation).
 * At least one of `id` or `name` must be a non-empty string.
 */
export const ItemIdentifierSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe('Item ID (preferred -- direct lookup, tries task then project)'),
    name: z.string().optional().describe('Item name (fallback -- may require disambiguation)')
  })
  .refine((data) => (data.id && data.id.length > 0) || (data.name && data.name.length > 0), {
    message: 'Either id or name must be provided'
  });

export type ItemIdentifier = z.infer<typeof ItemIdentifierSchema>;
