import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Status options for tasks and projects
type TaskStatus = 'incomplete' | 'completed' | 'dropped';
type ProjectStatus = 'active' | 'completed' | 'dropped' | 'onHold';

// Interface for batch item edit parameters
export interface BatchEditItemParams {
  id?: string;
  name?: string;
  itemType: 'task' | 'project';

  // Common editable fields
  newName?: string;
  newNote?: string;
  newDueDate?: string;
  newDeferDate?: string;
  newPlannedDate?: string;
  newFlagged?: boolean;
  newEstimatedMinutes?: number;

  // Task-specific fields
  newStatus?: TaskStatus;
  addTags?: string[];
  removeTags?: string[];
  replaceTags?: string[];

  // Project-specific fields
  newSequential?: boolean;
  newFolderName?: string;
  newProjectStatus?: ProjectStatus;
  newReviewInterval?: { steps: number; unit: string };
  markReviewed?: boolean;
}

// Interface for batch edit result
export interface BatchEditItemsResult {
  success: boolean;
  results: Array<{
    success: boolean;
    id?: string;
    name?: string;
    changedProperties?: string;
    error?: string;
  }>;
  successCount: number;
  failureCount: number;
  error?: string;
}

/**
 * Generate edit code for a single item
 */
function generateEditCode(item: BatchEditItemParams, idx: number): string {
  const { itemType } = item;

  let code = `
    // Edit item ${idx}
    let item${idx} = null;
    const changedProps${idx} = [];

    // Find item
    `;

  // Search logic
  if (itemType === 'task') {
    if (item.id) {
      code += `
    item${idx} = flattenedTasks.find(t => t.id.primaryKey === ${JSON.stringify(item.id)});
    if (!item${idx}) {
      item${idx} = inbox.find(t => t.id.primaryKey === ${JSON.stringify(item.id)});
    }`;
    }
    if (item.name && !item.id) {
      code += `
    item${idx} = flattenedTasks.find(t => t.name === ${JSON.stringify(item.name)});
    if (!item${idx}) {
      item${idx} = inbox.find(t => t.name === ${JSON.stringify(item.name)});
    }`;
    }
  } else {
    if (item.id) {
      code += `
    item${idx} = flattenedProjects.find(p => p.id.primaryKey === ${JSON.stringify(item.id)});`;
    }
    if (item.name && !item.id) {
      code += `
    item${idx} = flattenedProjects.find(p => p.name === ${JSON.stringify(item.name)});`;
    }
  }

  code += `

    if (!item${idx}) {
      results.push({
        success: false,
        error: "Item not found: ${item.id || item.name}"
      });
    } else {
      const itemId${idx} = item${idx}.id.primaryKey;
      const itemName${idx} = item${idx}.name;

      // Apply edits
  `;

  // Common property updates
  if (item.newName !== undefined) {
    code += `
      item${idx}.name = ${JSON.stringify(item.newName)};
      changedProps${idx}.push("name");`;
  }

  if (item.newNote !== undefined) {
    code += `
      item${idx}.note = ${JSON.stringify(item.newNote)};
      changedProps${idx}.push("note");`;
  }

  if (item.newDueDate !== undefined) {
    if (item.newDueDate === '') {
      code += `
      item${idx}.dueDate = null;
      changedProps${idx}.push("due date");`;
    } else {
      code += `
      item${idx}.dueDate = new Date(${JSON.stringify(item.newDueDate)});
      changedProps${idx}.push("due date");`;
    }
  }

  if (item.newDeferDate !== undefined) {
    if (item.newDeferDate === '') {
      code += `
      item${idx}.deferDate = null;
      changedProps${idx}.push("defer date");`;
    } else {
      code += `
      item${idx}.deferDate = new Date(${JSON.stringify(item.newDeferDate)});
      changedProps${idx}.push("defer date");`;
    }
  }

  if (item.newPlannedDate !== undefined) {
    if (item.newPlannedDate === '') {
      code += `
      item${idx}.plannedDate = null;
      changedProps${idx}.push("planned date");`;
    } else {
      code += `
      item${idx}.plannedDate = new Date(${JSON.stringify(item.newPlannedDate)});
      changedProps${idx}.push("planned date");`;
    }
  }

  if (item.newFlagged !== undefined) {
    code += `
      item${idx}.flagged = ${item.newFlagged};
      changedProps${idx}.push("flagged");`;
  }

  if (item.newEstimatedMinutes !== undefined) {
    code += `
      item${idx}.estimatedMinutes = ${item.newEstimatedMinutes};
      changedProps${idx}.push("estimated minutes");`;
  }

  // Task-specific updates
  if (itemType === 'task') {
    if (item.newStatus !== undefined) {
      if (item.newStatus === 'completed') {
        code += `
      item${idx}.markComplete();
      changedProps${idx}.push("status (completed)");`;
      } else if (item.newStatus === 'dropped') {
        code += `
      item${idx}.drop();
      changedProps${idx}.push("status (dropped)");`;
      } else {
        code += `
      item${idx}.markIncomplete();
      changedProps${idx}.push("status (incomplete)");`;
      }
    }

    if (item.replaceTags) {
      code += `
      item${idx}.clearTags();
      const newTagNames${idx} = ${JSON.stringify(item.replaceTags)};
      newTagNames${idx}.forEach(tagName => {
        let tag = flattenedTags.find(t => t.name === tagName);
        if (!tag) {
          tag = new Tag(tagName);
        }
        item${idx}.addTag(tag);
      });
      changedProps${idx}.push("tags (replaced)");`;
    } else {
      if (item.addTags) {
        code += `
      const addTagNames${idx} = ${JSON.stringify(item.addTags)};
      addTagNames${idx}.forEach(tagName => {
        let tag = flattenedTags.find(t => t.name === tagName);
        if (!tag) {
          tag = new Tag(tagName);
        }
        item${idx}.addTag(tag);
      });
      changedProps${idx}.push("tags (added)");`;
      }

      if (item.removeTags) {
        code += `
      const removeTagNames${idx} = ${JSON.stringify(item.removeTags)};
      removeTagNames${idx}.forEach(tagName => {
        const tag = flattenedTags.find(t => t.name === tagName);
        if (tag) {
          item${idx}.removeTag(tag);
        }
      });
      changedProps${idx}.push("tags (removed)");`;
      }
    }
  }

  // Project-specific updates
  if (itemType === 'project') {
    if (item.newSequential !== undefined) {
      code += `
      item${idx}.sequential = ${item.newSequential};
      changedProps${idx}.push("sequential");`;
    }

    if (item.newProjectStatus !== undefined) {
      const statusMap: Record<ProjectStatus, string> = {
        'active': 'Project.Status.Active',
        'completed': 'Project.Status.Done',
        'dropped': 'Project.Status.Dropped',
        'onHold': 'Project.Status.OnHold'
      };
      code += `
      item${idx}.status = ${statusMap[item.newProjectStatus]};
      changedProps${idx}.push("status");`;
    }

    if (item.newFolderName !== undefined) {
      code += `
      const folderName${idx} = ${JSON.stringify(item.newFolderName)};
      let destFolder${idx} = flattenedFolders.find(f => f.name === folderName${idx});
      if (!destFolder${idx}) {
        destFolder${idx} = new Folder(folderName${idx});
      }
      item${idx}.moveTo(destFolder${idx});
      changedProps${idx}.push("folder");`;
    }

    if (item.newReviewInterval) {
      code += `
      item${idx}.reviewInterval = {
        steps: ${item.newReviewInterval.steps},
        unit: "${item.newReviewInterval.unit}"
      };
      changedProps${idx}.push("review interval");`;
    }

    if (item.markReviewed === true) {
      code += `
      item${idx}.lastReviewDate = new Date();
      changedProps${idx}.push("marked reviewed");`;
    }
  }

  code += `

      results.push({
        success: true,
        id: itemId${idx},
        name: itemName${idx},
        changedProperties: changedProps${idx}.join(", ")
      });
    }
  `;

  return code;
}

/**
 * Generate OmniJS script for batch item editing
 */
function generateJXAScript(items: BatchEditItemParams[]): string {
  return `(() => {
  try {
    const results = [];

    ${items.map((item, idx) => generateEditCode(item, idx)).join('\n')}

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return JSON.stringify({
      success: successCount > 0,
      results: results,
      successCount: successCount,
      failureCount: failureCount
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      results: [],
      successCount: 0,
      failureCount: ${items.length},
      error: error.toString()
    });
  }
})();`;
}

/**
 * Edit multiple items in OmniFocus in a single operation
 */
export async function batchEditItems(items: BatchEditItemParams[]): Promise<BatchEditItemsResult> {
  try {
    // Generate OmniJS script
    const script = generateJXAScript(items);

    console.error("Executing OmniJS script for batch item editing...");
    console.error(`Editing ${items.length} items`);

    // Write script to temporary file
    const tempFile = `${tmpdir()}/omnifocus_batch_edit_${Date.now()}.js`;
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
        results: [],
        successCount: 0,
        failureCount: items.length,
        error: result.error
      };
    }

    // Return the result
    return {
      success: result.success,
      results: result.results || [],
      successCount: result.successCount || 0,
      failureCount: result.failureCount || 0,
      error: result.error
    };
  } catch (error: any) {
    console.error("Error in batchEditItems execution:", error);

    return {
      success: false,
      results: [],
      successCount: 0,
      failureCount: items.length,
      error: error?.message || "Unknown error in batchEditItems"
    };
  }
}
