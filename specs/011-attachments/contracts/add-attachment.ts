import { z } from 'zod';

// --- Input ---

export const AddAttachmentInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID'),
  filename: z.string().min(1).describe('Filename for the embedded attachment'),
  data: z.string().min(1).describe('Base64-encoded file content')
});
export type AddAttachmentInput = z.infer<typeof AddAttachmentInputSchema>;

// --- Success ---

export const AddAttachmentSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Resolved task ID (even for project inputs)'),
  name: z.string().describe('Task or project name'),
  attachmentCount: z.number().int().min(1).describe('Total attachment count after addition'),
  warning: z.string().optional().describe('Warning for large attachments (>10 MB)')
});
export type AddAttachmentSuccess = z.infer<typeof AddAttachmentSuccessSchema>;

// --- Error ---

export const AddAttachmentErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z.string().optional().describe('Error code (e.g., INVALID_BASE64, SIZE_EXCEEDED)')
});
export type AddAttachmentError = z.infer<typeof AddAttachmentErrorSchema>;

// --- Response ---

export const AddAttachmentResponseSchema = z.discriminatedUnion('success', [
  AddAttachmentSuccessSchema,
  AddAttachmentErrorSchema
]);
export type AddAttachmentResponse = z.infer<typeof AddAttachmentResponseSchema>;
