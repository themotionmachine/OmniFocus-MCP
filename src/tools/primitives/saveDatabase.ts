import {
  type SaveDatabaseResponse,
  SaveDatabaseResponseSchema
} from '../../contracts/database-tools/save-database.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Save the database to disk and trigger sync if enabled.
 *
 * @returns Promise resolving to success or error
 */
export async function saveDatabase(): Promise<SaveDatabaseResponse> {
  const script = generateSaveDatabaseScript();
  try {
    const result = SaveDatabaseResponseSchema.parse(await executeOmniJS(script));
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('Error in saveDatabase', 'saveDatabase', { error });
    return { success: false, error };
  }
}

/**
 * Generate OmniJS script to save the database.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSaveDatabaseScript(): string {
  return `(function() {
  try {
    save();
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
