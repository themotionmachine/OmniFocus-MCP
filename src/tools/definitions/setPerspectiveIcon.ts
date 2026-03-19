import type { z } from 'zod';
import { SetPerspectiveIconInputSchema } from '../../contracts/perspective-tools/set-perspective-icon.js';
import { setPerspectiveIcon } from '../primitives/setPerspectiveIcon.js';

export const schema = SetPerspectiveIconInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await setPerspectiveIcon(params);

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
