import type { z } from 'zod';
import { GetProjectsForReviewInputSchema } from '../../contracts/review-tools/get-projects-for-review.js';
import { getProjectsForReview } from '../primitives/getProjectsForReview.js';

export const schema = GetProjectsForReviewInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await getProjectsForReview(params);

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
