import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Interface for folder edit parameters
export interface EditFolderParams {
  id?: string;                      // ID of the folder to edit (preferred)
  name?: string;                    // Name of the folder to edit (as fallback if ID not provided)
  newName?: string;                 // New name for the folder
  newParentFolderName?: string;     // Move to this parent folder (empty string to move to root)
}

/**
 * Generate OmniJS script for folder editing
 */
function generateJXAScript(params: EditFolderParams): string {
  const { id, name } = params;

  // Verify we have at least one identifier
  if (!id && !name) {
    return `JSON.stringify({success: false, error: "Either id or name must be provided"})`;
  }

  return `(() => {
  try {
    // Find the folder to edit using OmniJS implicit globals
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
    const changedProperties = [];

    // Update folder name
    ${params.newName !== undefined ? `
    foundFolder.name = ${JSON.stringify(params.newName)};
    changedProperties.push("name");
    ` : ''}

    // Move to new parent folder
    ${params.newParentFolderName !== undefined ? `
    ${params.newParentFolderName === '' ? `
    // Move to root level using moveSections (to end, less disruptive)
    moveSections([foundFolder], library.ending);
    changedProperties.push("parent folder (moved to root)");
    ` : `
    // Move to specified parent folder using moveSections
    const parentFolderName = ${JSON.stringify(params.newParentFolderName)};
    const parentFolder = flattenedFolders.find(f => f.name === parentFolderName);

    if (!parentFolder) {
      return JSON.stringify({
        success: false,
        error: "Parent folder not found: " + parentFolderName
      });
    }

    moveSections([foundFolder], parentFolder.beginning);
    changedProperties.push("parent folder (moved to " + parentFolderName + ")");
    `}
    ` : ''}

    return JSON.stringify({
      success: true,
      id: folderId,
      name: folderName,
      changedProperties: changedProperties.join(", ")
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
 * Edit a folder in OmniFocus using OmniJS
 */
export async function editFolder(params: EditFolderParams): Promise<{success: boolean, id?: string, name?: string, changedProperties?: string, error?: string}> {
  try {
    // Generate OmniJS script
    const script = generateJXAScript(params);

    console.error("Executing OmniJS script for folder editing...");

    // Write to a temporary file
    const tempFile = `${tmpdir()}/omnifocus_edit_folder_${Date.now()}.js`;
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
      changedProperties: result.changedProperties,
      error: result.error
    };
  } catch (error: any) {
    console.error("Error in editFolder:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in editFolder"
    };
  }
}
