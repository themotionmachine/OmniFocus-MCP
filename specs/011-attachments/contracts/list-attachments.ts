import { z } from 'zod';
import { AttachmentInfoSchema } from './shared.js';

// --- Input ---

export const ListAttachmentsInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID')
});
export type ListAttachmentsInput = z.infer<typeof ListAttachmentsInputSchema>;

// --- Success ---

export const ListAttachmentsSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Resolved task ID (even for project inputs)'),
  name: z.string().describe('Task or project name'),
  attachments: z.array(AttachmentInfoSchema).describe('Array of attachment metadata')
});
export type ListAttachmentsSuccess = z.infer<typeof ListAttachmentsSuccessSchema>;

// --- Error ---

export const ListAttachmentsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});
export type ListAttachmentsError = z.infer<typeof ListAttachmentsErrorSchema>;

// --- Response ---

export const ListAttachmentsResponseSchema = z.discriminatedUnion('success', [
  ListAttachmentsSuccessSchema,
  ListAttachmentsErrorSchema
]);
export type ListAttachmentsResponse = z.infer<typeof ListAttachmentsResponseSchema>;
