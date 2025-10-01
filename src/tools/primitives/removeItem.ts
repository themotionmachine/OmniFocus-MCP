import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Interface for item removal parameters
export interface RemoveItemParams {
  id?: string;          // ID of the task or project to remove
  name?: string;        // Name of the task or project to remove (as fallback if ID not provided)
  itemType: 'task' | 'project'; // Type of item to remove
}

/**
 * Generate OmniJS script for item removal
 */
function generateJXAScript(params: RemoveItemParams): string {
  const { id, name, itemType } = params;

  // Verify we have at least one identifier
  if (!id && !name) {
    return `JSON.stringify({success: false, error: "Either id or name must be provided"})`;
  }

  return `(() => {
  try {
    let foundItem = null;
    const searchId = ${id ? `"${id.replace(/"/g, '\\"')}"` : 'null'};
    const searchName = ${name ? `"${name.replace(/"/g, '\\"')}"` : 'null'};

    ${itemType === 'task' ? `
    // Search for task
    if (searchId) {
      foundItem = flattenedTasks.find(t => t.id.primaryKey === searchId);

      if (!foundItem) {
        foundItem = inbox.find(t => t.id.primaryKey === searchId);
      }
    }

    if (!foundItem && searchName) {
      foundItem = flattenedTasks.find(t => t.name === searchName);

      if (!foundItem) {
        foundItem = inbox.find(t => t.name === searchName);
      }
    }
    ` : `
    // Search for project
    if (searchId) {
      foundItem = flattenedProjects.find(p => p.id.primaryKey === searchId);
    }

    if (!foundItem && searchName) {
      foundItem = flattenedProjects.find(p => p.name === searchName);
    }
    `}

    if (!foundItem) {
      return JSON.stringify({success: false, error: "Item not found"});
    }

    const itemId = foundItem.id.primaryKey;
    const itemName = foundItem.name;

    // Delete the item
    deleteObject(foundItem);

    return JSON.stringify({
      success: true,
      id: itemId,
      name: itemName
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
 * Remove a task or project from OmniFocus using OmniJS
 */
export async function removeItem(params: RemoveItemParams): Promise<{success: boolean, id?: string, name?: string, error?: string}> {
  try {
    // Generate OmniJS script
    const script = generateJXAScript(params);

    console.error("Executing OmniJS script for removal...");
    console.error(`Item type: ${params.itemType}, ID: ${params.id || 'not provided'}, Name: ${params.name || 'not provided'}`);

    // Write script to temporary file
    const tempFile = `${tmpdir()}/omnifocus_remove_${Date.now()}.js`;
    writeFileSync(tempFile, script);

    // Execute the script
    const result = await executeOmniFocusScript(tempFile);

    // Clean up temp file
    try {
      unlinkSync(tempFile);
    } catch (cleanupError) {
      console.error("Failed to clean up temp file:", cleanupError);
    }

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
      error: result.error
    };
  } catch (error: any) {
    console.error("Error in removeItem execution:", error);

    return {
      success: false,
      error: error?.message || "Unknown error in removeItem"
    };
  }
} 