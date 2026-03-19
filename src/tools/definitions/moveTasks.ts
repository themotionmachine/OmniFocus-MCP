import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { MoveTasksInputSchema } from '../../contracts/bulk-tools/move-tasks.js';
import { logger } from '../../utils/logger.js';
import { moveTasks } from '../primitives/moveTasks.js';

export const schema = MoveTasksInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await moveTasks(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Moved ${summary.succeeded} item(s) successfully.`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success && item.warning) {
            return `- MOVED with warning: "${item.itemName}" (${item.itemId}) [${item.itemType}]: ${item.warning}`;
          }
          if (item.success) {
            return `- MOVED: "${item.itemName}" (${item.itemId}) [${item.itemType}]`;
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

    logger.error('move_tasks operation failed', 'move_tasks', result);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to move tasks: ${result.error}${result.code ? ` (${result.code})` : ''}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'move_tasks', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error moving tasks: ${message}`
        }
      ],
      isError: true
    };
  }
}
