import type { GetInboxCountResponse } from '../../contracts/database-tools/get-inbox-count.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Get the number of items in the OmniFocus inbox.
 *
 * @returns Promise resolving to inbox count or error
 */
export async function getInboxCount(): Promise<GetInboxCountResponse> {
  const script = generateGetInboxCountScript();
  const result = await executeOmniJS(script);
  return result as GetInboxCountResponse;
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
