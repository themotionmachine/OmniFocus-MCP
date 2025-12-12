import type { z } from 'zod';
import { ListProjectsInputSchema } from '../../contracts/project-tools/list-projects.js';
import { listProjects } from '../primitives/listProjects.js';

export const schema = ListProjectsInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await listProjects(params);

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
