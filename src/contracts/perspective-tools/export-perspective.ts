import { z } from 'zod';

/**
 * Input schema for export_perspective tool.
 *
 * Exports a custom perspective's configuration. Only custom perspectives
 * can be exported; built-in perspectives return an error.
 *
 * When `saveTo` is provided, the perspective is written as a
 * `.ofocus-perspective` file to the specified directory.
 * When omitted, exportable metadata is returned in the response.
 */
export const ExportPerspectiveInputSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Perspective name cannot be empty')
      .optional()
      .describe('Perspective name (case-insensitive for built-in perspectives)'),
    identifier: z
      .string()
      .min(1, 'Perspective identifier cannot be empty')
      .optional()
      .describe('Perspective identifier (custom perspectives only, takes precedence over name)'),
    saveTo: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Directory path to save the exported .ofocus-perspective file. When omitted, export metadata is returned in the response.'
      )
  })
  .refine((d) => d.name !== undefined || d.identifier !== undefined, {
    message: 'At least one of name or identifier is required'
  });

export type ExportPerspectiveInput = z.infer<typeof ExportPerspectiveInputSchema>;

/**
 * Success response for export_perspective when saveTo is provided.
 */
export const ExportPerspectiveFileSuccessSchema = z.object({
  success: z.literal(true),
  perspectiveName: z.string(),
  perspectiveId: z.string(),
  filePath: z.string().describe('Path to the written .ofocus-perspective file'),
  message: z.string()
});

export type ExportPerspectiveFileSuccess = z.infer<typeof ExportPerspectiveFileSuccessSchema>;

/**
 * Success response for export_perspective when no saveTo (metadata only).
 */
export const ExportPerspectiveMetadataSuccessSchema = z.object({
  success: z.literal(true),
  perspectiveName: z.string(),
  perspectiveId: z.string(),
  fileName: z.string().describe('Preferred filename for the export'),
  fileType: z.string().describe('File type identifier'),
  message: z.string()
});

export type ExportPerspectiveMetadataSuccess = z.infer<
  typeof ExportPerspectiveMetadataSuccessSchema
>;

/**
 * Error response for export_perspective.
 */
export const ExportPerspectiveErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message'),
  code: z
    .enum(['NOT_FOUND', 'BUILTIN_NOT_EXPORTABLE', 'INVALID_DIRECTORY', 'DISAMBIGUATION_REQUIRED'])
    .optional()
    .describe('Error code for programmatic handling'),
  candidates: z
    .array(
      z.object({
        name: z.string(),
        identifier: z.string()
      })
    )
    .optional()
    .describe('Matching candidates when disambiguation is required')
});

export type ExportPerspectiveError = z.infer<typeof ExportPerspectiveErrorSchema>;

/**
 * Complete response schema.
 * Uses z.union() because Zod 4.x discriminatedUnion requires unique
 * discriminator values, but both success variants share success: true.
 * Type narrowing still works via TypeScript control flow on success + filePath/fileName.
 */
export const ExportPerspectiveResponseSchema = z.union([
  ExportPerspectiveFileSuccessSchema,
  ExportPerspectiveMetadataSuccessSchema,
  ExportPerspectiveErrorSchema
]);

export type ExportPerspectiveResponse = z.infer<typeof ExportPerspectiveResponseSchema>;
