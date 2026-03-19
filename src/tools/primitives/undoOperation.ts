import type { UndoResponse } from '../../contracts/database-tools/undo.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Undo the most recent database change.
 * Pre-checks canUndo before attempting the operation.
 *
 * @returns Promise resolving to undo result or error
 */
export async function undoOperation(): Promise<UndoResponse> {
  const script = generateUndoScript();
  const result = await executeOmniJS(script);
  return result as UndoResponse;
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
