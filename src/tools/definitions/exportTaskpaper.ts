import {
  ExportTaskpaperInputBaseSchema,
  ExportTaskpaperInputSchema
} from '../../contracts/taskpaper-tools/export-taskpaper.js';
import { logger } from '../../utils/logger.js';
import { exportTaskpaper } from '../primitives/exportTaskpaper.js';

/** Base schema for server.tool() registration (provides .shape) */
export const schema = ExportTaskpaperInputBaseSchema;

/** Full schema with .refine() for validation in handler */
const validationSchema = ExportTaskpaperInputSchema;

export async function handler(params: unknown) {
  const parsed = validationSchema.safeParse(params);
  if (!parsed.success) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: parsed.error.issues.map((i) => i.message).join('; ')
          })
        }
      ],
      isError: true
    };
  }

  try {
    const result = await exportTaskpaper(parsed.data);

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
    logger.error('Tool execution error', 'export_taskpaper', { message });
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error exporting to transport text: ${message}`
        }
      ],
      isError: true
    };
  }
}
