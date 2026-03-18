import { z } from 'zod';

// --- Input ---

export const SetRepetitionInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID'),
  ruleString: z
    .string()
    .min(1)
    .describe('ICS RRULE format recurrence string (e.g., FREQ=WEEKLY;BYDAY=MO)')
});

export type SetRepetitionInput = z.infer<typeof SetRepetitionInputSchema>;

// --- Success ---

export const SetRepetitionSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string(),
  name: z.string(),
  ruleString: z.string()
});

export type SetRepetitionSuccess = z.infer<typeof SetRepetitionSuccessSchema>;

// --- Error ---

export const SetRepetitionErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SetRepetitionError = z.infer<typeof SetRepetitionErrorSchema>;

// --- Response ---

export const SetRepetitionResponseSchema = z.discriminatedUnion('success', [
  SetRepetitionSuccessSchema,
  SetRepetitionErrorSchema
]);

export type SetRepetitionResponse = z.infer<typeof SetRepetitionResponseSchema>;
