import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Interface for folder creation parameters
export interface AddFolderParams {
  name: string;
  parentFolderName?: string; // Optional parent folder for nested folders
}

/**
 * Generate OmniJS script for folder creation
 */
function generateJXAScript(params: AddFolderParams): string {
  return `(() => {
  try {
    let newFolder = null;

    ${params.parentFolderName ? `
    // Create in specified parent folder
    const parentFolderName = ${JSON.stringify(params.parentFolderName)};
    let parentFolder = flattenedFolders.find(f => f.name === parentFolderName);

    if (!parentFolder) {
      return JSON.stringify({
        success: false,
        error: "Parent folder not found: " + parentFolderName
      });
    }

    newFolder = new Folder(${JSON.stringify(params.name)}, parentFolder);
    ` : `
    // Create folder at the root level (at end, less disruptive)
    newFolder = new Folder(${JSON.stringify(params.name)}, library.ending);
    `}

    const folderId = newFolder.id.primaryKey;

    return JSON.stringify({
      success: true,
      folderId: folderId,
      name: ${JSON.stringify(params.name)}
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
 * Add a folder to OmniFocus using OmniJS
 */
export async function addFolder(params: AddFolderParams): Promise<{success: boolean, folderId?: string, error?: string}> {
  try {
    // Generate OmniJS script
    const script = generateJXAScript(params);

    console.error("Executing OmniJS script for folder creation...");

    // Write to a temporary file
    const tempFile = `${tmpdir()}/omnifocus_add_folder_${Date.now()}.js`;
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
      folderId: result.folderId,
      error: result.error
    };
  } catch (error: any) {
    console.error("Error in addFolder:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in addFolder"
    };
  }
}
