import { z } from 'zod';

// --- Shared output schemas for attachment tools ---

/**
 * FileWrapper.Type enum values from OmniJS.
 * In practice, embedded attachments are always 'File'.
 */
export const FileWrapperTypeSchema = z.enum(['File', 'Directory', 'Link']);
export type FileWrapperType = z.infer<typeof FileWrapperTypeSchema>;

/**
 * Metadata for a single embedded attachment in the list response.
 * Index is the positional identifier used for removal.
 */
export const AttachmentInfoSchema = z.object({
  index: z.number().int().min(0).describe('Zero-based positional index'),
  filename: z.string().describe('Resolved filename (preferredFilename || filename || unnamed)'),
  type: FileWrapperTypeSchema.describe('FileWrapper.Type enum value'),
  size: z.number().int().min(0).describe('Size in bytes from contents.length')
});
export type AttachmentInfo = z.infer<typeof AttachmentInfoSchema>;

/**
 * Metadata for a single linked file reference in the list response.
 */
export const LinkedFileInfoSchema = z.object({
  url: z.string().describe('Full file:// URL from absoluteString'),
  filename: z.string().describe('Filename from lastPathComponent'),
  extension: z.string().describe('File extension from pathExtension')
});
export type LinkedFileInfo = z.infer<typeof LinkedFileInfoSchema>;
