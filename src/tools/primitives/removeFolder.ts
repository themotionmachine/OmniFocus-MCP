import type { RemoveFolderInput } from '../../contracts/folder-tools/remove-folder.js';
import type { DisambiguationError } from '../../contracts/folder-tools/shared/disambiguation.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Response type for removeFolder
 */
export type RemoveFolderResponse =
  | { success: true; id: string; name: string }
  | { success: false; error: string }
  | DisambiguationError;

/**
 * Generate Omni Automation JavaScript for removing a folder
 */
function generateOmniScript(params: RemoveFolderInput): string {
  const { id, name } = params;

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

  return `(function() {
  try {
    var folderId = "${idEscaped}";
    var folderName = "${nameEscaped}";

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

    // Capture folder info before deletion
    var capturedId = folder.id.primaryKey;
    var capturedName = folder.name;

    // Delete the folder (recursive deletion of contents is automatic)
    deleteObject(folder);

    return JSON.stringify({
      success: true,
      id: capturedId,
      name: capturedName
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * Remove a folder from OmniFocus using Omni Automation JavaScript
 *
 * @param params - Identification parameters (id or name)
 * @returns Promise with deleted folder info, disambiguation error, or standard error
 */
export async function removeFolder(params: RemoveFolderInput): Promise<RemoveFolderResponse> {
  // Generate Omni Automation script
  const script = generateOmniScript(params);

  // Write script to secure temporary file
  const tempFile = writeSecureTempFile(script, 'remove_folder', '.js');

  try {
    // Execute via Omni Automation
    const result = (await executeOmniFocusScript(tempFile.path)) as RemoveFolderResponse;

    // Pass through the result (success, error, or disambiguation)
    return result;
  } catch (error: unknown) {
    console.error('Error in removeFolder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in removeFolder'
    };
  } finally {
    // Clean up temp file
    tempFile.cleanup();
  }
}
