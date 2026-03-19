import { z } from 'zod';

// --- Input ---

export const AddAttachmentInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID'),
  filename: z
    .string()
    .min(1)
    .max(255)
    .refine((name) => !name.includes('/') && !name.includes('\\') && !name.includes('..'), {
      message: 'Filename cannot contain path separators or directory traversal sequences'
    })
    .describe('Pure basename for the embedded file (e.g., "report.pdf")'),
  data: z
    .string()
    .min(1)
    .transform((val) => val.replace(/\s/g, ''))
    .refine((val) => val.length > 0, {
      message: 'Base64 data cannot be empty after whitespace stripping'
    })
    .refine((val) => val.length <= 69905068, {
      message: 'Base64 data exceeds maximum length of 69,905,068 characters (~50 MB decoded)'
    })
    .describe(
      'Base64-encoded file content (whitespace is stripped before validation; max ~50 MB decoded)'
    )
});
export type AddAttachmentInput = z.infer<typeof AddAttachmentInputSchema>;

// --- Success ---

export const AddAttachmentSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Resolved task ID (even for project inputs)'),
  name: z.string().describe('Task or project name'),
  attachmentCount: z.number().int().min(1).describe('Total attachment count after addition'),
  warning: z
    .string()
    .optional()
    .describe(
      'Present when decoded size exceeds 10 MB. Format: "Attachment size ({size} MB) exceeds 10 MB; may impact OmniFocus Sync performance"'
    )
});
export type AddAttachmentSuccess = z.infer<typeof AddAttachmentSuccessSchema>;

// --- Error ---

/**
 * Error codes for add_attachment:
 * - INVALID_BASE64: data field contains invalid base64 characters after whitespace stripping
 * - SIZE_EXCEEDED: decoded payload exceeds the 50 MB hard limit
 * - NOT_FOUND: provided ID does not match any task or project
 */
export const AddAttachmentErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z
    .enum(['INVALID_BASE64', 'SIZE_EXCEEDED', 'NOT_FOUND'])
    .optional()
    .describe('Error code for programmatic handling of specific failure states')
});
export type AddAttachmentError = z.infer<typeof AddAttachmentErrorSchema>;

// --- Response ---

export const AddAttachmentResponseSchema = z.discriminatedUnion('success', [
  AddAttachmentSuccessSchema,
  AddAttachmentErrorSchema
]);
export type AddAttachmentResponse = z.infer<typeof AddAttachmentResponseSchema>;
