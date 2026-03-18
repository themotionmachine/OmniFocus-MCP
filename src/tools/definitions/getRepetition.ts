import type { z } from 'zod';
import { GetRepetitionInputSchema } from '../../contracts/repetition-tools/get-repetition.js';
import { getRepetition } from '../primitives/getRepetition.js';

export const schema = GetRepetitionInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await getRepetition(params);

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
