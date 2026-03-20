import type { z } from 'zod';
import { ImportTaskpaperInputSchema } from '../../contracts/taskpaper-tools/import-taskpaper.js';
import { logger } from '../../utils/logger.js';
import { importTaskpaper } from '../primitives/importTaskpaper.js';

export const schema = ImportTaskpaperInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  try {
    const result = await importTaskpaper(params);

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
    logger.error('Tool execution error', 'import_taskpaper', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error importing transport text: ${message}`
        }
      ],
      isError: true
    };
  }
}
