import type { z } from 'zod';
import { CreateProjectInputSchema } from '../../contracts/project-tools/index.js';
import { createProject } from '../primitives/createProject.js';

export const schema = CreateProjectInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await createProject(params);

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
