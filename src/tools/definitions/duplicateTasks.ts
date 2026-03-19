import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { DuplicateTasksInputSchema } from '../../contracts/bulk-tools/duplicate-tasks.js';
import { logger } from '../../utils/logger.js';
import { duplicateTasks } from '../primitives/duplicateTasks.js';

export const schema = DuplicateTasksInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await duplicateTasks(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Duplicated ${summary.succeeded} item(s) successfully.`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success) {
            const copy = item.newId ? ` -> copy: "${item.newName}" (${item.newId})` : '';
            const warn = item.warning ? ` [Warning: ${item.warning}]` : '';
            return `- DUPLICATED: "${item.itemName}" (${item.itemId}) [${item.itemType}]${copy}${warn}`;
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

    logger.error('duplicate_tasks operation failed', 'duplicate_tasks', result);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to duplicate tasks: ${result.error}${result.code ? ` (${result.code})` : ''}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'duplicate_tasks', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error duplicating tasks: ${message}`
        }
      ],
      isError: true
    };
  }
}
