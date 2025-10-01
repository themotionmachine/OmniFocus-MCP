import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Interface for batch task movement parameters
export interface BatchMoveTasksParams {
  tasks: Array<{
    taskId?: string;
    taskName?: string;
  }>;

  // Destination (ONE required)
  toProjectId?: string;
  toProjectName?: string;
  toTaskId?: string;
  toTaskName?: string;
  toInbox?: boolean;
}

// Interface for batch task movement result
export interface BatchMoveTasksResult {
  success: boolean;
  movedCount: number;
  failedCount: number;
  toLocation?: string;
  errors?: string[];
  error?: string;
}

/**
 * Generate OmniJS script for batch task movement
 */
function generateJXAScript(params: BatchMoveTasksParams): string {
  const { tasks, toProjectId, toProjectName, toTaskId, toTaskName, toInbox } = params;

  return `(() => {
  try {
    // Arrays to track found and not found tasks
    const tasksToMove = [];
    const notFound = [];

    // Find each task
    ${tasks.map((task, idx) => {
      const searchId = task.taskId ? `"${task.taskId.replace(/"/g, '\\"')}"` : 'null';
      const searchName = task.taskName ? `"${task.taskName.replace(/"/g, '\\"')}"` : 'null';
      const identifier = task.taskId || task.taskName || `task${idx}`;

      return `
    // Find task ${idx}
    let task${idx} = null;
    ${task.taskId ? `
    task${idx} = flattenedTasks.find(t => t.id.primaryKey === ${searchId});
    if (!task${idx}) {
      task${idx} = inbox.find(t => t.id.primaryKey === ${searchId});
    }` : ''}
    ${task.taskName && !task.taskId ? `
    task${idx} = flattenedTasks.find(t => t.name === ${searchName});
    if (!task${idx}) {
      task${idx} = inbox.find(t => t.name === ${searchName});
    }` : ''}

    if (task${idx}) {
      tasksToMove.push(task${idx});
    } else {
      notFound.push("${identifier.replace(/"/g, '\\"')}");
    }`;
    }).join('\n')}

    // Check if we found any tasks to move
    if (tasksToMove.length === 0) {
      return JSON.stringify({
        success: false,
        movedCount: 0,
        failedCount: ${tasks.length},
        errors: notFound,
        error: "No tasks found to move"
      });
    }

    // Find destination and move tasks
    let toLocation = "";

    ${toInbox ? `
    // Move to inbox
    moveTasks(tasksToMove, inbox);
    toLocation = "Inbox";
    ` : toProjectId ? `
    // Move to project by ID
    const destProject = flattenedProjects.find(p => p.id.primaryKey === ${JSON.stringify(toProjectId)});
    if (!destProject) {
      return JSON.stringify({
        success: false,
        movedCount: 0,
        failedCount: ${tasks.length},
        error: "Destination project not found with ID '" + ${JSON.stringify(toProjectId)} + "'"
      });
    }
    moveTasks(tasksToMove, destProject);
    toLocation = "Project '" + destProject.name + "'";
    ` : toProjectName ? `
    // Move to project by name
    const destProject = flattenedProjects.find(p => p.name === ${JSON.stringify(toProjectName)});
    if (!destProject) {
      return JSON.stringify({
        success: false,
        movedCount: 0,
        failedCount: ${tasks.length},
        error: "Destination project not found with name '" + ${JSON.stringify(toProjectName)} + "'"
      });
    }
    moveTasks(tasksToMove, destProject);
    toLocation = "Project '" + destProject.name + "'";
    ` : toTaskId ? `
    // Make subtasks by parent task ID
    const parentTask = flattenedTasks.find(t => t.id.primaryKey === ${JSON.stringify(toTaskId)});
    if (!parentTask) {
      return JSON.stringify({
        success: false,
        movedCount: 0,
        failedCount: ${tasks.length},
        error: "Destination task not found with ID '" + ${JSON.stringify(toTaskId)} + "'"
      });
    }
    moveTasks(tasksToMove, parentTask);
    toLocation = "Subtask of '" + parentTask.name + "'";
    ` : toTaskName ? `
    // Make subtasks by parent task name
    const parentTask = flattenedTasks.find(t => t.name === ${JSON.stringify(toTaskName)});
    if (!parentTask) {
      return JSON.stringify({
        success: false,
        movedCount: 0,
        failedCount: ${tasks.length},
        error: "Destination task not found with name '" + ${JSON.stringify(toTaskName)} + "'"
      });
    }
    moveTasks(tasksToMove, parentTask);
    toLocation = "Subtask of '" + parentTask.name + "'";
    ` : `
    return JSON.stringify({
      success: false,
      movedCount: 0,
      failedCount: ${tasks.length},
      error: "No destination specified"
    });
    `}

    return JSON.stringify({
      success: true,
      movedCount: tasksToMove.length,
      failedCount: notFound.length,
      toLocation: toLocation,
      errors: notFound.length > 0 ? notFound : undefined
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      movedCount: 0,
      failedCount: ${tasks.length},
      error: error.toString()
    });
  }
})();`;
}

/**
 * Move multiple tasks to a single destination in OmniFocus
 */
export async function batchMoveTasks(params: BatchMoveTasksParams): Promise<BatchMoveTasksResult> {
  try {
    // Generate OmniJS script
    const script = generateJXAScript(params);

    console.error("Executing OmniJS script for batch task movement...");
    console.error(`Moving ${params.tasks.length} tasks`);
    console.error(`Destination: ${params.toProjectName || params.toProjectId || params.toTaskName || params.toTaskId || (params.toInbox ? 'Inbox' : 'unknown')}`);

    // Write script to temporary file
    const tempFile = `${tmpdir()}/omnifocus_batch_move_${Date.now()}.js`;
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
        movedCount: 0,
        failedCount: params.tasks.length,
        error: result.error
      };
    }

    // Return the result
    return {
      success: result.success,
      movedCount: result.movedCount || 0,
      failedCount: result.failedCount || 0,
      toLocation: result.toLocation,
      errors: result.errors,
      error: result.error
    };
  } catch (error: any) {
    console.error("Error in batchMoveTasks execution:", error);

    return {
      success: false,
      movedCount: 0,
      failedCount: params.tasks.length,
      error: error?.message || "Unknown error in batchMoveTasks"
    };
  }
}
