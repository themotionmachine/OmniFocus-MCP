import { z } from 'zod';

export const ClearRepetitionInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID')
});
export type ClearRepetitionInput = z.infer<typeof ClearRepetitionInputSchema>;

export const ClearRepetitionSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string(),
  name: z.string()
});
export type ClearRepetitionSuccess = z.infer<typeof ClearRepetitionSuccessSchema>;

export const ClearRepetitionErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});
export type ClearRepetitionError = z.infer<typeof ClearRepetitionErrorSchema>;

export const ClearRepetitionResponseSchema = z.discriminatedUnion('success', [
  ClearRepetitionSuccessSchema,
  ClearRepetitionErrorSchema
]);
export type ClearRepetitionResponse = z.infer<typeof ClearRepetitionResponseSchema>;
