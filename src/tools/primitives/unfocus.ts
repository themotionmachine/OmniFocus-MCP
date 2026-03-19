import {
  type UnfocusInput,
  type UnfocusResponse,
  UnfocusResponseSchema
} from '../../contracts/window-tools/unfocus.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Clear focus from the OmniFocus window, restoring the full outline view.
 *
 * Sets `window.focus = []` to clear any active focus.
 * Idempotent: calling unfocus when already unfocused succeeds as a no-op.
 * Uses `window.focus` directly -- NO content tree guard needed.
 * Requires OmniFocus 4.0+ and an active window.
 *
 * @param _params - Empty input (no parameters required)
 * @returns Promise resolving to simple success/error response
 */
export async function unfocus(_params: UnfocusInput): Promise<UnfocusResponse> {
  const script = generateUnfocusScript();
  const result = await executeOmniJS(script);
  if (!result) return { success: false, error: 'OmniJS returned empty result' };
  return UnfocusResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to clear focus.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateUnfocusScript(): string {
  return `(function() {
  try {
    if (!app.userVersion.atLeast(new Version('4.0'))) {
      return JSON.stringify({
        success: false,
        error: 'unfocus requires OmniFocus 4.0 or later. Current version: ' + app.userVersion.versionString
      });
    }

    var win = document.windows[0];
    if (!win) {
      return JSON.stringify({
        success: false,
        error: 'No OmniFocus window is open. UI operations require an active window.'
      });
    }

    win.focus = [];

    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
