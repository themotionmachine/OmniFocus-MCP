import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { MarkReviewedInputSchema } from '../../contracts/review-tools/mark-reviewed.js';
import { logger } from '../../utils/logger.js';
import { markReviewed } from '../primitives/markReviewed.js';

export const schema = MarkReviewedInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await markReviewed(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Marked ${summary.succeeded} project(s) as reviewed.`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} project(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success) {
            const prev = item.previousNextReviewDate ?? 'none';
            const next = item.newNextReviewDate ?? 'unknown';
            return `- ${item.projectName} (${item.projectId}): next review ${next} (was ${prev})`;
          }
          if (item.code === 'DISAMBIGUATION_REQUIRED') {
            const candidateList =
              item.candidates?.map((c) => `${c.name} (${c.id})`).join(', ') ?? '';
            return `- DISAMBIGUATION: "${item.projectName}" matches multiple projects. Use ID. Candidates: ${candidateList}`;
          }
          if (item.code === 'NO_REVIEW_INTERVAL') {
            return `- NO_REVIEW_INTERVAL: "${item.projectName}" (${item.projectId}) has no review interval configured`;
          }
          return `- ERROR: "${item.projectName || item.projectId}" - ${item.error}`;
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
    logger.error('mark_reviewed operation failed', 'mark_reviewed', result);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to mark projects as reviewed: ${result.error}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('Tool execution error', 'mark_reviewed', { message: error.message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error marking projects as reviewed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
