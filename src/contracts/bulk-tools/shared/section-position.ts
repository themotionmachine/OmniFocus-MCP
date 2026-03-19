import { z } from 'zod';

/**
 * Position schema for section operations (move_sections, duplicate_sections).
 *
 * Sections (folders and projects) can only be placed within folders or at the library root.
 *
 * OmniJS Mapping:
 * | Placement + relativeTo               | OmniJS Expression                    |
 * |---------------------------------------|--------------------------------------|
 * | beginning (no relativeTo)             | library.beginning                    |
 * | ending (no relativeTo)                | library.ending                       |
 * | beginning + folder ID                 | folder.beginning                     |
 * | ending + folder ID                    | folder.ending                        |
 * | before + section ID                   | section.before                       |
 * | after + section ID                    | section.after                        |
 */
export const SectionPositionSchema = z
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
        'Folder or section ID. Required for before/after. Optional for beginning/ending (omit for library root).'
      )
  })
  .refine(
    (data) => {
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

export type SectionPosition = z.infer<typeof SectionPositionSchema>;
