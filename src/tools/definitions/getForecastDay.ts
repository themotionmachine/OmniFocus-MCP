import type { z } from 'zod';
import { GetForecastDayInputSchema } from '../../contracts/forecast-tools/get-forecast-day.js';
import { logger } from '../../utils/logger.js';
import { getForecastDay } from '../primitives/getForecastDay.js';

export const schema = GetForecastDayInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  try {
    const result = await getForecastDay(params);

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
    logger.error('Tool execution error', 'get_forecast_day', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting forecast day: ${message}`
        }
      ],
      isError: true
    };
  }
}
