import { z } from 'zod';
import { AttachmentInfoSchema } from './shared.js';

// --- Input ---

export const RemoveAttachmentInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID'),
  index: z.number().int().min(0).describe('Zero-based index of attachment to remove')
});
export type RemoveAttachmentInput = z.infer<typeof RemoveAttachmentInputSchema>;

// --- Success ---

export const RemoveAttachmentSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Resolved task ID (even for project inputs)'),
  name: z.string().describe('Task or project name'),
  removedFilename: z.string().describe('Filename of the removed attachment'),
  remainingAttachments: z
    .array(AttachmentInfoSchema)
    .describe('Remaining attachments with updated indices')
});
export type RemoveAttachmentSuccess = z.infer<typeof RemoveAttachmentSuccessSchema>;

// --- Error ---

export const RemoveAttachmentErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message including valid index range')
});
export type RemoveAttachmentError = z.infer<typeof RemoveAttachmentErrorSchema>;

// --- Response ---

export const RemoveAttachmentResponseSchema = z.discriminatedUnion('success', [
  RemoveAttachmentSuccessSchema,
  RemoveAttachmentErrorSchema
]);
export type RemoveAttachmentResponse = z.infer<typeof RemoveAttachmentResponseSchema>;
