import { z } from 'zod';

// --- Input ---

export const AddLinkedFileInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID'),
  url: z.string().min(1).startsWith('file://').describe('file:// URL string for the linked file')
});
export type AddLinkedFileInput = z.infer<typeof AddLinkedFileInputSchema>;

// --- Success ---

export const AddLinkedFileSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Resolved task ID (even for project inputs)'),
  name: z.string().describe('Task or project name'),
  linkedFileCount: z.number().int().min(1).describe('Total linked file count after addition')
});
export type AddLinkedFileSuccess = z.infer<typeof AddLinkedFileSuccessSchema>;

// --- Error ---

export const AddLinkedFileErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});
export type AddLinkedFileError = z.infer<typeof AddLinkedFileErrorSchema>;

// --- Response ---

export const AddLinkedFileResponseSchema = z.discriminatedUnion('success', [
  AddLinkedFileSuccessSchema,
  AddLinkedFileErrorSchema
]);
export type AddLinkedFileResponse = z.infer<typeof AddLinkedFileResponseSchema>;
