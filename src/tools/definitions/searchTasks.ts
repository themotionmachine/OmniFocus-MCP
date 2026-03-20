import type { z } from 'zod';
import { SearchTasksInputSchema } from '../../contracts/search-tools/search-tasks.js';
import { searchTasks } from '../primitives/searchTasks.js';

export const schema = SearchTasksInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await searchTasks(params);

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
