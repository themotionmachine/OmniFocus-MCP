import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Interface for task movement parameters
export interface MoveTaskParams {
  // Source task (provide ONE)
  taskId?: string;
  taskName?: string;

  // Destination (provide ONE)
  toProjectId?: string;
  toProjectName?: string;
  toTaskId?: string;        // Make it a subtask
  toTaskName?: string;      // Make it a subtask
  toInbox?: boolean;        // Move to inbox
}

// Interface for task movement result
export interface MoveTaskResult {
  success: boolean;
  taskId?: string;
  taskName?: string;
  fromLocation?: string;
  toLocation?: string;
  error?: string;
}

/**
 * Generate OmniJS script for task movement
 */
function generateJXAScript(params: MoveTaskParams): string {
  const { taskId, taskName, toProjectId, toProjectName, toTaskId, toTaskName, toInbox } = params;

  return `(() => {
  try {
    // Find source task
    let foundTask = null;
    const searchId = ${taskId ? `"${taskId.replace(/"/g, '\\"')}"` : 'null'};
    const searchName = ${taskName ? `"${taskName.replace(/"/g, '\\"')}"` : 'null'};

    if (searchId) {
      foundTask = flattenedTasks.find(t => t.id.primaryKey === searchId);
      if (!foundTask) {
        foundTask = inbox.find(t => t.id.primaryKey === searchId);
      }
    }

    if (!foundTask && searchName) {
      foundTask = flattenedTasks.find(t => t.name === searchName);
      if (!foundTask) {
        foundTask = inbox.find(t => t.name === searchName);
      }
    }

    if (!foundTask) {
      return JSON.stringify({
        success: false,
        error: "Task not found" + (searchId ? " with ID '" + searchId + "'" : "") + (searchName ? " with name '" + searchName + "'" : "")
      });
    }

    const taskId = foundTask.id.primaryKey;
    const taskName = foundTask.name;

    // Determine current location
    let fromLocation = "Unknown";
    if (foundTask.inInbox) {
      fromLocation = "Inbox";
    } else if (foundTask.parent) {
      fromLocation = "Subtask of '" + foundTask.parent.name + "'";
    } else if (foundTask.containingProject) {
      fromLocation = "Project '" + foundTask.containingProject.name + "'";
    }

    // Find destination and move task
    let toLocation = "";

    ${toInbox ? `
    // Move to inbox
    moveTasks([foundTask], inbox);
    toLocation = "Inbox";
    ` : toProjectId ? `
    // Move to project by ID
    const destProject = flattenedProjects.find(p => p.id.primaryKey === ${JSON.stringify(toProjectId)});
    if (!destProject) {
      return JSON.stringify({
        success: false,
        error: "Destination project not found with ID '" + ${JSON.stringify(toProjectId)} + "'"
      });
    }
    moveTasks([foundTask], destProject);
    toLocation = "Project '" + destProject.name + "'";
    ` : toProjectName ? `
    // Move to project by name
    const destProject = flattenedProjects.find(p => p.name === ${JSON.stringify(toProjectName)});
    if (!destProject) {
      return JSON.stringify({
        success: false,
        error: "Destination project not found with name '" + ${JSON.stringify(toProjectName)} + "'"
      });
    }
    moveTasks([foundTask], destProject);
    toLocation = "Project '" + destProject.name + "'";
    ` : toTaskId ? `
    // Make subtask by parent task ID
    const parentTask = flattenedTasks.find(t => t.id.primaryKey === ${JSON.stringify(toTaskId)});
    if (!parentTask) {
      return JSON.stringify({
        success: false,
        error: "Destination task not found with ID '" + ${JSON.stringify(toTaskId)} + "'"
      });
    }
    moveTasks([foundTask], parentTask);
    toLocation = "Subtask of '" + parentTask.name + "'";
    ` : toTaskName ? `
    // Make subtask by parent task name
    const parentTask = flattenedTasks.find(t => t.name === ${JSON.stringify(toTaskName)});
    if (!parentTask) {
      return JSON.stringify({
        success: false,
        error: "Destination task not found with name '" + ${JSON.stringify(toTaskName)} + "'"
      });
    }
    moveTasks([foundTask], parentTask);
    toLocation = "Subtask of '" + parentTask.name + "'";
    ` : `
    return JSON.stringify({
      success: false,
      error: "No destination specified"
    });
    `}

    return JSON.stringify({
      success: true,
      taskId: taskId,
      taskName: taskName,
      fromLocation: fromLocation,
      toLocation: toLocation
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
 * Move a task to a different location in OmniFocus
 */
export async function moveTask(params: MoveTaskParams): Promise<MoveTaskResult> {
  try {
    // Generate OmniJS script
    const script = generateJXAScript(params);

    console.error("Executing OmniJS script for task movement...");
    console.error(`Task: ${params.taskId || params.taskName}`);
    console.error(`Destination: ${params.toProjectName || params.toProjectId || params.toTaskName || params.toTaskId || (params.toInbox ? 'Inbox' : 'unknown')}`);

    // Write script to temporary file
    const tempFile = `${tmpdir()}/omnifocus_move_${Date.now()}.js`;
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
      taskId: result.taskId,
      taskName: result.taskName,
      fromLocation: result.fromLocation,
      toLocation: result.toLocation,
      error: result.error
    };
  } catch (error: any) {
    console.error("Error in moveTask execution:", error);

    return {
      success: false,
      error: error?.message || "Unknown error in moveTask"
    };
  }
}
