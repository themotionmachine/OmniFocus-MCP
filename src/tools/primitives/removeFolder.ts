import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Interface for folder removal parameters
export interface RemoveFolderParams {
  id?: string;          // ID of the folder to remove (preferred)
  name?: string;        // Name of the folder to remove (as fallback if ID not provided)
}

/**
 * Generate OmniJS script for folder removal
 */
function generateJXAScript(params: RemoveFolderParams): string {
  const { id, name } = params;

  // Verify we have at least one identifier
  if (!id && !name) {
    return `JSON.stringify({success: false, error: "Either id or name must be provided"})`;
  }

  return `(() => {
  try {
    let foundFolder = null;
    const searchId = ${id ? `"${id.replace(/"/g, '\\"')}"` : 'null'};
    const searchName = ${name ? `"${name.replace(/"/g, '\\"')}"` : 'null'};

    // Search for folder
    if (searchId) {
      foundFolder = flattenedFolders.find(f => f.id.primaryKey === searchId);
    }

    if (!foundFolder && searchName) {
      foundFolder = flattenedFolders.find(f => f.name === searchName);
    }

    if (!foundFolder) {
      return JSON.stringify({success: false, error: "Folder not found"});
    }

    const folderId = foundFolder.id.primaryKey;
    const folderName = foundFolder.name;

    // CRITICAL: Move all projects to root BEFORE deleting folder
    // (Otherwise projects get cascade deleted - data loss!)
    const projects = foundFolder.projects;
    const projectCount = projects.length;

    if (projectCount > 0) {
      // Move all projects to end of root level (less disruptive)
      moveSections(projects, library.ending);
    }

    // Also recursively move any child folders to root
    const childFolders = foundFolder.folders;
    const childFolderCount = childFolders.length;

    if (childFolderCount > 0) {
      moveSections(childFolders, library.ending);
    }

    // Now safe to delete the folder
    deleteObject(foundFolder);

    return JSON.stringify({
      success: true,
      id: folderId,
      name: folderName,
      projectsMoved: projectCount,
      childFoldersMoved: childFolderCount
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();`;
}

/**
 * Remove a folder from OmniFocus using OmniJS
 */
export async function removeFolder(params: RemoveFolderParams): Promise<{success: boolean, id?: string, name?: string, projectsMoved?: number, childFoldersMoved?: number, error?: string}> {
  try {
    // Generate OmniJS script
    const script = generateJXAScript(params);

    console.error("Executing OmniJS script for folder removal...");

    // Write to a temporary file
    const tempFile = `${tmpdir()}/omnifocus_remove_folder_${Date.now()}.js`;
    writeFileSync(tempFile, script, { encoding: 'utf8' });

    // Execute the script
    const result = await executeOmniFocusScript(tempFile);

    // Cleanup temp file
    try { unlinkSync(tempFile); } catch {}

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    // Return the result
    return {
      success: result.success,
      id: result.id,
      name: result.name,
      projectsMoved: result.projectsMoved,
      childFoldersMoved: result.childFoldersMoved,
      error: result.error
    };
  } catch (error: any) {
    console.error("Error in removeFolder:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in removeFolder"
    };
  }
}
