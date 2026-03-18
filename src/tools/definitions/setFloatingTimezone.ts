import type { z } from 'zod';
import { SetFloatingTimezoneInputSchema } from '../../contracts/status-tools/set-floating-timezone.js';
import { logger } from '../../utils/logger.js';
import { setFloatingTimezone } from '../primitives/setFloatingTimezone.js';

export const schema = SetFloatingTimezoneInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  try {
    const result = await setFloatingTimezone(params);

    if (!result.success) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        isError: true
      };
    }

    const { id, name, itemType, floatingTimezone } = result;
    const enabledStr = floatingTimezone ? 'enabled' : 'disabled';
    const summary = `Set floating timezone to ${enabledStr} for ${itemType} '${name}' (${id})`;

    return {
      content: [
        { type: 'text' as const, text: summary },
        { type: 'text' as const, text: JSON.stringify(result) }
      ]
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Tool execution error', 'set_floating_timezone', { message });
    return {
      content: [{ type: 'text' as const, text: `Error setting floating timezone: ${message}` }],
      isError: true
    };
  }
}
