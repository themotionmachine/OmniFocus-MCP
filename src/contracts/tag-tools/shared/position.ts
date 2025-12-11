import { z } from 'zod';

export const TagPositionSchema = z
  .object({
    placement: z
      .enum(['before', 'after', 'beginning', 'ending'])
      .describe('Position relative to reference'),
    relativeTo: z
      .string()
      .optional()
      .describe('Reference tag ID (sibling for before/after, parent for beginning/ending)')
  })
  .refine(
    (data) => {
      // relativeTo REQUIRED for before/after, OPTIONAL for beginning/ending
      if (data.placement === 'before' || data.placement === 'after') {
        return data.relativeTo !== undefined && data.relativeTo.length > 0;
      }
      return true;
    },
    {
      message: "relativeTo is required for 'before' and 'after' placements",
      path: ['relativeTo']
    }
  );

export type TagPosition = z.infer<typeof TagPositionSchema>;
