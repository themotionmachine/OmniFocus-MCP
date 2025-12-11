import type { z } from 'zod';
import { SetPlannedDateInputSchema } from '../../contracts/task-tools/set-planned-date.js';
import { setPlannedDate } from '../primitives/setPlannedDate.js';

export const schema = SetPlannedDateInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await setPlannedDate(params);

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
