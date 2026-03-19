import type { z } from 'zod';
import { SwitchPerspectiveInputSchema } from '../../contracts/perspective-tools/switch-perspective.js';
import { switchPerspective } from '../primitives/switchPerspective.js';

export const schema = SwitchPerspectiveInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await switchPerspective(params);

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
