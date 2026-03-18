import { z } from 'zod';
import { DayAbbreviationSchema, PresetNameSchema } from './shared/index.js';

// --- Input ---

export const SetCommonRepetitionInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID'),
  preset: PresetNameSchema.describe('Named recurrence preset'),
  days: z
    .array(DayAbbreviationSchema)
    .optional()
    .describe('Day selection for weekly/biweekly presets (e.g., [MO, WE, FR])'),
  dayOfMonth: z
    .number()
    .int()
    .min(1)
    .max(31)
    .optional()
    .describe('Day of month for monthly/quarterly presets (1-31)')
});

export type SetCommonRepetitionInput = z.infer<typeof SetCommonRepetitionInputSchema>;

// --- Success ---

export const SetCommonRepetitionSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Resolved task ID'),
  name: z.string().describe('Task or project name'),
  ruleString: z.string().describe('ICS RRULE string applied to the task')
});

export type SetCommonRepetitionSuccess = z.infer<typeof SetCommonRepetitionSuccessSchema>;

// --- Error ---

export const SetCommonRepetitionErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type SetCommonRepetitionError = z.infer<typeof SetCommonRepetitionErrorSchema>;

// --- Response (discriminated union on success) ---

export const SetCommonRepetitionResponseSchema = z.discriminatedUnion('success', [
  SetCommonRepetitionSuccessSchema,
  SetCommonRepetitionErrorSchema
]);

export type SetCommonRepetitionResponse = z.infer<typeof SetCommonRepetitionResponseSchema>;
