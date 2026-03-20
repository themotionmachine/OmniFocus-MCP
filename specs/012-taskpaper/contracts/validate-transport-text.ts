import { z } from 'zod';
import {
  ParsedItemSchema,
  ValidationSummarySchema,
  ValidationWarningSchema
} from './shared/index.js';

export const ValidateTransportTextInputSchema = z.object({
  text: z
    .string()
    .describe('Transport text string to validate (empty/whitespace returns zero-item report)')
});

export type ValidateTransportTextInput = z.infer<typeof ValidateTransportTextInputSchema>;

export const ValidateTransportTextSuccessSchema = z.object({
  success: z.literal(true),
  items: z.array(ParsedItemSchema),
  summary: ValidationSummarySchema,
  warnings: z.array(ValidationWarningSchema)
});

export type ValidateTransportTextSuccess = z.infer<typeof ValidateTransportTextSuccessSchema>;

export const ValidateTransportTextErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type ValidateTransportTextError = z.infer<typeof ValidateTransportTextErrorSchema>;

export const ValidateTransportTextResponseSchema = z.discriminatedUnion('success', [
  ValidateTransportTextSuccessSchema,
  ValidateTransportTextErrorSchema
]);

export type ValidateTransportTextResponse = z.infer<typeof ValidateTransportTextResponseSchema>;
