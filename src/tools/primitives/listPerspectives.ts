import {
  type ListPerspectivesInput,
  type ListPerspectivesResponse,
  ListPerspectivesResponseSchema
} from '../../contracts/perspective-tools/list-perspectives.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * List all perspectives available in OmniFocus.
 *
 * Returns built-in and/or custom perspectives based on the type filter.
 * Custom perspectives include filter aggregation metadata (v4.2+).
 */
export async function listPerspectives(
  params: ListPerspectivesInput
): Promise<ListPerspectivesResponse> {
  logger.debug('Listing perspectives', 'listPerspectives', { type: params.type });
  const script = generateListPerspectivesScript(params);
  const result = await executeOmniJS(script);
  logger.debug('listPerspectives script returned', 'listPerspectives');
  return ListPerspectivesResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to list perspectives.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateListPerspectivesScript(params: ListPerspectivesInput): string {
  const { type } = params;
  // Zod enum ensures `type` is always 'all' | 'builtin' | 'custom', but we use
  // escapeForJS to follow project convention for all string interpolation.
  const escapedType = escapeForJS(type);

  return `(function() {
  try {
    var perspectives = [];
    // Note: || used instead of ?? because OmniJS (ES5-ish) may not support nullish coalescing
    var filterType = "${escapedType}";

    // Check version for filter aggregation support (v4.2+)
    var supportsFilterAggregation = false;
    try {
      supportsFilterAggregation = app.userVersion.atLeast(new Version('4.2'));
    } catch (vErr) {
      supportsFilterAggregation = false;
    }

    // Add built-in perspectives
    if (filterType === "all" || filterType === "builtin") {
      var builtInList = [
        { obj: Perspective.BuiltIn.Inbox, name: "Inbox" },
        { obj: Perspective.BuiltIn.Projects, name: "Projects" },
        { obj: Perspective.BuiltIn.Tags, name: "Tags" },
        { obj: Perspective.BuiltIn.Forecast, name: "Forecast" },
        { obj: Perspective.BuiltIn.Flagged, name: "Flagged" },
        { obj: Perspective.BuiltIn.Review, name: "Review" }
      ];

      // Sort alphabetically
      builtInList.sort(function(a, b) {
        return a.name.localeCompare(b.name);
      });

      for (var i = 0; i < builtInList.length; i++) {
        perspectives.push({
          name: builtInList[i].name,
          type: "builtin",
          identifier: null,
          filterAggregation: null
        });
      }
    }

    // Add custom perspectives
    if (filterType === "all" || filterType === "custom") {
      try {
        var customAll = Perspective.Custom.all;
        var customList = [];

        for (var j = 0; j < customAll.length; j++) {
          var p = customAll[j];
          var filterAggregation = null;

          if (supportsFilterAggregation) {
            try {
              var aggVal = p.archivedTopLevelFilterAggregation;
              filterAggregation = aggVal !== null && aggVal !== undefined ? String(aggVal) : null;
            } catch (aggErr) {
              filterAggregation = null;
            }
          }

          customList.push({
            name: p.name,
            type: "custom",
            // Note: p.identifier || null uses || instead of ?? for OmniJS (ES5-ish) compatibility
            identifier: p.identifier || null,
            filterAggregation: filterAggregation
          });
        }

        // Sort custom alphabetically
        customList.sort(function(a, b) {
          return a.name.localeCompare(b.name);
        });

        for (var k = 0; k < customList.length; k++) {
          perspectives.push(customList[k]);
        }
      } catch (customErr) {
        // Custom perspectives unavailable (Standard edition) - not fatal
      }
    }

    return JSON.stringify({
      success: true,
      perspectives: perspectives,
      totalCount: perspectives.length
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
