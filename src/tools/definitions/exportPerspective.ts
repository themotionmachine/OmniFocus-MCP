import type { z } from 'zod';
import { ExportPerspectiveInputSchema } from '../../contracts/perspective-tools/export-perspective.js';
import { exportPerspective } from '../primitives/exportPerspective.js';

export const schema = ExportPerspectiveInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await exportPerspective(params);

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
