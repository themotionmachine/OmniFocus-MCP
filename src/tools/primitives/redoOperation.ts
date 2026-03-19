import type { RedoResponse } from '../../contracts/database-tools/redo.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Redo the most recently undone database change.
 * Pre-checks canRedo before attempting the operation.
 *
 * @returns Promise resolving to redo result or error
 */
export async function redoOperation(): Promise<RedoResponse> {
  const script = generateRedoScript();
  const result = await executeOmniJS(script);
  return result as RedoResponse;
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
