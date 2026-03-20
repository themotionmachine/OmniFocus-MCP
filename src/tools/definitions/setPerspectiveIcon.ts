import { SetPerspectiveIconInputSchema } from '../../contracts/perspective-tools/set-perspective-icon.js';
import { logger } from '../../utils/logger.js';
import { setPerspectiveIcon } from '../primitives/setPerspectiveIcon.js';

export const schema = SetPerspectiveIconInputSchema;

export async function handler(params: unknown) {
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: parsed.error.message,
            code: 'VALIDATION_ERROR'
          })
        }
      ],
      isError: true
    };
  }

  try {
    const result = await setPerspectiveIcon(parsed.data);

    if (!result.success) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        isError: true
      };
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }]
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'set_perspective_icon', { message });
    return {
      content: [{ type: 'text' as const, text: `Error setting perspective icon: ${message}` }],
      isError: true
    };
  }
}
