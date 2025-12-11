import type { MoveFolderInput } from '../../contracts/folder-tools/move-folder.js';
import type { DisambiguationError } from '../../contracts/folder-tools/shared/disambiguation.js';
import { logger } from '../../utils/logger.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Response type for moveFolder
 */
export type MoveFolderResponse =
  | { success: true; id: string; name: string }
  | { success: false; error: string }
  | DisambiguationError;

/**
 * Generate Omni Automation JavaScript for moving a folder
 */
function generateOmniScript(params: MoveFolderInput): string {
  const { id, name, position } = params;

  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

  const idEscaped = id ? escapeForJS(id) : '';
  const nameEscaped = name ? escapeForJS(name) : '';
  const placement = position.placement;
  const relativeTo = position.relativeTo ?? '';
  const relativeToEscaped = escapeForJS(relativeTo);

  return `(function() {
  try {
    var folderId = "${idEscaped}";
    var folderName = "${nameEscaped}";
    var placement = "${placement}";
    var relativeTo = "${relativeToEscaped}";

    var folder = null;

    // Find folder by ID (takes precedence) or by name
    if (folderId && folderId.length > 0) {
      folder = Folder.byIdentifier(folderId);
      if (!folder) {
        return JSON.stringify({
          success: false,
          error: "Invalid id '" + folderId + "': folder not found"
        });
      }
    } else if (folderName && folderName.length > 0) {
      // Find by name - need to check for disambiguation
      var matchingFolders = [];
      flattenedFolders.forEach(function(f) {
        if (f.name === folderName) {
          matchingFolders.push(f);
        }
      });

      if (matchingFolders.length === 0) {
        return JSON.stringify({
          success: false,
          error: "Invalid name '" + folderName + "': folder not found"
        });
      }

      if (matchingFolders.length > 1) {
        var ids = [];
        matchingFolders.forEach(function(f) {
          ids.push(f.id.primaryKey);
        });
        return JSON.stringify({
          success: false,
          error: "Ambiguous name '" + folderName + "': found " + matchingFolders.length + " matches",
          code: "DISAMBIGUATION_REQUIRED",
          matchingIds: ids
        });
      }

      folder = matchingFolders[0];
    } else {
      return JSON.stringify({
        success: false,
        error: "Either id or name must be provided to identify the folder"
      });
    }

    // Helper function to check if target is a descendant of source
    function isDescendantOf(potentialDescendant, ancestor) {
      var current = potentialDescendant.parent;
      while (current) {
        if (current.id.primaryKey === ancestor.id.primaryKey) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    // Determine target position
    var targetPosition;

    if (placement === "before" || placement === "after") {
      // For before/after, relativeTo is the sibling folder ID
      var siblingFolder = Folder.byIdentifier(relativeTo);
      if (!siblingFolder) {
        return JSON.stringify({
          success: false,
          error: "Invalid relativeTo '" + relativeTo + "': folder not found"
        });
      }
      // Check for circular move
      if (isDescendantOf(siblingFolder, folder) || siblingFolder.id.primaryKey === folder.id.primaryKey) {
        return JSON.stringify({
          success: false,
          error: "Cannot move folder '" + folder.id.primaryKey + "': target is a descendant of source"
        });
      }
      targetPosition = siblingFolder[placement];
    } else if (placement === "beginning" || placement === "ending") {
      // For beginning/ending, relativeTo is the parent folder ID (or empty for library root)
      if (relativeTo && relativeTo.length > 0) {
        var parentFolder = Folder.byIdentifier(relativeTo);
        if (!parentFolder) {
          return JSON.stringify({
            success: false,
            error: "Invalid relativeTo '" + relativeTo + "': folder not found"
          });
        }
        // Check for circular move
        if (isDescendantOf(parentFolder, folder) || parentFolder.id.primaryKey === folder.id.primaryKey) {
          return JSON.stringify({
            success: false,
            error: "Cannot move folder '" + folder.id.primaryKey + "': target is a descendant of source"
          });
        }
        targetPosition = parentFolder[placement];
      } else {
        // Library root
        targetPosition = library[placement];
      }
    } else {
      return JSON.stringify({
        success: false,
        error: "Invalid placement: '" + placement + "'"
      });
    }

    // Move the folder using moveSections
    moveSections([folder], targetPosition);

    return JSON.stringify({
      success: true,
      id: folder.id.primaryKey,
      name: folder.name
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * Move a folder to a new location in OmniFocus using Omni Automation JavaScript
 *
 * @param params - Identification and position parameters
 * @returns Promise with moved folder info, disambiguation error, or standard error
 */
export async function moveFolder(params: MoveFolderInput): Promise<MoveFolderResponse> {
  // Generate Omni Automation script
  const script = generateOmniScript(params);

  // Write script to secure temporary file
  const tempFile = writeSecureTempFile(script, 'move_folder', '.js');

  try {
    // Execute via Omni Automation
    const result = (await executeOmniFocusScript(tempFile.path)) as MoveFolderResponse;

    // Pass through the result (success, error, or disambiguation)
    return result;
  } catch (error: unknown) {
    logger.error('Error in moveFolder', 'moveFolder', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in moveFolder'
    };
  } finally {
    // Clean up temp file
    tempFile.cleanup();
  }
}
