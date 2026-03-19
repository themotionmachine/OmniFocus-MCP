import type { z } from 'zod';
import { GetForecastDayInputSchema } from '../../contracts/forecast-tools/get-forecast-day.js';
import { getForecastDay } from '../primitives/getForecastDay.js';

export const schema = GetForecastDayInputSchema;

export async function handler(params: z.infer<typeof schema>) {
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
}
