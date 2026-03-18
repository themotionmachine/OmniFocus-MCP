import { z } from 'zod';
import { RepetitionRuleDataSchema } from './shared/index.js';

// --- Input ---

export const GetRepetitionInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID')
});

export type GetRepetitionInput = z.infer<typeof GetRepetitionInputSchema>;

// --- Success: rule exists ---

export const GetRepetitionSuccessWithRuleSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Resolved task ID (even for project inputs)'),
  name: z.string().describe('Task or project name'),
  hasRule: z.literal(true),
  rule: RepetitionRuleDataSchema
});

export type GetRepetitionSuccessWithRule = z.infer<typeof GetRepetitionSuccessWithRuleSchema>;

// --- Success: no rule ---

export const GetRepetitionSuccessNoRuleSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Resolved task ID (even for project inputs)'),
  name: z.string().describe('Task or project name'),
  hasRule: z.literal(false),
  rule: z.null()
});

export type GetRepetitionSuccessNoRule = z.infer<typeof GetRepetitionSuccessNoRuleSchema>;

// --- Error ---

export const GetRepetitionErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

export type GetRepetitionError = z.infer<typeof GetRepetitionErrorSchema>;

// --- Response ---
// Uses z.union() because Zod 4.x discriminatedUnion requires unique
// discriminator values, but both success variants share success: true.
// Type narrowing still works via TypeScript control flow on success + hasRule.

export const GetRepetitionResponseSchema = z.union([
  GetRepetitionSuccessWithRuleSchema,
  GetRepetitionSuccessNoRuleSchema,
  GetRepetitionErrorSchema
]);

export type GetRepetitionResponse = z.infer<typeof GetRepetitionResponseSchema>;
