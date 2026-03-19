import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { RevealItemsInputSchema } from '../../contracts/window-tools/reveal-items.js';
import { logger } from '../../utils/logger.js';
import { revealItems } from '../primitives/revealItems.js';

export const schema = RevealItemsInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await revealItems(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Revealed ${summary.succeeded} item(s).`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success) {
            return `- Revealed: "${item.itemName}" (${item.itemId}) [${item.itemType}]`;
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

    logger.error('reveal_items operation failed', 'reveal_items', result);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to reveal items: ${result.error}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'reveal_items', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error revealing items: ${message}`
        }
      ],
      isError: true
    };
  }
}
