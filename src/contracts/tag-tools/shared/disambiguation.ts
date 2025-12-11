import { z } from 'zod';

export const DisambiguationErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.literal('DISAMBIGUATION_REQUIRED'),
  matchingIds: z.array(z.string()).min(2)
});

export type DisambiguationError = z.infer<typeof DisambiguationErrorSchema>;
