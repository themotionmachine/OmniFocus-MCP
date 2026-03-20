import {
  type SetPerspectiveIconInput,
  type SetPerspectiveIconResponse,
  SetPerspectiveIconResponseSchema
} from '../../contracts/perspective-tools/set-perspective-icon.js';
import { BUILT_IN_PERSPECTIVE_NAMES } from '../../contracts/perspective-tools/shared/perspective-identifier.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Set the icon color of a custom perspective.
 *
 * Requires OmniFocus v4.5.2+. CSS hex colors are parsed in TypeScript
 * and passed as pre-computed float values to Color.RGB().
 */
export async function setPerspectiveIcon(
  params: SetPerspectiveIconInput
): Promise<SetPerspectiveIconResponse> {
  logger.debug('Setting perspective icon', 'setPerspectiveIcon', {
    name: params.name,
    identifier: params.identifier,
    color: params.color
  });
  const { name, identifier, color } = params;

  // Parse CSS hex to RGBA float values in TypeScript (AD-005)
  const { r, g, b, a } = parseCssHexToRgba(color);

  const script = generateSetPerspectiveIconScript({ name, identifier, color }, r, g, b, a);
  const result = await executeOmniJS(script);
  logger.debug('setPerspectiveIcon script returned', 'setPerspectiveIcon');
  return SetPerspectiveIconResponseSchema.parse(result);
}

/**
 * Parse CSS hex color (#RGB, #RGBA, #RRGGBB, #RRGGBBAA) to RGBA floats [0..1].
 */
export function parseCssHexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  const h = hex.slice(1); // remove '#'

  let r: number;
  let g: number;
  let b: number;
  let a: number;

  if (h.length === 3) {
    // #RGB -> #RRGGBB
    const c0 = h.charAt(0);
    const c1 = h.charAt(1);
    const c2 = h.charAt(2);
    r = parseInt(c0 + c0, 16) / 255;
    g = parseInt(c1 + c1, 16) / 255;
    b = parseInt(c2 + c2, 16) / 255;
    a = 1;
  } else if (h.length === 4) {
    // #RGBA -> #RRGGBBAA
    const c0 = h.charAt(0);
    const c1 = h.charAt(1);
    const c2 = h.charAt(2);
    const c3 = h.charAt(3);
    r = parseInt(c0 + c0, 16) / 255;
    g = parseInt(c1 + c1, 16) / 255;
    b = parseInt(c2 + c2, 16) / 255;
    a = parseInt(c3 + c3, 16) / 255;
  } else if (h.length === 6) {
    // #RRGGBB
    r = parseInt(h.slice(0, 2), 16) / 255;
    g = parseInt(h.slice(2, 4), 16) / 255;
    b = parseInt(h.slice(4, 6), 16) / 255;
    a = 1;
  } else {
    // #RRGGBBAA
    r = parseInt(h.slice(0, 2), 16) / 255;
    g = parseInt(h.slice(2, 4), 16) / 255;
    b = parseInt(h.slice(4, 6), 16) / 255;
    a = parseInt(h.slice(6, 8), 16) / 255;
  }

  return { r, g, b, a };
}

/**
 * Generate OmniJS script to set perspective icon color.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSetPerspectiveIconScript(
  params: Pick<SetPerspectiveIconInput, 'name' | 'identifier' | 'color'>,
  r: number,
  g: number,
  b: number,
  a: number
): string {
  const { name, identifier, color } = params;

  const escapedId = identifier ? escapeForJS(identifier) : '';
  const escapedName = name ? escapeForJS(name) : '';
  const escapedColor = escapeForJS(color);
  const builtInNamesJson = JSON.stringify([...BUILT_IN_PERSPECTIVE_NAMES]);

  return `(function() {
  try {
    var perspId = "${escapedId}";
    var perspName = "${escapedName}";
    var cssColor = "${escapedColor}";
    var BUILT_IN_NAMES = ${builtInNamesJson};

    // Version gate: iconColor requires v4.5.2+
    var supportsIconColor = false;
    try {
      supportsIconColor = app.userVersion.atLeast(new Version('4.5.2'));
    } catch (vErr) {
      supportsIconColor = false;
    }

    if (!supportsIconColor) {
      return JSON.stringify({
        success: false,
        error: "iconColor requires OmniFocus v4.5.2 or later",
        code: "VERSION_NOT_SUPPORTED"
      });
    }

    // Check if name is a built-in (case-insensitive)
    function isBuiltIn(n) {
      var lowerN = n.toLowerCase();
      for (var i = 0; i < BUILT_IN_NAMES.length; i++) {
        if (BUILT_IN_NAMES[i].toLowerCase() === lowerN) {
          return true;
        }
      }
      return false;
    }

    var targetPerspective = null;

    // Identifier takes precedence
    if (perspId && perspId.length > 0) {
      targetPerspective = Perspective.Custom.byIdentifier(perspId);
      if (!targetPerspective) {
        return JSON.stringify({
          success: false,
          error: "Perspective '" + perspId + "' not found",
          code: "NOT_FOUND"
        });
      }
    } else if (perspName && perspName.length > 0) {
      // Built-in check
      if (isBuiltIn(perspName)) {
        return JSON.stringify({
          success: false,
          error: "Cannot modify built-in perspective icon color",
          code: "BUILTIN_NOT_MODIFIABLE"
        });
      }

      // Custom name lookup
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
    }

    if (!targetPerspective) {
      return JSON.stringify({
        success: false,
        error: "Perspective not found",
        code: "NOT_FOUND"
      });
    }

    // Apply pre-computed RGBA floats (conversion done in TypeScript, not OmniJS)
    var color = Color.RGB(${r}, ${g}, ${b}, ${a});
    targetPerspective.iconColor = color;

    return JSON.stringify({
      success: true,
      perspectiveName: targetPerspective.name,
      perspectiveId: targetPerspective.identifier,
      color: cssColor,
      message: "Icon color set to " + cssColor + " for '" + targetPerspective.name + "'"
    });

  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
