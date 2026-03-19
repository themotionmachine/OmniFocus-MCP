import type { z } from 'zod';
import { GetPerspectiveInputSchema } from '../../contracts/perspective-tools/get-perspective.js';
import { getPerspective } from '../primitives/getPerspective.js';

export const schema = GetPerspectiveInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await getPerspective(params);

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
