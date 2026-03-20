import { ExportPerspectiveInputSchema } from '../../contracts/perspective-tools/export-perspective.js';
import { logger } from '../../utils/logger.js';
import { exportPerspective } from '../primitives/exportPerspective.js';

export const schema = ExportPerspectiveInputSchema;

export async function handler(params: unknown) {
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: parsed.error.message,
            code: 'VALIDATION_ERROR'
          })
        }
      ],
      isError: true
    };
  }

  try {
    const result = await exportPerspective(parsed.data);

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
    logger.error('Tool execution error', 'export_perspective', { message });
    return {
      content: [{ type: 'text' as const, text: `Error exporting perspective: ${message}` }],
      isError: true
    };
  }
}
