import { logger } from '../../utils/logger.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

// Status options for tasks and projects
type TaskStatus = 'incomplete' | 'completed' | 'dropped';
type ProjectStatus = 'active' | 'completed' | 'dropped' | 'onHold';

// Interface for item edit parameters
export interface EditItemParams {
  id?: string; // ID of the task or project to edit
  name?: string; // Name of the task or project to edit (as fallback if ID not provided)
  itemType: 'task' | 'project'; // Type of item to edit

  // Common editable fields
  newName?: string; // New name for the item
  newNote?: string; // New note for the item
  newDueDate?: string; // New due date in ISO format (empty string to clear)
  newDeferDate?: string; // New defer date in ISO format (empty string to clear)
  newFlagged?: boolean; // New flagged status (false to remove flag, true to add flag)
  newEstimatedMinutes?: number; // New estimated minutes

  // Task-specific fields
  newStatus?: TaskStatus; // New status for tasks (incomplete, completed, dropped)
  addTags?: string[]; // Tags to add to the task
  removeTags?: string[]; // Tags to remove from the task
  replaceTags?: string[]; // Tags to replace all existing tags with

  // Project-specific fields
  newSequential?: boolean; // Whether the project should be sequential
  newFolderName?: string; // New folder to move the project to
  newProjectStatus?: ProjectStatus; // New status for projects
}

/**
 * Generate Omni Automation JavaScript for item editing
 */
function generateOmniScript(params: EditItemParams): string {
  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const id = params.id ? escapeForJS(params.id) : '';
  const name = params.name ? escapeForJS(params.name) : '';
  const itemType = params.itemType;

  // Prepare optional values for script generation
  const newNameEscaped = params.newName !== undefined ? escapeForJS(params.newName) : null;
  const newNoteEscaped = params.newNote !== undefined ? escapeForJS(params.newNote) : null;
  const newFolderNameEscaped =
    params.newFolderName !== undefined ? escapeForJS(params.newFolderName) : null;

  // Build the script sections conditionally
  const propertyUpdates: string[] = [];

  // Common property updates
  if (params.newName !== undefined) {
    propertyUpdates.push(`
    // Update name
    foundItem.name = "${newNameEscaped}";
    changedProperties.push("name");`);
  }

  if (params.newNote !== undefined) {
    if (itemType === 'project') {
      propertyUpdates.push(`
    // Update note
    foundItem.task.note = "${newNoteEscaped}";
    changedProperties.push("note");`);
    } else {
      propertyUpdates.push(`
    // Update note
    foundItem.note = "${newNoteEscaped}";
    changedProperties.push("note");`);
    }
  }

  if (params.newDueDate !== undefined) {
    const dateTarget = itemType === 'project' ? 'foundItem.task.dueDate' : 'foundItem.dueDate';
    if (params.newDueDate === '') {
      propertyUpdates.push(`
    // Clear due date
    ${dateTarget} = null;
    changedProperties.push("due date");`);
    } else {
      propertyUpdates.push(`
    // Update due date
    ${dateTarget} = new Date("${params.newDueDate}");
    changedProperties.push("due date");`);
    }
  }

  if (params.newDeferDate !== undefined) {
    const dateTarget = itemType === 'project' ? 'foundItem.task.deferDate' : 'foundItem.deferDate';
    if (params.newDeferDate === '') {
      propertyUpdates.push(`
    // Clear defer date
    ${dateTarget} = null;
    changedProperties.push("defer date");`);
    } else {
      propertyUpdates.push(`
    // Update defer date
    ${dateTarget} = new Date("${params.newDeferDate}");
    changedProperties.push("defer date");`);
    }
  }

  if (params.newFlagged !== undefined) {
    propertyUpdates.push(`
    // Update flagged status
    foundItem.flagged = ${params.newFlagged};
    changedProperties.push("flagged");`);
  }

  if (params.newEstimatedMinutes !== undefined) {
    const target =
      itemType === 'project' ? 'foundItem.task.estimatedMinutes' : 'foundItem.estimatedMinutes';
    propertyUpdates.push(`
    // Update estimated minutes
    ${target} = ${params.newEstimatedMinutes};
    changedProperties.push("estimated minutes");`);
  }

  // Task-specific updates
  if (itemType === 'task') {
    if (params.newStatus !== undefined) {
      if (params.newStatus === 'completed') {
        propertyUpdates.push(`
    // Mark task as completed
    foundItem.markComplete();
    changedProperties.push("status (completed)");`);
      } else if (params.newStatus === 'dropped') {
        propertyUpdates.push(`
    // Mark task as dropped
    foundItem.active = false;
    changedProperties.push("status (dropped)");`);
      } else if (params.newStatus === 'incomplete') {
        propertyUpdates.push(`
    // Mark task as incomplete
    foundItem.markIncomplete();
    foundItem.active = true;
    changedProperties.push("status (incomplete)");`);
      }
    }

    // Handle tag operations
    if (params.replaceTags && params.replaceTags.length > 0) {
      const tagsJSON = JSON.stringify(params.replaceTags);
      propertyUpdates.push(`
    // Replace all tags
    foundItem.clearTags();
    var replaceTagNames = ${tagsJSON};
    replaceTagNames.forEach(function(tagName) {
      var tag = flattenedTags.byName(tagName);
      if (!tag) {
        tag = new Tag(tagName);
      }
      foundItem.addTag(tag);
    });
    changedProperties.push("tags (replaced)");`);
    } else {
      if (params.addTags && params.addTags.length > 0) {
        const tagsJSON = JSON.stringify(params.addTags);
        propertyUpdates.push(`
    // Add tags
    var addTagNames = ${tagsJSON};
    addTagNames.forEach(function(tagName) {
      var tag = flattenedTags.byName(tagName);
      if (!tag) {
        tag = new Tag(tagName);
      }
      foundItem.addTag(tag);
    });
    changedProperties.push("tags (added)");`);
      }

      if (params.removeTags && params.removeTags.length > 0) {
        const tagsJSON = JSON.stringify(params.removeTags);
        propertyUpdates.push(`
    // Remove tags
    var removeTagNames = ${tagsJSON};
    removeTagNames.forEach(function(tagName) {
      var tag = flattenedTags.byName(tagName);
      if (tag) {
        foundItem.removeTag(tag);
      }
    });
    changedProperties.push("tags (removed)");`);
      }
    }
  }

  // Project-specific updates
  if (itemType === 'project') {
    if (params.newSequential !== undefined) {
      propertyUpdates.push(`
    // Update sequential status
    foundItem.sequential = ${params.newSequential};
    changedProperties.push("sequential");`);
    }

    if (params.newProjectStatus !== undefined) {
      let statusCode = 'Project.Status.Active';
      if (params.newProjectStatus === 'onHold') {
        statusCode = 'Project.Status.OnHold';
      } else if (params.newProjectStatus === 'completed') {
        statusCode = 'Project.Status.Done';
      } else if (params.newProjectStatus === 'dropped') {
        statusCode = 'Project.Status.Dropped';
      }
      propertyUpdates.push(`
    // Update project status
    foundItem.status = ${statusCode};
    changedProperties.push("status");`);
    }

    if (params.newFolderName !== undefined) {
      propertyUpdates.push(`
    // Move to new folder
    var destFolder = flattenedFolders.byName("${newFolderNameEscaped}");
    if (!destFolder) {
      destFolder = new Folder("${newFolderNameEscaped}");
    }
    moveSections([foundItem], destFolder);
    changedProperties.push("folder");`);
    }
  }

  return `(function() {
  try {
    var id = "${id}";
    var name = "${name}";
    var itemType = "${itemType}";
    var foundItem = null;
    var changedProperties = [];

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

    var itemName = foundItem.name;
    var itemId = foundItem.id.primaryKey;

    // Apply property updates
    ${propertyUpdates.join('\n')}

    // Return success with details
    return JSON.stringify({
      success: true,
      id: itemId,
      name: itemName,
      changedProperties: changedProperties.join(", ")
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * Edit a task or project in OmniFocus using Omni Automation JavaScript
 */
export async function editItem(params: EditItemParams): Promise<{
  success: boolean;
  id?: string;
  name?: string;
  changedProperties?: string;
  error?: string;
}> {
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
  const tempFile = writeSecureTempFile(script, 'edit_omnifocus', '.js');

  try {
    // Execute via Omni Automation
    const result = (await executeOmniFocusScript(tempFile.path)) as {
      success: boolean;
      id?: string;
      name?: string;
      changedProperties?: string;
      error?: string;
    };

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    // Build success response, only including defined properties
    const response: {
      success: boolean;
      id?: string;
      name?: string;
      changedProperties?: string;
      error?: string;
    } = {
      success: result.success
    };
    if (result.id !== undefined) {
      response.id = result.id;
    }
    if (result.name !== undefined) {
      response.name = result.name;
    }
    if (result.changedProperties !== undefined) {
      response.changedProperties = result.changedProperties;
    }
    return response;
  } catch (error: unknown) {
    logger.error('Error in editItem', 'editItem', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in editItem'
    };
  } finally {
    // Clean up temp file
    tempFile.cleanup();
  }
}
