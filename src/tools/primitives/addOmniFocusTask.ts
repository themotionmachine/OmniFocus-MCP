import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Interface for task creation parameters
export interface AddOmniFocusTaskParams {
  name: string;
  note?: string;
  dueDate?: string; // ISO date string
  deferDate?: string; // ISO date string
  plannedDate?: string; // ISO date string
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[]; // Tag names
  projectName?: string; // Project name to add task to
  // Hierarchy support
  parentTaskId?: string;
  parentTaskName?: string;
  hierarchyLevel?: number; // ignored for single add
}

/**
 * Generate JXA script for task creation
 */
function generateJXAScript(params: AddOmniFocusTaskParams): string {
  return `(() => {
  try {
    let newTask = null;
    let parentTask = null;
    let placement = "inbox";

    // Search for parent task if provided
    ${params.parentTaskId ? `
    const parentTaskId = ${JSON.stringify(params.parentTaskId)};
    parentTask = flattenedTasks.find(t => t.id.primaryKey === parentTaskId);

    if (!parentTask) {
      parentTask = inbox.find(t => t.id.primaryKey === parentTaskId);
    }

    ${params.projectName ? `
    // If projectName provided, ensure parent is within that project
    if (parentTask) {
      const parentProject = parentTask.containingProject;
      if (!parentProject || parentProject.name !== ${JSON.stringify(params.projectName)}) {
        parentTask = null;
      }
    }
    ` : ''}
    ` : ''}

    ${params.parentTaskName && !params.parentTaskId ? `
    const parentTaskName = ${JSON.stringify(params.parentTaskName)};
    ${params.projectName ? `
    // Find by name but constrain to the specified project
    const candidates = flattenedTasks.filter(t => t.name === parentTaskName);
    parentTask = candidates.find(t => {
      const proj = t.containingProject;
      return proj && proj.name === ${JSON.stringify(params.projectName)};
    });
    ` : `
    // No project specified; allow global or inbox match by name
    parentTask = flattenedTasks.find(t => t.name === parentTaskName);

    if (!parentTask) {
      parentTask = inbox.find(t => t.name === parentTaskName);
    }
    `}
    ` : ''}

    // Create the task
    if (parentTask) {
      // Create task under parent task
      newTask = new Task(${JSON.stringify(params.name)}, parentTask);
      placement = "parent";
    } else if (${params.projectName ? 'true' : 'false'}) {
      // Create under specified project
      const projectName = ${JSON.stringify(params.projectName)};
      const theProject = flattenedProjects.find(p => p.name === projectName);

      if (!theProject) {
        return JSON.stringify({
          success: false,
          error: "Project not found: " + projectName
        });
      }

      newTask = new Task(${JSON.stringify(params.name)}, theProject);
      placement = "project";
    } else {
      // Fallback to inbox
      newTask = new Inbox.Task(${JSON.stringify(params.name)});
      placement = "inbox";
    }

    // Set task properties
    ${params.note ? `newTask.note = ${JSON.stringify(params.note)};` : ''}
    ${params.dueDate ? `newTask.dueDate = new Date(${JSON.stringify(params.dueDate)});` : ''}
    ${params.deferDate ? `newTask.deferDate = new Date(${JSON.stringify(params.deferDate)});` : ''}
    ${params.plannedDate ? `newTask.plannedDate = new Date(${JSON.stringify(params.plannedDate)});` : ''}
    ${params.flagged ? `newTask.flagged = true;` : ''}
    ${params.estimatedMinutes ? `newTask.estimatedMinutes = ${params.estimatedMinutes};` : ''}

    // Add tags if provided
    ${params.tags && params.tags.length > 0 ? `
    const tagNames = ${JSON.stringify(params.tags)};
    tagNames.forEach(tagName => {
      let tag = flattenedTags.find(t => t.name === tagName);
      if (!tag) {
        tag = new Tag(tagName);
      }
      newTask.addTag(tag);
    });
    ` : ''}

    const taskId = newTask.id.primaryKey;

    return JSON.stringify({
      success: true,
      taskId: taskId,
      name: ${JSON.stringify(params.name)},
      placement: placement
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
 * Add a task to OmniFocus using JXA
 */
export async function addOmniFocusTask(params: AddOmniFocusTaskParams): Promise<{success: boolean, taskId?: string, error?: string, placement?: 'parent' | 'project' | 'inbox'}> {
  try {
    // Generate JXA script
    const script = generateJXAScript(params);
    console.error("Executing JXA script for task creation...");

    // Write to a temporary file
    const tempFile = `${tmpdir()}/omnifocus_add_${Date.now()}.js`;
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
      taskId: result.taskId,
      error: result.error,
      placement: result.placement
    };
  } catch (error: any) {
    console.error("Error in addOmniFocusTask:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in addOmniFocusTask"
    };
  }
} 
