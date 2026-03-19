import { BUILT_IN_PERSPECTIVE_NAMES } from '../../contracts/perspective-tools/shared/perspective-identifier.js';
import type {
  SwitchPerspectiveInput,
  SwitchPerspectiveResponse
} from '../../contracts/perspective-tools/switch-perspective.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Switch the active OmniFocus window to display the specified perspective.
 *
 * WARNING: This is a UI-affecting operation. Calling this changes what the
 * user sees on screen immediately.
 */
export async function switchPerspective(
  params: SwitchPerspectiveInput
): Promise<SwitchPerspectiveResponse> {
  const script = generateSwitchPerspectiveScript(params);
  const result = await executeOmniJS(script);
  return result as SwitchPerspectiveResponse;
}

/**
 * Generate OmniJS script to switch the active perspective.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSwitchPerspectiveScript(params: SwitchPerspectiveInput): string {
  const { name, identifier } = params;

  const escapedId = identifier ? escapeForJS(identifier) : '';
  const escapedName = name ? escapeForJS(name) : '';
  const builtInNamesJson = JSON.stringify([...BUILT_IN_PERSPECTIVE_NAMES]);

  return `(function() {
  try {
    var perspId = "${escapedId}";
    var perspName = "${escapedName}";
    var BUILT_IN_NAMES = ${builtInNamesJson};

    // Validate a window is open
    if (!document.windows || document.windows.length === 0) {
      return JSON.stringify({
        success: false,
        error: "No OmniFocus window is open",
        code: "NO_WINDOW"
      });
    }

    var win = document.windows[0];

    // Capture previous perspective name
    var previousPerspective = null;
    try {
      var prevPersp = win.perspective;
      if (prevPersp) {
        if (prevPersp.name) {
          previousPerspective = prevPersp.name;
        } else {
          // Built-in perspective - identify by comparison
          var builtInMap = [
            { obj: Perspective.BuiltIn.Inbox, name: "Inbox" },
            { obj: Perspective.BuiltIn.Projects, name: "Projects" },
            { obj: Perspective.BuiltIn.Tags, name: "Tags" },
            { obj: Perspective.BuiltIn.Forecast, name: "Forecast" },
            { obj: Perspective.BuiltIn.Flagged, name: "Flagged" },
            { obj: Perspective.BuiltIn.Review, name: "Review" }
          ];
          for (var b = 0; b < builtInMap.length; b++) {
            if (prevPersp === builtInMap[b].obj) {
              previousPerspective = builtInMap[b].name;
              break;
            }
          }
        }
      }
    } catch (prevErr) {
      previousPerspective = null;
    }

    // Check if name is a built-in (case-insensitive)
    function isBuiltIn(n) {
      var lowerN = n.toLowerCase();
      for (var i = 0; i < BUILT_IN_NAMES.length; i++) {
        if (BUILT_IN_NAMES[i].toLowerCase() === lowerN) {
          return BUILT_IN_NAMES[i];
        }
      }
      return null;
    }

    var targetPerspective = null;
    var targetName = null;

    // If identifier provided, try custom byIdentifier first
    if (perspId && perspId.length > 0) {
      var byId = Perspective.Custom.byIdentifier(perspId);
      if (byId) {
        targetPerspective = byId;
        targetName = byId.name;
      } else {
        return JSON.stringify({
          success: false,
          error: "Perspective '" + perspId + "' not found",
          code: "NOT_FOUND"
        });
      }
    } else if (perspName && perspName.length > 0) {
      // Check built-in first
      var canonicalBuiltIn = isBuiltIn(perspName);
      if (canonicalBuiltIn) {
        var builtInMap2 = {
          "Inbox": Perspective.BuiltIn.Inbox,
          "Projects": Perspective.BuiltIn.Projects,
          "Tags": Perspective.BuiltIn.Tags,
          "Forecast": Perspective.BuiltIn.Forecast,
          "Flagged": Perspective.BuiltIn.Flagged,
          "Review": Perspective.BuiltIn.Review
        };
        targetPerspective = builtInMap2[canonicalBuiltIn];
        targetName = canonicalBuiltIn;
      } else {
        // Custom by name
        var allCustom = Perspective.Custom.all;
        var matches = [];
        for (var j = 0; j < allCustom.length; j++) {
          if (allCustom[j].name === perspName) {
            matches.push(allCustom[j]);
          }
        }

        if (matches.length === 0) {
          return JSON.stringify({
            success: false,
            error: "Perspective '" + perspName + "' not found",
            code: "NOT_FOUND"
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

        targetPerspective = matches[0];
        targetName = matches[0].name;
      }
    }

    if (!targetPerspective) {
      return JSON.stringify({
        success: false,
        error: "Perspective not found",
        code: "NOT_FOUND"
      });
    }

    // Switch the perspective
    win.perspective = targetPerspective;

    return JSON.stringify({
      success: true,
      perspectiveName: targetName,
      previousPerspective: previousPerspective,
      message: "Switched to '" + targetName + "' perspective"
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
