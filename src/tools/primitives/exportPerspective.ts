import type {
  ExportPerspectiveInput,
  ExportPerspectiveResponse
} from '../../contracts/perspective-tools/export-perspective.js';
import { BUILT_IN_PERSPECTIVE_NAMES } from '../../contracts/perspective-tools/shared/perspective-identifier.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Export a custom perspective's configuration.
 *
 * Only custom perspectives can be exported. When saveTo is provided, writes
 * a .ofocus-perspective file to the directory. When omitted, returns metadata.
 */
export async function exportPerspective(
  params: ExportPerspectiveInput
): Promise<ExportPerspectiveResponse> {
  const script = generateExportPerspectiveScript(params);
  const result = await executeOmniJS(script);
  return result as ExportPerspectiveResponse;
}

/**
 * Generate OmniJS script to export a perspective.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateExportPerspectiveScript(params: ExportPerspectiveInput): string {
  const { name, identifier, saveTo } = params;

  const escapedId = identifier ? escapeForJS(identifier) : '';
  const escapedName = name ? escapeForJS(name) : '';
  const escapedSaveTo = saveTo ? escapeForJS(saveTo) : '';
  const builtInNamesJson = JSON.stringify([...BUILT_IN_PERSPECTIVE_NAMES]);

  return `(function() {
  try {
    var perspId = "${escapedId}";
    var perspName = "${escapedName}";
    var saveTo = "${escapedSaveTo}";
    var BUILT_IN_NAMES = ${builtInNamesJson};

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

    // If identifier provided, try byIdentifier first
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
      // Check if it's a built-in perspective
      if (isBuiltIn(perspName)) {
        return JSON.stringify({
          success: false,
          error: "Built-in perspectives cannot be exported",
          code: "BUILTIN_NOT_EXPORTABLE"
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

    var perspIdentifier = targetPerspective.identifier;
    var perspDisplayName = targetPerspective.name;

    // Get file wrapper for export
    var wrapper = targetPerspective.fileWrapper();
    var fileName = wrapper.preferredFilename || (perspDisplayName + ".ofocus-perspective");
    var fileType = wrapper.fileType || "com.omnigroup.omnifocus.perspective";

    if (saveTo && saveTo.length > 0) {
      // Write file to directory
      try {
        var dirURL = URL.fromString("file://" + saveTo + "/");
        targetPerspective.writeFileRepresentationIntoDirectory(dirURL);
        var filePath = saveTo + "/" + fileName;

        return JSON.stringify({
          success: true,
          perspectiveName: perspDisplayName,
          perspectiveId: perspIdentifier,
          filePath: filePath,
          message: "Exported '" + perspDisplayName + "' perspective to " + filePath
        });
      } catch (writeErr) {
        return JSON.stringify({
          success: false,
          error: "Directory does not exist or is not writable: " + saveTo,
          code: "INVALID_DIRECTORY"
        });
      }
    } else {
      // Return metadata only
      return JSON.stringify({
        success: true,
        perspectiveName: perspDisplayName,
        perspectiveId: perspIdentifier,
        fileName: fileName,
        fileType: fileType,
        message: "Export metadata for '" + perspDisplayName + "' perspective"
      });
    }

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
