import { type RedoResponse, RedoResponseSchema } from '../../contracts/database-tools/redo.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Redo the most recently undone database change.
 * Pre-checks canRedo before attempting the operation.
 *
 * @returns Promise resolving to redo result or error
 */
export async function redoOperation(): Promise<RedoResponse> {
  const script = generateRedoScript();
  try {
    const result = RedoResponseSchema.parse(await executeOmniJS(script));
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('Error in redoOperation', 'redoOperation', { error });
    return { success: false, error };
  }
}

/**
 * Generate OmniJS script to redo the last undone operation.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateRedoScript(): string {
  return `(function() {
  try {
    var performed = false;
    if (canRedo) {
      redo();
      performed = true;
    }
    return JSON.stringify({
      success: true,
      performed: performed,
      canUndo: canUndo,
      canRedo: canRedo
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
