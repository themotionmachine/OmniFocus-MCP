import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { MarkIncompleteInputSchema } from '../../contracts/status-tools/mark-incomplete.js';
import { logger } from '../../utils/logger.js';
import { markIncomplete } from '../primitives/markIncomplete.js';

export const schema = MarkIncompleteInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await markIncomplete(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Reopened ${summary.succeeded} item(s).`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success && item.code === 'ALREADY_ACTIVE') {
            return `- ALREADY_ACTIVE: "${item.itemName}" (${item.itemId}) was already active — no change made`;
          }
          if (item.success) {
            return `- ${item.itemName} (${item.itemId}) [${item.itemType}]: reopened`;
          }
          if (item.code === 'DISAMBIGUATION_REQUIRED') {
            const candidateList =
              item.candidates?.map((c) => `${c.name} (${c.id})`).join(', ') ?? '';
            return `- DISAMBIGUATION: "${item.itemName}" matches multiple items. Use ID. Candidates: ${candidateList}`;
          }
          return `- ERROR: "${item.itemName || item.itemId}" - ${item.error}`;
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

    // Catastrophic failure (e.g., OmniFocus unreachable)
    logger.error('mark_incomplete operation failed', 'mark_incomplete', result);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to reopen items: ${result.error}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'mark_incomplete', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error reopening items: ${message}`
        }
      ],
      isError: true
    };
  }
}
