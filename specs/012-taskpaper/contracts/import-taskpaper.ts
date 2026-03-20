import { z } from 'zod';
import { CreatedItemSchema, ImportSummarySchema } from './shared/index.js';

export const ImportTaskpaperInputSchema = z.object({
  text: z
    .string()
    .min(1, 'Transport text must not be empty')
    .describe('Transport text string to import into OmniFocus'),
  targetProjectId: z
    .string()
    .optional()
    .describe('Optional project ID to move imported items into after creation')
});

export type ImportTaskpaperInput = z.infer<typeof ImportTaskpaperInputSchema>;

export const ImportTaskpaperSuccessSchema = z.object({
  success: z.literal(true),
  items: z.array(CreatedItemSchema),
  summary: ImportSummarySchema
});

export type ImportTaskpaperSuccess = z.infer<typeof ImportTaskpaperSuccessSchema>;

export const ImportTaskpaperErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type ImportTaskpaperError = z.infer<typeof ImportTaskpaperErrorSchema>;

export const ImportTaskpaperResponseSchema = z.discriminatedUnion('success', [
  ImportTaskpaperSuccessSchema,
  ImportTaskpaperErrorSchema
]);

export type ImportTaskpaperResponse = z.infer<typeof ImportTaskpaperResponseSchema>;
