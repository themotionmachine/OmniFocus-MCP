import type { z } from 'zod';
import { MoveProjectInputSchema } from '../../contracts/project-tools/index.js';
import { moveProject } from '../primitives/moveProject.js';

export const schema = MoveProjectInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await moveProject(params);

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
