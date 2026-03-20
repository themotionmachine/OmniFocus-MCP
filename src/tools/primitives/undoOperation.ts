import { type UndoResponse, UndoResponseSchema } from '../../contracts/database-tools/undo.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Undo the most recent database change.
 * Pre-checks canUndo before attempting the operation.
 *
 * @returns Promise resolving to undo result or error
 */
export async function undoOperation(): Promise<UndoResponse> {
  const script = generateUndoScript();
  try {
    const result = UndoResponseSchema.parse(await executeOmniJS(script));
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('Error in undoOperation', 'undoOperation', { error });
    return { success: false, error };
  }
}

/**
 * Generate OmniJS script to undo the last operation.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateUndoScript(): string {
  return `(function() {
  try {
    var performed = false;
    if (canUndo) {
      undo();
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
