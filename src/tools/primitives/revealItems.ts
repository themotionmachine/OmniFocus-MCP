import {
  type RevealItemsInput,
  type RevealItemsResponse,
  RevealItemsResponseSchema
} from '../../contracts/window-tools/reveal-items.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';
import { generateResolveItemSnippet } from './shared/resolveItemSnippet.js';

/**
 * Reveal one or more items in the OmniFocus outline.
 *
 * Scrolls and expands the hierarchy so targeted items become visible on screen.
 * Requires OmniFocus 4.0+ and an active window with content tree.
 *
 * Uses `tree.reveal(nodes)` for batch reveal of resolved TreeNodes.
 *
 * @param params - Input containing items array (1-10)
 * @returns Promise resolving to batch result with per-item success/failure
 */
export async function revealItems(params: RevealItemsInput): Promise<RevealItemsResponse> {
  const script = generateRevealItemsScript(params);
  const result = await executeOmniJS(script);
  if (!result) return { success: false, error: 'OmniJS returned empty result' };
  return RevealItemsResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to reveal items in the outline.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateRevealItemsScript(params: RevealItemsInput): string {
  const itemIdentifiers = params.items.map((item) => ({
    id: item.id ?? '',
    name: item.name ?? ''
  }));

  return `(function() {
  try {
    if (!app.userVersion.atLeast(new Version('4.0'))) {
      return JSON.stringify({
        success: false,
        error: 'reveal_items requires OmniFocus 4.0 or later. Current version: ' + app.userVersion.versionString
      });
    }

    var win = document.windows[0];
    if (!win) {
      return JSON.stringify({
        success: false,
        error: 'No OmniFocus window is open. UI operations require an active window.'
      });
    }

    var tree = win.content;
    if (!tree) {
      return JSON.stringify({
        success: false,
        error: 'Content tree not available. UI control operations require a fully loaded OmniFocus window.'
      });
    }

    var itemIdentifiers = ${JSON.stringify(itemIdentifiers)};
    var results = [];
    var succeeded = 0;
    var failed = 0;
    var nodesToReveal = [];

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

      var node = tree.nodeForObject(resolved.object);
      if (!node) {
        results.push({
          itemId: resolved.id,
          itemName: resolved.name,
          itemType: resolved.type,
          success: false,
          error: 'Item exists but is not visible in the current perspective',
          code: 'NODE_NOT_FOUND'
        });
        failed++;
        continue;
      }

      nodesToReveal.push(node);
      results.push({
        itemId: resolved.id,
        itemName: resolved.name,
        itemType: resolved.type,
        success: true
      });
      succeeded++;
    }

    if (nodesToReveal.length > 0) {
      tree.reveal(nodesToReveal);
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
