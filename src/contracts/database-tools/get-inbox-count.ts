import { z } from 'zod';

/** No input required -- parameterless tool */
export const GetInboxCountInputSchema = z.object({});

export type GetInboxCountInput = z.infer<typeof GetInboxCountInputSchema>;

export const GetInboxCountSuccessSchema = z.object({
  success: z.literal(true),
  count: z.number().int().min(0).describe('Number of items in inbox')
});

export type GetInboxCountSuccess = z.infer<typeof GetInboxCountSuccessSchema>;

export const GetInboxCountErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type GetInboxCountError = z.infer<typeof GetInboxCountErrorSchema>;

export const GetInboxCountResponseSchema = z.discriminatedUnion('success', [
  GetInboxCountSuccessSchema,
  GetInboxCountErrorSchema
]);

export type GetInboxCountResponse = z.infer<typeof GetInboxCountResponseSchema>;
