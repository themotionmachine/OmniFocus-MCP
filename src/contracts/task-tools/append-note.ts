import { z } from 'zod';
import { DisambiguationErrorSchema } from './shared/disambiguation.js';

/**
 * Input schema for append_note tool.
 *
 * Requires at least one of id or name. If both provided, id takes precedence.
 */
export const AppendNoteInputSchema = z
  .object({
    id: z.string().optional().describe('Task ID (takes precedence over name)'),
    name: z.string().optional().describe('Task name (used if no ID provided)'),
    text: z.string().describe('Text to append to the task note')
  })
  .refine((data) => data.id !== undefined || data.name !== undefined, {
    message: 'At least one of id or name is required'
  });

export type AppendNoteInput = z.infer<typeof AppendNoteInputSchema>;

/**
 * Success response schema for append_note tool.
 */
export const AppendNoteSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Task ID'),
  name: z.string().describe('Task name')
});

export type AppendNoteSuccess = z.infer<typeof AppendNoteSuccessSchema>;

/**
 * Standard error response schema for append_note tool.
 */
export const AppendNoteErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type AppendNoteError = z.infer<typeof AppendNoteErrorSchema>;

/**
 * Complete response schema for append_note tool.
 *
 * Can return success, standard error, or disambiguation error.
 */
export const AppendNoteResponseSchema = z.union([
  AppendNoteSuccessSchema,
  DisambiguationErrorSchema,
  AppendNoteErrorSchema
]);

export type AppendNoteResponse = z.infer<typeof AppendNoteResponseSchema>;
