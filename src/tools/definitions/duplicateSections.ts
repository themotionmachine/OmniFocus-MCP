import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { DuplicateSectionsInputSchema } from '../../contracts/bulk-tools/duplicate-sections.js';
import { logger } from '../../utils/logger.js';
import { duplicateSections } from '../primitives/duplicateSections.js';

export const schema = DuplicateSectionsInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await duplicateSections(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Duplicated ${summary.succeeded} section(s) successfully.`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} section(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success) {
            const copy = item.newId ? ` -> copy: "${item.newName}" (${item.newId})` : '';
            return `- DUPLICATED: "${item.itemName}" (${item.itemId}) [${item.itemType}]${copy}`;
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

    logger.error('duplicate_sections operation failed', 'duplicate_sections', result);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to duplicate sections: ${result.error}${result.code ? ` (${result.code})` : ''}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'duplicate_sections', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error duplicating sections: ${message}`
        }
      ],
      isError: true
    };
  }
}
