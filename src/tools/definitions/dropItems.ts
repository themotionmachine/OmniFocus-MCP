import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { DropItemsInputSchema } from '../../contracts/status-tools/drop-items.js';
import { logger } from '../../utils/logger.js';
import { dropItems } from '../primitives/dropItems.js';

export const schema = DropItemsInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await dropItems(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Dropped ${summary.succeeded} item(s).`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success && item.code === 'ALREADY_DROPPED') {
            return `- ALREADY_DROPPED: "${item.itemName}" (${item.itemId}) was already dropped`;
          }
          if (item.success) {
            return `- Dropped: "${item.itemName}" (${item.itemId}) [${item.itemType}]`;
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

    // Catastrophic failure (version check failure, OmniFocus unreachable, etc.)
    logger.error('drop_items operation failed', 'drop_items', result);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to drop items: ${result.error}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'drop_items', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error dropping items: ${message}`
        }
      ],
      isError: true
    };
  }
}
