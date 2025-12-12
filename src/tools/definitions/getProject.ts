import type { z } from 'zod';
import { GetProjectInputSchema } from '../../contracts/project-tools/get-project.js';
import { getProject } from '../primitives/getProject.js';

export const schema = GetProjectInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await getProject(params);

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
