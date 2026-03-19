import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { UnfocusInputSchema } from '../../contracts/window-tools/unfocus.js';
import { logger } from '../../utils/logger.js';
import { unfocus } from '../primitives/unfocus.js';

export const schema = UnfocusInputSchema;

export async function handler(
  args: z.infer<typeof schema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) {
  try {
    const result = await unfocus(args);

    if (result.success) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Focus cleared. Full outline view restored.'
          }
        ]
      };
    }

    logger.error('unfocus operation failed', 'unfocus', result);
    return {
      content: [{ type: 'text' as const, text: `Failed to unfocus: ${result.error}` }],
      isError: true
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'unfocus', { message });
    return {
      content: [{ type: 'text' as const, text: `Error unfocusing: ${message}` }],
      isError: true
    };
  }
}
