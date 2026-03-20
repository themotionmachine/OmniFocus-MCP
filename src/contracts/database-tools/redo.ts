import { z } from 'zod';

/** No input required -- parameterless tool */
export const RedoInputSchema = z.object({});

export type RedoInput = z.infer<typeof RedoInputSchema>;

export const RedoSuccessSchema = z.object({
  success: z.literal(true),
  performed: z.boolean().describe('True if redo was executed, false if stack was empty'),
  canUndo: z.boolean().describe('Post-operation undo availability'),
  canRedo: z.boolean().describe('Post-operation redo availability')
});

export type RedoSuccess = z.infer<typeof RedoSuccessSchema>;

export const RedoErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type RedoError = z.infer<typeof RedoErrorSchema>;

export const RedoResponseSchema = z.discriminatedUnion('success', [
  RedoSuccessSchema,
  RedoErrorSchema
]);

export type RedoResponse = z.infer<typeof RedoResponseSchema>;
