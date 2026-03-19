import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { BatchUpdateTasksInputSchema } from '../../contracts/bulk-tools/batch-update-tasks.js';
import { logger } from '../../utils/logger.js';
import { batchUpdateTasks } from '../primitives/batchUpdateTasks.js';

export const schema = BatchUpdateTasksInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await batchUpdateTasks(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Updated ${summary.succeeded} task(s) successfully.`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} task(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success) {
            return `- UPDATED: "${item.itemName}" (${item.itemId}) [${item.itemType}]`;
          }
          if (item.code === 'DISAMBIGUATION_REQUIRED') {
            const candidateList =
              item.candidates?.map((c) => `${c.name} (${c.id})`).join(', ') ?? '';
            return `- DISAMBIGUATION: "${item.itemName}" matches multiple items. Use ID. Candidates: ${candidateList}`;
          }
          return `- ERROR [${item.code ?? 'UNKNOWN'}]: "${item.itemName || item.itemId}" - ${item.error}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `${message}\n\n${details}`
          }
        ]
      };
    }

    logger.error('batch_update_tasks operation failed', 'batch_update_tasks', result);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to update tasks: ${result.error}${result.code ? ` (${result.code})` : ''}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'batch_update_tasks', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error updating tasks: ${message}`
        }
      ],
      isError: true
    };
  }
}
