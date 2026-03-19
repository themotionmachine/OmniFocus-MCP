import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { ExpandItemsInputSchema } from '../../contracts/window-tools/expand-items.js';
import { logger } from '../../utils/logger.js';
import { expandItems } from '../primitives/expandItems.js';

export const schema = ExpandItemsInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await expandItems(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Expanded ${summary.succeeded} item(s).`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success && item.code === 'ALREADY_EXPANDED') {
            return `- ALREADY_EXPANDED: "${item.itemName}" (${item.itemId}) was already expanded`;
          }
          if (item.success) {
            return `- Expanded: "${item.itemName}" (${item.itemId}) [${item.itemType}]`;
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

    logger.error('expand_items operation failed', 'expand_items', result);
    return {
      content: [{ type: 'text' as const, text: `Failed to expand items: ${result.error}` }],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'expand_items', { message });
    return {
      content: [{ type: 'text' as const, text: `Error expanding items: ${message}` }],
      isError: true
    };
  }
}
