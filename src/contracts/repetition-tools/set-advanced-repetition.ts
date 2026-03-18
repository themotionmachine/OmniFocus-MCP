import { z } from 'zod';
import { AnchorDateKeySchema, ScheduleTypeSchema } from './shared/index.js';

// --- Input ---

export const SetAdvancedRepetitionInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID'),
  ruleString: z
    .string()
    .min(1)
    .optional()
    .describe('ICS RRULE format — optional if task has existing rule'),
  scheduleType: ScheduleTypeSchema.optional().describe('Regularly, FromCompletion, or None'),
  anchorDateKey: AnchorDateKeySchema.optional().describe('DueDate, DeferDate, or PlannedDate'),
  catchUpAutomatically: z.boolean().optional().describe('Auto-skip past occurrences')
});

export type SetAdvancedRepetitionInput = z.infer<typeof SetAdvancedRepetitionInputSchema>;

// --- Success ---

export const SetAdvancedRepetitionSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string(),
  name: z.string(),
  ruleString: z.string()
});

export type SetAdvancedRepetitionSuccess = z.infer<typeof SetAdvancedRepetitionSuccessSchema>;

// --- Error ---

export const SetAdvancedRepetitionErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SetAdvancedRepetitionError = z.infer<typeof SetAdvancedRepetitionErrorSchema>;

// --- Response ---

export const SetAdvancedRepetitionResponseSchema = z.discriminatedUnion('success', [
  SetAdvancedRepetitionSuccessSchema,
  SetAdvancedRepetitionErrorSchema
]);

export type SetAdvancedRepetitionResponse = z.infer<typeof SetAdvancedRepetitionResponseSchema>;
