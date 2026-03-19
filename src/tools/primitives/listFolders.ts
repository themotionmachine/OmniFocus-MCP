import type { z } from 'zod';
import {
  type ListFoldersInputSchema,
  type ListFoldersResponse,
  ListFoldersResponseSchema
} from '../../contracts/folder-tools/list-folders.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

// Use z.input for the parameter type (optional defaults) vs z.infer (required after defaults)
type ListFoldersParams = z.input<typeof ListFoldersInputSchema>;

/**
 * Generate Omni Automation JavaScript for listing folders
 */
function generateOmniScript(params: ListFoldersParams): string {
  const { status, parentId, includeChildren = true } = params;

  const parentIdEscaped = parentId ? escapeForJS(parentId) : '';
  const statusFilter = status ? escapeForJS(status) : '';

  return `(function() {
  try {
    var parentId = "${parentIdEscaped}";
    var statusFilter = "${statusFilter}";
    var includeChildren = ${includeChildren};
    var folders = [];
    var sourceFolders;

    // Determine source folders based on parentId and includeChildren
    if (parentId && parentId.length > 0) {
      // Find the parent folder
      var parentFolder = Folder.byIdentifier(parentId);
      if (!parentFolder) {
        return JSON.stringify({
          success: false,
          error: "Invalid parentId '" + parentId + "': folder not found"
        });
      }
      // Get children based on includeChildren flag
      sourceFolders = includeChildren ? parentFolder.flattenedFolders : parentFolder.folders;
    } else {
      // No parentId - get from library root
      sourceFolders = includeChildren ? flattenedFolders : library.folders;
    }

    // Convert to array and process
    var folderArray = [];
    sourceFolders.forEach(function(folder) {
      folderArray.push(folder);
    });

    // Map folder status to string
    function mapStatus(folder) {
      // Folder.Status enum: Active, Dropped
      if (folder.status === Folder.Status.Dropped) {
        return "dropped";
      }
      return "active";
    }

    // Filter and map folders
    folderArray.forEach(function(folder) {
      var folderStatus = mapStatus(folder);

      // Apply status filter if specified
      if (statusFilter && statusFilter.length > 0) {
        if (folderStatus !== statusFilter) {
          return; // Skip this folder
        }
      }

      folders.push({
        id: folder.id.primaryKey,
        name: folder.name,
        status: folderStatus,
        parentId: folder.parent ? folder.parent.id.primaryKey : null
      });
    });

    return JSON.stringify({
      success: true,
      folders: folders
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * List folders from OmniFocus using Omni Automation JavaScript
 *
 * @param params - Filter parameters (status, parentId, includeChildren)
 * @returns Promise with folders array or error
 */
export async function listFolders(params: ListFoldersParams = {}): Promise<ListFoldersResponse> {
  // Generate Omni Automation script
  const script = generateOmniScript(params);

  try {
    // Execute via Omni Automation (stdin piping, no temp files)
    const result = ListFoldersResponseSchema.parse(await executeOmniJS(script));

    return result;
  } catch (error: unknown) {
    logger.error('Error in listFolders', 'listFolders', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in listFolders'
    };
  }
}
