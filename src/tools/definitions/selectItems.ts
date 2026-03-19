import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { SelectItemsInputSchema } from '../../contracts/window-tools/select-items.js';
import { logger } from '../../utils/logger.js';
import { selectItems } from '../primitives/selectItems.js';

export const schema = SelectItemsInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await selectItems(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Selected ${summary.succeeded} item(s).`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success) {
            return `- Selected: "${item.itemName}" (${item.itemId}) [${item.itemType}]`;
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

    logger.error('select_items operation failed', 'select_items', result);
    return {
      content: [{ type: 'text' as const, text: `Failed to select items: ${result.error}` }],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'select_items', { message });
    return {
      content: [{ type: 'text' as const, text: `Error selecting items: ${message}` }],
      isError: true
    };
  }
}
