import type { z } from 'zod';
import { ValidateTransportTextInputSchema } from '../../contracts/taskpaper-tools/validate-transport-text.js';
import { logger } from '../../utils/logger.js';
import { validateTransportText } from '../primitives/validateTransportText.js';

export const schema = ValidateTransportTextInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  try {
    const result = validateTransportText(params);

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
    logger.error('Tool execution error', 'validate_transport_text', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error validating transport text: ${message}`
        }
      ],
      isError: true
    };
  }
}
