import { z } from 'zod';

/** Type of item created during import */
export const CreatedItemTypeSchema = z.enum(['task', 'project']);

/** An item created during transport text import */
export const CreatedItemSchema = z.object({
  id: z.string().describe('OmniFocus unique identifier'),
  name: z.string().describe('Item name'),
  type: CreatedItemTypeSchema.describe('Whether item is a task or project')
});

export type CreatedItem = z.infer<typeof CreatedItemSchema>;

/** Summary of import operation */
export const ImportSummarySchema = z.object({
  totalCreated: z.number().int().min(0).describe('Total items created'),
  tasks: z.number().int().min(0).describe('Tasks created'),
  projects: z.number().int().min(0).describe('Projects created'),
  movedToProject: z.boolean().describe('Whether items were moved to a target project')
});

export type ImportSummary = z.infer<typeof ImportSummarySchema>;
