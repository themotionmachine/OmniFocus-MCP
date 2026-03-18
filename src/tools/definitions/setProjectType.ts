import type { z } from 'zod';
import { SetProjectTypeInputSchema } from '../../contracts/status-tools/set-project-type.js';
import { logger } from '../../utils/logger.js';
import { setProjectType } from '../primitives/setProjectType.js';

export const schema = SetProjectTypeInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  try {
    const result = await setProjectType(params);

    if (!result.success) {
      // Format a descriptive error message including disambiguation info
      let text = JSON.stringify(result);
      if ('code' in result && result.code === 'DISAMBIGUATION_REQUIRED') {
        text = JSON.stringify({
          ...result,
          hint: `Use one of the IDs from matchingIds to specify the exact project.`
        });
      }
      return {
        content: [{ type: 'text' as const, text }],
        isError: true
      };
    }

    const successText = `Set project '${result.name}' to ${result.projectType}. sequential=${result.sequential}, containsSingletonActions=${result.containsSingletonActions}`;
    return {
      content: [
        { type: 'text' as const, text: successText },
        { type: 'text' as const, text: JSON.stringify(result) }
      ]
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'set_project_type', { message });
    return {
      content: [{ type: 'text' as const, text: `Error setting project type: ${message}` }],
      isError: true
    };
  }
}
