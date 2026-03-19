import {
  type AddFolderInput,
  type AddFolderResponse,
  AddFolderResponseSchema
} from '../../contracts/folder-tools/add-folder.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Generate Omni Automation JavaScript for adding a folder
 */
function generateOmniScript(params: AddFolderInput): string {
  const { name, position } = params;

  // Name is already trimmed by Zod schema transform
  const nameEscaped = escapeForJS(name);

  // Determine placement and relativeTo
  const placement = position?.placement ?? 'ending';
  const relativeTo = position?.relativeTo ?? '';
  const relativeToEscaped = escapeForJS(relativeTo);

  return `(function() {
  try {
    var folderName = "${nameEscaped}";
    var placement = "${placement}";
    var relativeTo = "${relativeToEscaped}";

    // Determine insertion location
    var insertionLocation;

    if (placement === "before" || placement === "after") {
      // For before/after, relativeTo is the sibling folder ID
      var siblingFolder = Folder.byIdentifier(relativeTo);
      if (!siblingFolder) {
        return JSON.stringify({
          success: false,
          error: "Invalid relativeTo '" + relativeTo + "': folder not found"
        });
      }
      insertionLocation = siblingFolder[placement];
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
        insertionLocation = parentFolder[placement];
      } else {
        // Library root
        insertionLocation = library[placement];
      }
    } else {
      return JSON.stringify({
        success: false,
        error: "Invalid placement: '" + placement + "'"
      });
    }

    // Create the folder
    var newFolder = new Folder(folderName, insertionLocation);

    return JSON.stringify({
      success: true,
      id: newFolder.id.primaryKey,
      name: newFolder.name
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * Add a new folder to OmniFocus using Omni Automation JavaScript
 *
 * @param params - Folder parameters (name, position)
 * @returns Promise with created folder info or error
 */
export async function addFolder(params: AddFolderInput): Promise<AddFolderResponse> {
  // Generate Omni Automation script
  const script = generateOmniScript(params);

  try {
    // Execute via Omni Automation (stdin piping, no temp files)
    const result = AddFolderResponseSchema.parse(await executeOmniJS(script));

    // Pass through the result (success, or error)
    return result;
  } catch (error: unknown) {
    logger.error('Error in addFolder', 'addFolder', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in addFolder'
    };
  }
}
