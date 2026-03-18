import type { z } from 'zod';
import { ClearRepetitionInputSchema } from '../../contracts/repetition-tools/clear-repetition.js';
import { clearRepetition } from '../primitives/clearRepetition.js';

export const schema = ClearRepetitionInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await clearRepetition(params);

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
