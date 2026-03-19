import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { CollapseNotesInputSchema } from '../../contracts/window-tools/collapse-notes.js';
import { logger } from '../../utils/logger.js';
import { collapseNotes } from '../primitives/collapseNotes.js';

export const schema = CollapseNotesInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await collapseNotes(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Collapsed notes on ${summary.succeeded} item(s).`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success && item.code === 'NO_NOTE') {
            return `- NO_NOTE: "${item.itemName}" (${item.itemId}) has no note`;
          }
          if (item.success) {
            return `- Collapsed note: "${item.itemName}" (${item.itemId}) [${item.itemType}]`;
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

    logger.error('collapse_notes operation failed', 'collapse_notes', result);
    return {
      content: [{ type: 'text' as const, text: `Failed to collapse notes: ${result.error}` }],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'collapse_notes', { message });
    return {
      content: [{ type: 'text' as const, text: `Error collapsing notes: ${message}` }],
      isError: true
    };
  }
}
