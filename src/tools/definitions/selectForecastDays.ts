import type { z } from 'zod';
import { SelectForecastDaysInputSchema } from '../../contracts/forecast-tools/select-forecast-days.js';
import { selectForecastDays } from '../primitives/selectForecastDays.js';

export const schema = SelectForecastDaysInputSchema;

export async function handler(params: z.infer<typeof schema>) {
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
}
