import type { z } from 'zod';
import { GetForecastRangeInputSchema } from '../../contracts/forecast-tools/get-forecast-range.js';
import { getForecastRange } from '../primitives/getForecastRange.js';

export const schema = GetForecastRangeInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await getForecastRange(params);

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
