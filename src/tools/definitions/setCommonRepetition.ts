import type { z } from 'zod';
import { SetCommonRepetitionInputSchema } from '../../contracts/repetition-tools/set-common-repetition.js';
import { setCommonRepetition } from '../primitives/setCommonRepetition.js';

export const schema = SetCommonRepetitionInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await setCommonRepetition(params);

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
