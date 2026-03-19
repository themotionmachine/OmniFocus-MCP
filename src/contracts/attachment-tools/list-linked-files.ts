import { z } from 'zod';
import { LinkedFileInfoSchema } from './shared/index.js';

// --- Input ---

export const ListLinkedFilesInputSchema = z.object({
  id: z.string().min(1).describe('Task or project OmniFocus ID')
});
export type ListLinkedFilesInput = z.infer<typeof ListLinkedFilesInputSchema>;

// --- Success ---

export const ListLinkedFilesSuccessSchema = z.object({
  success: z.literal(true),
  id: z.string().describe('Resolved task ID (even for project inputs)'),
  name: z.string().describe('Task or project name'),
  linkedFiles: z.array(LinkedFileInfoSchema).describe('Array of linked file metadata')
});
export type ListLinkedFilesSuccess = z.infer<typeof ListLinkedFilesSuccessSchema>;

// --- Error ---

export const ListLinkedFilesErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});
export type ListLinkedFilesError = z.infer<typeof ListLinkedFilesErrorSchema>;

// --- Response ---

export const ListLinkedFilesResponseSchema = z.discriminatedUnion('success', [
  ListLinkedFilesSuccessSchema,
  ListLinkedFilesErrorSchema
]);
export type ListLinkedFilesResponse = z.infer<typeof ListLinkedFilesResponseSchema>;
