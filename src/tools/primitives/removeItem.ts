import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

// Interface for item removal parameters
export interface RemoveItemParams {
  id?: string; // ID of the task or project to remove
  name?: string; // Name of the task or project to remove (as fallback if ID not provided)
  itemType: 'task' | 'project'; // Type of item to remove
}

/**
 * Generate Omni Automation JavaScript for item removal
 */
function generateOmniScript(params: RemoveItemParams): string {
  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const id = params.id ? escapeForJS(params.id) : '';
  const name = params.name ? escapeForJS(params.name) : '';
  const itemType = params.itemType;

  return `(function() {
  try {
    var id = "${id}";
    var name = "${name}";
    var itemType = "${itemType}";
    var foundItem = null;

    // Validate we have at least one identifier
    if (!id && !name) {
      return JSON.stringify({ success: false, error: "Either id or name must be provided" });
    }

    // Find the item
    if (itemType === "task") {
      // Try to find task by ID
      if (id && id.length > 0) {
        foundItem = Task.byIdentifier(id);
      }
      // Fall back to name search
      if (!foundItem && name && name.length > 0) {
        foundItem = flattenedTasks.byName(name);
        // Also check inbox
        if (!foundItem) {
          var inboxTasks = inbox;
          for (var i = 0; i < inboxTasks.length; i++) {
            if (inboxTasks[i].name === name) {
              foundItem = inboxTasks[i];
              break;
            }
          }
        }
      }
    } else {
      // Try to find project by ID
      if (id && id.length > 0) {
        foundItem = Project.byIdentifier(id);
      }
      // Fall back to name search
      if (!foundItem && name && name.length > 0) {
        foundItem = flattenedProjects.byName(name);
      }
    }

    if (!foundItem) {
      return JSON.stringify({ success: false, error: "Item not found" });
    }

    // Store item details before deletion
    var itemName = foundItem.name;
    var itemId = foundItem.id.primaryKey;

    // Delete the item
    deleteObject(foundItem);

    // Return success with details
    return JSON.stringify({
      success: true,
      id: itemId,
      name: itemName
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * Remove a task or project from OmniFocus using Omni Automation JavaScript
 */
export async function removeItem(
  params: RemoveItemParams
): Promise<{ success: boolean; id?: string; name?: string; error?: string }> {
  // Validate required parameters
  if (!params) {
    return {
      success: false,
      error: 'Parameters object is required'
    };
  }

  if (!params.id && !params.name) {
    return {
      success: false,
      error: 'Either id or name must be provided'
    };
  }

  if (!params.itemType || !['task', 'project'].includes(params.itemType)) {
    return {
      success: false,
      error: 'itemType must be either "task" or "project"'
    };
  }

  // Generate Omni Automation script
  const script = generateOmniScript(params);

  // Write script to secure temporary file
  const tempFile = writeSecureTempFile(script, 'remove_omnifocus', '.js');

  try {
    // Execute via Omni Automation
    const result = (await executeOmniFocusScript(tempFile.path)) as {
      success: boolean;
      id?: string;
      name?: string;
      error?: string;
    };

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    // Build success response, only including defined properties
    const response: { success: boolean; id?: string; name?: string; error?: string } = {
      success: result.success
    };
    if (result.id !== undefined) {
      response.id = result.id;
    }
    if (result.name !== undefined) {
      response.name = result.name;
    }
    return response;
  } catch (error: unknown) {
    console.error('Error in removeItem:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in removeItem'
    };
  } finally {
    // Clean up temp file
    tempFile.cleanup();
  }
}
