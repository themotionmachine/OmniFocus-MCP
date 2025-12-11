import { z } from 'zod';

export const BatchItemResultSchema = z.object({
  taskId: z.string().describe('The resolved task ID (original input if lookup failed)'),
  taskName: z.string().describe('The task name (empty string if lookup failed)'),
  success: z.boolean().describe('Whether the operation succeeded for this task'),
  error: z.string().optional().describe('Error message (present only when success=false)'),
  code: z.string().optional().describe('Error code for disambiguation: "DISAMBIGUATION_REQUIRED"'),
  matchingIds: z
    .array(z.string())
    .optional()
    .describe('Matching IDs when disambiguation required (task or tag IDs)')
});

export type BatchItemResult = z.infer<typeof BatchItemResultSchema>;
