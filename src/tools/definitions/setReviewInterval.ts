import type { z } from 'zod';
import { SetReviewIntervalInputSchema } from '../../contracts/review-tools/set-review-interval.js';
import { setReviewInterval } from '../primitives/setReviewInterval.js';

export const schema = SetReviewIntervalInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await setReviewInterval(params);

  if (!result.success) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      isError: true
    };
  }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result) }]
  };
}
