import type { z } from 'zod';
import { EditProjectInputSchema } from '../../contracts/project-tools/index.js';
import { editProject } from '../primitives/editProject.js';

export const schema = EditProjectInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await editProject(params);

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
