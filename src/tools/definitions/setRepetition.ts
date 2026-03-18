import type { z } from 'zod';
import { SetRepetitionInputSchema } from '../../contracts/repetition-tools/set-repetition.js';
import { setRepetition } from '../primitives/setRepetition.js';

export const schema = SetRepetitionInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await setRepetition(params);

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
