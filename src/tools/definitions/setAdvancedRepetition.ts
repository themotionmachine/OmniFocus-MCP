import type { z } from 'zod';
import { SetAdvancedRepetitionInputSchema } from '../../contracts/repetition-tools/set-advanced-repetition.js';
import { setAdvancedRepetition } from '../primitives/setAdvancedRepetition.js';

export const schema = SetAdvancedRepetitionInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await setAdvancedRepetition(params);

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
