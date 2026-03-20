import {
  type GetInboxCountResponse,
  GetInboxCountResponseSchema
} from '../../contracts/database-tools/get-inbox-count.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Get the number of items in the OmniFocus inbox.
 *
 * @returns Promise resolving to inbox count or error
 */
export async function getInboxCount(): Promise<GetInboxCountResponse> {
  const script = generateGetInboxCountScript();
  try {
    const result = GetInboxCountResponseSchema.parse(await executeOmniJS(script));
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('Error in getInboxCount', 'getInboxCount', { error });
    return { success: false, error };
  }
}

/**
 * Generate OmniJS script to get inbox count.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateGetInboxCountScript(): string {
  return `(function() {
  try {
    return JSON.stringify({
      success: true,
      count: inbox.length
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
