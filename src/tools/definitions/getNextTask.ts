import type { z } from 'zod';
import { GetNextTaskInputSchema } from '../../contracts/status-tools/get-next-task.js';
import { logger } from '../../utils/logger.js';
import { getNextTask } from '../primitives/getNextTask.js';

export const schema = GetNextTaskInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  try {
    const result = await getNextTask(params);

    if (!result.success) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        isError: true
      };
    }

    if (!result.hasNext) {
      const text = `No next task: ${result.reason} - ${result.message}`;
      return {
        content: [{ type: 'text' as const, text }]
      };
    }

    const { task } = result;
    const dueDateStr = task.dueDate ?? 'none';
    const text = `Next task in '${task.project.name}': ${task.name} (id: ${task.id})\nStatus: ${task.taskStatus}, Flagged: ${task.flagged}, Due: ${dueDateStr}`;

    return {
      content: [{ type: 'text' as const, text }]
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'get_next_task', { message });
    return {
      content: [{ type: 'text' as const, text: `Error getting next task: ${message}` }],
      isError: true
    };
  }
}
