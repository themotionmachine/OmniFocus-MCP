import type { EditFolderInput } from '../../contracts/folder-tools/edit-folder.js';
import type { DisambiguationError } from '../../contracts/folder-tools/shared/disambiguation.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Response type for editFolder
 */
export type EditFolderResponse =
  | { success: true; id: string; name: string }
  | { success: false; error: string }
  | DisambiguationError;

/**
 * Generate Omni Automation JavaScript for editing a folder
 */
function generateOmniScript(params: EditFolderInput): string {
  const { id, name, newName, newStatus } = params;

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
  // newName is already trimmed by Zod schema transform
  const newNameEscaped = newName ? escapeForJS(newName) : '';
  const newStatusValue = newStatus ?? '';

  return `(function() {
  try {
    var folderId = "${idEscaped}";
    var folderName = "${nameEscaped}";
    var newNameValue = "${newNameEscaped}";
    var newStatusValue = "${newStatusValue}";

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

    // Apply updates
    if (newNameValue && newNameValue.length > 0) {
      folder.name = newNameValue;
    }

    if (newStatusValue && newStatusValue.length > 0) {
      if (newStatusValue === "dropped") {
        folder.status = Folder.Status.Dropped;
      } else if (newStatusValue === "active") {
        folder.status = Folder.Status.Active;
      }
    }

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
 * Edit a folder in OmniFocus using Omni Automation JavaScript
 *
 * @param params - Edit parameters (id or name to identify, newName and/or newStatus to update)
 * @returns Promise with updated folder info, disambiguation error, or standard error
 */
export async function editFolder(params: EditFolderInput): Promise<EditFolderResponse> {
  // Generate Omni Automation script
  const script = generateOmniScript(params);

  // Write script to secure temporary file
  const tempFile = writeSecureTempFile(script, 'edit_folder', '.js');

  try {
    // Execute via Omni Automation
    const result = (await executeOmniFocusScript(tempFile.path)) as EditFolderResponse;

    // Pass through the result (success, error, or disambiguation)
    return result;
  } catch (error: unknown) {
    console.error('Error in editFolder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in editFolder'
    };
  } finally {
    // Clean up temp file
    tempFile.cleanup();
  }
}
