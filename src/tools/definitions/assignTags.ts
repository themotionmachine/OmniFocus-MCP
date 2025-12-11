import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { AssignTagsInputSchema } from '../../contracts/tag-tools/assign-tags.js';
import { assignTags } from '../primitives/assignTags.js';

export const schema = AssignTagsInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await assignTags(args);

    if (result.success) {
      const successCount = result.results.filter((r) => r.success).length;
      const failureCount = result.results.filter((r) => !r.success).length;

      let message = `✅ Successfully assigned tags to ${successCount} task(s).`;

      if (failureCount > 0) {
        message += ` ⚠️ Failed for ${failureCount} task(s).`;
      }

      // Include details about each task operation
      const details = result.results
        .map((item) => {
          if (item.success) {
            return `- ✅ Task: "${item.taskName}" (${item.taskId})`;
          }
          if (item.code === 'DISAMBIGUATION_REQUIRED') {
            return `- ⚠️ Task: "${item.taskId}" - Disambiguation required. Matching IDs: ${item.matchingIds?.join(', ')}`;
          }
          return `- ❌ Task: "${item.taskId}" - Error: ${item.error}`;
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

    // Operation failed completely
    console.error('[assign_tags] failure result:', JSON.stringify(result));
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to assign tags: ${result.error}`
        }
      ],
      isError: true
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error assigning tags: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
