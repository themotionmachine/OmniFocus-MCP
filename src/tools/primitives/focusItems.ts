import {
  type FocusItemsInput,
  type FocusItemsResponse,
  FocusItemsResponseSchema
} from '../../contracts/window-tools/focus-items.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';
import { generateResolveItemSnippet } from './shared/resolveItemSnippet.js';

/**
 * Focus the OmniFocus window on one or more projects or folders.
 *
 * Narrows the outline to show only the focused items and their contents.
 * Tasks and tags are rejected with INVALID_TYPE.
 * Uses `window.focus` directly -- NO content tree guard needed.
 * Requires OmniFocus 4.0+ and an active window.
 *
 * @param params - Input containing items array (1-50 focus targets)
 * @returns Promise resolving to batch result with per-item success/failure
 */
export async function focusItems(params: FocusItemsInput): Promise<FocusItemsResponse> {
  const script = generateFocusItemsScript(params);
  const result = await executeOmniJS(script);
  if (!result) return { success: false, error: 'OmniJS returned empty result' };
  return FocusItemsResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to focus on projects/folders.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateFocusItemsScript(params: FocusItemsInput): string {
  const itemIdentifiers = params.items.map((item) => ({
    id: item.id ?? '',
    name: item.name ?? ''
  }));

  return `(function() {
  try {
    if (!app.userVersion.atLeast(new Version('4.0'))) {
      return JSON.stringify({
        success: false,
        error: 'focus_items requires OmniFocus 4.0 or later. Current version: ' + app.userVersion.versionString
      });
    }

    var win = document.windows[0];
    if (!win) {
      return JSON.stringify({
        success: false,
        error: 'No OmniFocus window is open. UI operations require an active window.'
      });
    }

    var itemIdentifiers = ${JSON.stringify(itemIdentifiers)};
    var results = [];
    var succeeded = 0;
    var failed = 0;
    var focusTargets = [];

${generateResolveItemSnippet()}

    for (var i = 0; i < itemIdentifiers.length; i++) {
      var identifier = itemIdentifiers[i];
      var resolved = resolveItem(identifier);

      if (!resolved) {
        results.push({
          itemId: identifier.id || '',
          itemName: identifier.name || '',
          itemType: 'task',
          success: false,
          error: 'Item not found: ' + (identifier.id || identifier.name),
          code: 'NOT_FOUND'
        });
        failed++;
        continue;
      }

      if (resolved.disambiguation) {
        results.push({
          itemId: '',
          itemName: identifier.name || '',
          itemType: 'task',
          success: false,
          error: "Multiple items match '" + identifier.name + "'. Use ID for precision.",
          code: 'DISAMBIGUATION_REQUIRED',
          candidates: resolved.candidates.map(function(c) {
            return { id: c.id, name: c.name, type: c.type };
          })
        });
        failed++;
        continue;
      }

      if (resolved.type === 'task' || resolved.type === 'tag') {
        results.push({
          itemId: resolved.id,
          itemName: resolved.name,
          itemType: resolved.type,
          success: false,
          error: resolved.type.charAt(0).toUpperCase() + resolved.type.slice(1) + 's cannot be focused. Only projects and folders are valid focus targets.',
          code: 'INVALID_TYPE'
        });
        failed++;
        continue;
      }

      focusTargets.push(resolved.object);
      results.push({
        itemId: resolved.id,
        itemName: resolved.name,
        itemType: resolved.type,
        success: true
      });
      succeeded++;
    }

    if (focusTargets.length > 0) {
      win.focus = focusTargets;
    }

    return JSON.stringify({
      success: true,
      results: results,
      summary: { total: itemIdentifiers.length, succeeded: succeeded, failed: failed }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
