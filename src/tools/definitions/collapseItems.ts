import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { CollapseItemsInputSchema } from '../../contracts/window-tools/collapse-items.js';
import { logger } from '../../utils/logger.js';
import { collapseItems } from '../primitives/collapseItems.js';

export const schema = CollapseItemsInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await collapseItems(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Collapsed ${summary.succeeded} item(s).`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success && item.code === 'ALREADY_COLLAPSED') {
            return `- ALREADY_COLLAPSED: "${item.itemName}" (${item.itemId}) was already collapsed`;
          }
          if (item.success) {
            return `- Collapsed: "${item.itemName}" (${item.itemId}) [${item.itemType}]`;
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
        content: [{ type: 'text' as const, text: `${message}\n\n${details}` }]
      };
    }

    logger.error('collapse_items operation failed', 'collapse_items', result);
    return {
      content: [{ type: 'text' as const, text: `Failed to collapse items: ${result.error}` }],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'collapse_items', { message });
    return {
      content: [{ type: 'text' as const, text: `Error collapsing items: ${message}` }],
      isError: true
    };
  }
}
