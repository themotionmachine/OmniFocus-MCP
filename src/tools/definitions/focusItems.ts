import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { FocusItemsInputSchema } from '../../contracts/window-tools/focus-items.js';
import { logger } from '../../utils/logger.js';
import { focusItems } from '../primitives/focusItems.js';

export const schema = FocusItemsInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await focusItems(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Focused on ${summary.succeeded} item(s).`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success) {
            return `- Focused: "${item.itemName}" (${item.itemId}) [${item.itemType}]`;
          }
          if (item.code === 'INVALID_TYPE') {
            return `- INVALID_TYPE: "${item.itemName}" (${item.itemId}) is a ${item.itemType} — only projects and folders can be focused`;
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

    logger.error('focus_items operation failed', 'focus_items', result);
    return {
      content: [{ type: 'text' as const, text: `Failed to focus items: ${result.error}` }],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'focus_items', { message });
    return {
      content: [{ type: 'text' as const, text: `Error focusing items: ${message}` }],
      isError: true
    };
  }
}
