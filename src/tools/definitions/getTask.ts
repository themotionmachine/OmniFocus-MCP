import type { z } from 'zod';
import { GetTaskInputSchema } from '../../contracts/task-tools/get-task.js';
import { getTask } from '../primitives/getTask.js';

export const schema = GetTaskInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await getTask(params);

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
