import { z } from 'zod';

/**
 * Tag entity schema representing an OmniFocus tag.
 *
 * Tags provide context-based organization for tasks and can be arranged
 * hierarchically. A tag's status determines whether it's active and whether
 * tasks assigned to it can be next actions.
 */
export const TagSchema = z.object({
  id: z.string().describe("Tag's unique identifier"),
  name: z.string().describe("Tag's display name"),
  status: z.enum(['active', 'onHold', 'dropped']).describe("Tag's current status"),
  parentId: z.string().nullable().describe('Parent tag ID (null for root-level)'),
  allowsNextAction: z.boolean().describe('Whether tasks with this tag can be next actions'),
  taskCount: z.number().int().min(0).describe('Number of incomplete tasks assigned this tag')
});

export type Tag = z.infer<typeof TagSchema>;
