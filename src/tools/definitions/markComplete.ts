import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { MarkCompleteInputSchema } from '../../contracts/status-tools/mark-complete.js';
import { logger } from '../../utils/logger.js';
import { markComplete } from '../primitives/markComplete.js';

export const schema = MarkCompleteInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await markComplete(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Marked ${summary.succeeded} item(s) as complete.`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success && item.code === 'ALREADY_COMPLETED') {
            return `- ALREADY_COMPLETED: "${item.itemName}" (${item.itemId}) was already complete`;
          }
          if (item.success) {
            return `- ${item.itemName} (${item.itemId}) [${item.itemType}]: marked complete`;
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
    logger.error('mark_complete operation failed', 'mark_complete', result);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to mark items as complete: ${result.error}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'mark_complete', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error marking items as complete: ${message}`
        }
      ],
      isError: true
    };
  }
}
