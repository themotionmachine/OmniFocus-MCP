import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Status options for tasks and projects
type TaskStatus = 'incomplete' | 'completed' | 'dropped';
type ProjectStatus = 'active' | 'completed' | 'dropped' | 'onHold';

// Interface for item edit parameters
export interface EditItemParams {
  id?: string;                  // ID of the task or project to edit
  name?: string;                // Name of the task or project to edit (as fallback if ID not provided)
  itemType: 'task' | 'project'; // Type of item to edit
  
  // Common editable fields
  newName?: string;             // New name for the item
  newNote?: string;             // New note for the item
  newDueDate?: string;          // New due date in ISO format (empty string to clear)
  newDeferDate?: string;        // New defer date in ISO format (empty string to clear)
  newPlannedDate?: string;      // New planned date in ISO format (empty string to clear, tasks only)
  newFlagged?: boolean;         // New flagged status (false to remove flag, true to add flag)
  newEstimatedMinutes?: number; // New estimated minutes
  
  // Task-specific fields
  newStatus?: TaskStatus;       // New status for tasks (incomplete, completed, dropped)
  addTags?: string[];           // Tags to add to the task
  removeTags?: string[];        // Tags to remove from the task
  replaceTags?: string[];       // Tags to replace all existing tags with
  
  // Project-specific fields
  newSequential?: boolean;      // Whether the project should be sequential
  newFolderName?: string;       // New folder to move the project to
  newProjectStatus?: ProjectStatus; // New status for projects
  newReviewInterval?: { steps: number; unit: string }; // New review interval for projects
  markReviewed?: boolean;       // Mark project as reviewed (sets lastReviewDate to now)
}

/**
 * Generate OmniJS script for item editing
 */
function generateJXAScript(params: EditItemParams): string {
  const { id, name, itemType } = params;

  // Verify we have at least one identifier
  if (!id && !name) {
    return `JSON.stringify({success: false, error: "Either id or name must be provided"})`;
  }

  return `(() => {
  try {
    // Find the item to edit using OmniJS implicit globals
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
    const changedProperties = [];

    // Common property updates
    ${params.newName !== undefined ? `
    foundItem.name = ${JSON.stringify(params.newName)};
    changedProperties.push("name");
    ` : ''}

    ${params.newNote !== undefined ? `
    foundItem.note = ${JSON.stringify(params.newNote)};
    changedProperties.push("note");
    ` : ''}

    ${params.newDueDate !== undefined ? `
    ${params.newDueDate === ''
      ? 'foundItem.dueDate = null;'
      : `foundItem.dueDate = new Date(${JSON.stringify(params.newDueDate)});`}
    changedProperties.push("due date");
    ` : ''}

    ${params.newDeferDate !== undefined ? `
    ${params.newDeferDate === ''
      ? 'foundItem.deferDate = null;'
      : `foundItem.deferDate = new Date(${JSON.stringify(params.newDeferDate)});`}
    changedProperties.push("defer date");
    ` : ''}

    ${params.newPlannedDate !== undefined ? `
    ${params.newPlannedDate === ''
      ? 'foundItem.plannedDate = null;'
      : `foundItem.plannedDate = new Date(${JSON.stringify(params.newPlannedDate)});`}
    changedProperties.push("planned date");
    ` : ''}

    ${params.newFlagged !== undefined ? `
    foundItem.flagged = ${params.newFlagged};
    changedProperties.push("flagged");
    ` : ''}

    ${params.newEstimatedMinutes !== undefined ? `
    foundItem.estimatedMinutes = ${params.newEstimatedMinutes};
    changedProperties.push("estimated minutes");
    ` : ''}

    ${itemType === 'task' ? `
    // Task-specific updates
    ${params.newStatus !== undefined ? `
    ${params.newStatus === 'completed' ? `
    foundItem.markComplete();
    changedProperties.push("status (completed)");
    ` : params.newStatus === 'dropped' ? `
    foundItem.drop();
    changedProperties.push("status (dropped)");
    ` : `
    foundItem.markIncomplete();
    changedProperties.push("status (incomplete)");
    `}
    ` : ''}

    ${params.replaceTags ? `
    // Replace all tags
    foundItem.clearTags();

    const newTagNames = ${JSON.stringify(params.replaceTags)};
    newTagNames.forEach(tagName => {
      let tag = flattenedTags.find(t => t.name === tagName);
      if (!tag) {
        tag = new Tag(tagName);
      }
      foundItem.addTag(tag);
    });
    changedProperties.push("tags (replaced)");
    ` : ''}

    ${params.addTags ? `
    // Add tags
    const addTagNames = ${JSON.stringify(params.addTags)};
    addTagNames.forEach(tagName => {
      let tag = flattenedTags.find(t => t.name === tagName);
      if (!tag) {
        tag = new Tag(tagName);
      }
      foundItem.addTag(tag);
    });
    changedProperties.push("tags (added)");
    ` : ''}

    ${params.removeTags ? `
    // Remove tags
    const removeTagNames = ${JSON.stringify(params.removeTags)};
    removeTagNames.forEach(tagName => {
      const tag = flattenedTags.find(t => t.name === tagName);
      if (tag) {
        foundItem.removeTag(tag);
      }
    });
    changedProperties.push("tags (removed)");
    ` : ''}
    ` : `
    // Project-specific updates
    ${params.newSequential !== undefined ? `
    foundItem.sequential = ${params.newSequential};
    changedProperties.push("sequential");
    ` : ''}

    ${params.newProjectStatus !== undefined ? `
    const Project = app.Project;
    ${params.newProjectStatus === 'active'
      ? 'foundItem.status = Project.Status.Active;'
      : params.newProjectStatus === 'completed'
      ? 'foundItem.status = Project.Status.Done;'
      : params.newProjectStatus === 'dropped'
      ? 'foundItem.status = Project.Status.Dropped;'
      : 'foundItem.status = Project.Status.OnHold;'}
    changedProperties.push("status");
    ` : ''}

    ${params.newFolderName !== undefined ? `
    // Move to new folder using moveSections
    const folderName = ${JSON.stringify(params.newFolderName)};
    let destFolder = flattenedFolders.find(f => f.name === folderName);

    if (!destFolder) {
      destFolder = new Folder(folderName, library.ending);
    }

    moveSections([foundItem], destFolder.beginning);
    changedProperties.push("folder");
    ` : ''}

    ${params.newReviewInterval !== undefined ? `
    // Set review interval
    foundItem.reviewInterval = {
      steps: ${params.newReviewInterval.steps},
      unit: "${params.newReviewInterval.unit}"
    };
    changedProperties.push("review interval");
    ` : ''}

    ${params.markReviewed === true ? `
    // Mark project as reviewed
    foundItem.lastReviewDate = new Date();
    changedProperties.push("marked reviewed");
    ` : ''}
    `}

    return JSON.stringify({
      success: true,
      id: itemId,
      name: itemName,
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
 * Edit a task or project in OmniFocus using JXA
 */
export async function editItem(params: EditItemParams): Promise<{
  success: boolean,
  id?: string,
  name?: string,
  changedProperties?: string,
  error?: string
}> {
  try {
    // Generate JXA script
    const script = generateJXAScript(params);

    console.error("Executing JXA script for editing...");
    console.error(`Item type: ${params.itemType}, ID: ${params.id || 'not provided'}, Name: ${params.name || 'not provided'}`);

    // Write script to temporary file
    const tempFile = `${tmpdir()}/omnifocus_edit_${Date.now()}.js`;
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
      changedProperties: result.changedProperties,
      error: result.error
    };
  } catch (error: any) {
    console.error("Error in editItem execution:", error);

    return {
      success: false,
      error: error?.message || "Unknown error in editItem"
    };
  }
}