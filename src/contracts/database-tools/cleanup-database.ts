import { z } from 'zod';

/** No input required -- parameterless tool */
export const CleanupDatabaseInputSchema = z.object({});

export type CleanupDatabaseInput = z.infer<typeof CleanupDatabaseInputSchema>;

export const CleanupDatabaseSuccessSchema = z.object({
  success: z.literal(true)
});

export type CleanupDatabaseSuccess = z.infer<typeof CleanupDatabaseSuccessSchema>;

export const CleanupDatabaseErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type CleanupDatabaseError = z.infer<typeof CleanupDatabaseErrorSchema>;

export const CleanupDatabaseResponseSchema = z.discriminatedUnion('success', [
  CleanupDatabaseSuccessSchema,
  CleanupDatabaseErrorSchema
]);

export type CleanupDatabaseResponse = z.infer<typeof CleanupDatabaseResponseSchema>;
