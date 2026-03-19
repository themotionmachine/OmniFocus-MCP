import type {
  GetPerspectiveInput,
  GetPerspectiveResponse
} from '../../contracts/perspective-tools/get-perspective.js';
import { BUILT_IN_PERSPECTIVE_NAMES } from '../../contracts/perspective-tools/shared/perspective-identifier.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Get detailed information about a single perspective.
 *
 * Looks up by identifier (custom only) or name (both built-in and custom).
 * Identifier takes precedence when both are provided.
 */
export async function getPerspective(params: GetPerspectiveInput): Promise<GetPerspectiveResponse> {
  const script = generateGetPerspectiveScript(params);
  const result = await executeOmniJS(script);
  return result as GetPerspectiveResponse;
}

/**
 * Generate OmniJS script to get perspective details.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateGetPerspectiveScript(params: GetPerspectiveInput): string {
  const { name, identifier } = params;

  const escapedId = identifier ? escapeForJS(identifier) : '';
  const escapedName = name ? escapeForJS(name) : '';
  const builtInNamesJson = JSON.stringify([...BUILT_IN_PERSPECTIVE_NAMES]);

  return `(function() {
  try {
    var perspId = "${escapedId}";
    var perspName = "${escapedName}";
    var BUILT_IN_NAMES = ${builtInNamesJson};

    // Check version for filter rules support (v4.2+)
    var supportsFilterRules = false;
    try {
      supportsFilterRules = app.userVersion.atLeast(new Version('4.2'));
    } catch (vErr) {
      supportsFilterRules = false;
    }

    // Check if name is a built-in (case-insensitive)
    function isBuiltIn(n) {
      var lowerN = n.toLowerCase();
      for (var i = 0; i < BUILT_IN_NAMES.length; i++) {
        if (BUILT_IN_NAMES[i].toLowerCase() === lowerN) {
          return BUILT_IN_NAMES[i]; // return canonical name
        }
      }
      return null;
    }

    // If identifier provided, try custom byIdentifier first
    if (perspId && perspId.length > 0) {
      var byId = Perspective.Custom.byIdentifier(perspId);
      if (byId) {
        var filterRules = null;
        var filterAggregation = null;

        if (supportsFilterRules) {
          try {
            filterRules = byId.archivedFilterRules !== undefined ? byId.archivedFilterRules : null;
          } catch (frErr) {
            filterRules = null;
          }
          try {
            var aggVal = byId.archivedTopLevelFilterAggregation;
            filterAggregation = aggVal !== null && aggVal !== undefined ? String(aggVal) : null;
          } catch (aggErr) {
            filterAggregation = null;
          }
        }

        return JSON.stringify({
          success: true,
          perspective: {
            name: byId.name,
            identifier: byId.identifier,
            type: "custom",
            filterRules: filterRules,
            filterAggregation: filterAggregation
          }
        });
      }

      return JSON.stringify({
        success: false,
        error: "Perspective '" + perspId + "' not found",
        code: "NOT_FOUND"
      });
    }

    // Name-based lookup
    if (!perspName || perspName.length === 0) {
      return JSON.stringify({
        success: false,
        error: "At least one of name or identifier is required"
      });
    }

    // Check built-in first (case-insensitive)
    var canonicalBuiltIn = isBuiltIn(perspName);
    if (canonicalBuiltIn) {
      return JSON.stringify({
        success: true,
        perspective: {
          name: canonicalBuiltIn,
          type: "builtin"
        }
      });
    }

    // Try custom by exact name, then partial matches
    var byName = Perspective.Custom.byName(perspName);
    if (byName) {
      // byName returns first match or null; look for all matches for disambiguation
      var allCustom = Perspective.Custom.all;
      var matches = [];
      for (var j = 0; j < allCustom.length; j++) {
        if (allCustom[j].name === perspName) {
          matches.push(allCustom[j]);
        }
      }

      if (matches.length === 1) {
        var p = matches[0];
        var pFilterRules = null;
        var pFilterAgg = null;

        if (supportsFilterRules) {
          try {
            pFilterRules = p.archivedFilterRules !== undefined ? p.archivedFilterRules : null;
          } catch (frErr2) {
            pFilterRules = null;
          }
          try {
            var pAggVal = p.archivedTopLevelFilterAggregation;
            pFilterAgg = pAggVal !== null && pAggVal !== undefined ? String(pAggVal) : null;
          } catch (aggErr2) {
            pFilterAgg = null;
          }
        }

        return JSON.stringify({
          success: true,
          perspective: {
            name: p.name,
            identifier: p.identifier,
            type: "custom",
            filterRules: pFilterRules,
            filterAggregation: pFilterAgg
          }
        });
      } else if (matches.length > 1) {
        var candidates = matches.map(function(m) {
          return { name: m.name, identifier: m.identifier };
        });
        return JSON.stringify({
          success: false,
          error: "Multiple perspectives match '" + perspName + "'",
          code: "DISAMBIGUATION_REQUIRED",
          candidates: candidates
        });
      }
    }

    return JSON.stringify({
      success: false,
      error: "Perspective '" + perspName + "' not found",
      code: "NOT_FOUND"
    });

  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}

/**
 * Escape string for safe embedding in JavaScript.
 */
function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
