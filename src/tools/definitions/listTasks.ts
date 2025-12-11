import type { z } from 'zod';
import { ListTasksInputSchema } from '../../contracts/task-tools/list-tasks.js';
import { listTasks } from '../primitives/listTasks.js';

export const schema = ListTasksInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await listTasks(params);

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
