import { z } from 'zod';

/** No input required -- parameterless tool */
export const UndoInputSchema = z.object({});

export type UndoInput = z.infer<typeof UndoInputSchema>;

export const UndoSuccessSchema = z.object({
  success: z.literal(true),
  performed: z.boolean().describe('True if undo was executed, false if stack was empty'),
  canUndo: z.boolean().describe('Post-operation undo availability'),
  canRedo: z.boolean().describe('Post-operation redo availability')
});

export type UndoSuccess = z.infer<typeof UndoSuccessSchema>;

export const UndoErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type UndoError = z.infer<typeof UndoErrorSchema>;

export const UndoResponseSchema = z.discriminatedUnion('success', [
  UndoSuccessSchema,
  UndoErrorSchema
]);

export type UndoResponse = z.infer<typeof UndoResponseSchema>;
