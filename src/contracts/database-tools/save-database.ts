import { z } from 'zod';

/** No input required -- parameterless tool */
export const SaveDatabaseInputSchema = z.object({});

export type SaveDatabaseInput = z.infer<typeof SaveDatabaseInputSchema>;

export const SaveDatabaseSuccessSchema = z.object({
  success: z.literal(true)
});

export type SaveDatabaseSuccess = z.infer<typeof SaveDatabaseSuccessSchema>;

export const SaveDatabaseErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SaveDatabaseError = z.infer<typeof SaveDatabaseErrorSchema>;

export const SaveDatabaseResponseSchema = z.discriminatedUnion('success', [
  SaveDatabaseSuccessSchema,
  SaveDatabaseErrorSchema
]);

export type SaveDatabaseResponse = z.infer<typeof SaveDatabaseResponseSchema>;
