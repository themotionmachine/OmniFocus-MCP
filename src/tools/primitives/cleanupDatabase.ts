import {
  type CleanupDatabaseResponse,
  CleanupDatabaseResponseSchema
} from '../../contracts/database-tools/cleanup-database.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Trigger the OmniFocus Clean Up operation.
 *
 * @returns Promise resolving to success or error
 */
export async function cleanupDatabase(): Promise<CleanupDatabaseResponse> {
  const script = generateCleanupDatabaseScript();
  try {
    const result = CleanupDatabaseResponseSchema.parse(await executeOmniJS(script));
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('Error in cleanupDatabase', 'cleanupDatabase', { error });
    return { success: false, error };
  }
}

/**
 * Generate OmniJS script to trigger database cleanup.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateCleanupDatabaseScript(): string {
  return `(function() {
  try {
    cleanUp();
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
