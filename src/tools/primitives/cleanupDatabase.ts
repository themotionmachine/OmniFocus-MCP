import type { CleanupDatabaseResponse } from '../../contracts/database-tools/cleanup-database.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Trigger the OmniFocus Clean Up operation.
 *
 * @returns Promise resolving to success or error
 */
export async function cleanupDatabase(): Promise<CleanupDatabaseResponse> {
  const script = generateCleanupDatabaseScript();
  const result = await executeOmniJS(script);
  return result as CleanupDatabaseResponse;
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
