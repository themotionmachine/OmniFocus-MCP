import type { z } from 'zod';
import { SearchProjectsInputSchema } from '../../contracts/search-tools/search-projects.js';
import { searchProjects } from '../primitives/searchProjects.js';

export const schema = SearchProjectsInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await searchProjects(params);

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
