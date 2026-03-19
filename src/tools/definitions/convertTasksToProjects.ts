import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { ConvertTasksToProjectsInputSchema } from '../../contracts/bulk-tools/convert-tasks-to-projects.js';
import { logger } from '../../utils/logger.js';
import { convertTasksToProjects } from '../primitives/convertTasksToProjects.js';

export const schema = ConvertTasksToProjectsInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await convertTasksToProjects(args);

    if (result.success) {
      const { summary, results } = result;

      let message = `Converted ${summary.succeeded} task(s) to project(s) successfully.`;
      if (summary.failed > 0) {
        message += ` Failed for ${summary.failed} item(s).`;
      }

      const details = results
        .map((item) => {
          if (item.success) {
            const proj = item.newId ? ` -> project: "${item.newName}" (${item.newId})` : '';
            return `- CONVERTED: "${item.itemName}" (${item.itemId}) [${item.itemType}]${proj}`;
          }
          if (item.code === 'ALREADY_A_PROJECT') {
            return `- ALREADY_A_PROJECT: "${item.itemName}" (${item.itemId}) is already a project root`;
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

    logger.error('convert_tasks_to_projects operation failed', 'convert_tasks_to_projects', result);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to convert tasks to projects: ${result.error}${result.code ? ` (${result.code})` : ''}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'convert_tasks_to_projects', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error converting tasks to projects: ${message}`
        }
      ],
      isError: true
    };
  }
}
