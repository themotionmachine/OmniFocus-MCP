import type { z } from 'zod';
import { SelectForecastDaysInputSchema } from '../../contracts/forecast-tools/select-forecast-days.js';
import { logger } from '../../utils/logger.js';
import { selectForecastDays } from '../primitives/selectForecastDays.js';

export const schema = SelectForecastDaysInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  try {
    const result = await selectForecastDays(params);

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
    logger.error('Tool execution error', 'select_forecast_days', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error selecting forecast days: ${message}`
        }
      ],
      isError: true
    };
  }
}
