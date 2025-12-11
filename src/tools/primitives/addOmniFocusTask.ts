import { logger } from '../../utils/logger.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

// Interface for task creation parameters
export interface AddOmniFocusTaskParams {
  name: string;
  note?: string | undefined;
  dueDate?: string | undefined; // ISO date string
  deferDate?: string | undefined; // ISO date string
  flagged?: boolean | undefined;
  estimatedMinutes?: number | undefined;
  tags?: string[] | undefined; // Tag names
  projectName?: string | undefined; // Project name to add task to
  // Hierarchy support
  parentTaskId?: string | undefined;
  parentTaskName?: string | undefined;
  hierarchyLevel?: number | undefined; // ignored for single add
}

/**
 * Generate Omni Automation JavaScript for task creation
 */
function generateOmniScript(params: AddOmniFocusTaskParams): string {
  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const name = escapeForJS(params.name);
  const note = params.note ? escapeForJS(params.note) : '';
  const dueDate = params.dueDate || '';
  const deferDate = params.deferDate || '';
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes || 0;
  const tags = params.tags || [];
  const projectName = params.projectName ? escapeForJS(params.projectName) : '';
  const parentTaskId = params.parentTaskId ? escapeForJS(params.parentTaskId) : '';
  const parentTaskName = params.parentTaskName ? escapeForJS(params.parentTaskName) : '';

  // Generate tags array for OmniJS
  const tagsArrayStr = JSON.stringify(tags);

  return `(function() {
  try {
    var name = "${name}";
    var note = "${note}";
    var dueDate = ${dueDate ? `"${dueDate}"` : 'null'};
    var deferDate = ${deferDate ? `"${deferDate}"` : 'null'};
    var flagged = ${flagged};
    var estimatedMinutes = ${estimatedMinutes};
    var tags = ${tagsArrayStr};
    var projectName = "${projectName}";
    var parentTaskId = "${parentTaskId}";
    var parentTaskName = "${parentTaskName}";

    var parentTask = null;
    var targetProject = null;
    var placement = "inbox";
    var position = null;

    // Find parent task by ID if provided
    if (parentTaskId && parentTaskId.length > 0) {
      // Try to find task by ID
      parentTask = Task.byIdentifier(parentTaskId);

      // If projectName provided, verify parent is in that project
      if (parentTask && projectName && projectName.length > 0) {
        var containingProj = parentTask.containingProject;
        if (!containingProj || containingProj.name !== projectName) {
          parentTask = null;
        }
      }
    }

    // Find parent task by name if not found by ID
    if (!parentTask && parentTaskName && parentTaskName.length > 0) {
      if (projectName && projectName.length > 0) {
        // Find within specific project
        var proj = flattenedProjects.byName(projectName);
        if (proj) {
          parentTask = proj.flattenedTasks.byName(parentTaskName);
        }
      } else {
        // Search globally
        parentTask = flattenedTasks.byName(parentTaskName);
      }
    }

    // Determine where to create the task
    var newTask = null;

    if (parentTask) {
      // Create under parent task
      newTask = new Task(name, parentTask.ending);
      placement = "parent";
    } else if (projectName && projectName.length > 0) {
      // Create in project
      targetProject = flattenedProjects.byName(projectName);
      if (!targetProject) {
        return JSON.stringify({ success: false, error: "Project not found: " + projectName });
      }
      newTask = new Task(name, targetProject.ending);
      placement = "project";
    } else {
      // Create in inbox
      newTask = new Task(name, inbox.ending);
      placement = "inbox";
    }

    // Set task properties
    if (note && note.length > 0) {
      newTask.note = note;
    }

    if (dueDate) {
      newTask.dueDate = new Date(dueDate);
    }

    if (deferDate) {
      newTask.deferDate = new Date(deferDate);
    }

    if (flagged) {
      newTask.flagged = true;
    }

    if (estimatedMinutes > 0) {
      newTask.estimatedMinutes = estimatedMinutes;
    }

    // Add tags
    if (tags && tags.length > 0) {
      tags.forEach(function(tagName) {
        var tag = flattenedTags.byName(tagName);
        if (!tag) {
          tag = new Tag(tagName);
        }
        newTask.addTag(tag);
      });
    }

    // Return success with task ID and placement
    return JSON.stringify({
      success: true,
      taskId: newTask.id.primaryKey,
      name: newTask.name,
      placement: placement
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * Add a new task to OmniFocus using Omni Automation JavaScript
 */
export async function addOmniFocusTask(params: AddOmniFocusTaskParams): Promise<{
  success: boolean;
  taskId?: string;
  error?: string;
  placement?: 'parent' | 'project' | 'inbox';
}> {
  // Validate required parameters
  if (!params || typeof params.name !== 'string' || params.name.trim().length === 0) {
    return {
      success: false,
      error: 'Task name is required and must be a non-empty string'
    };
  }

  // Generate Omni Automation script
  const script = generateOmniScript(params);

  // Write script to secure temporary file
  const tempFile = writeSecureTempFile(script, 'omnifocus_add', '.js');

  try {
    // Execute via Omni Automation
    const result = (await executeOmniFocusScript(tempFile.path)) as {
      success: boolean;
      taskId?: string;
      name?: string;
      error?: string;
      placement?: 'parent' | 'project' | 'inbox';
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
      taskId?: string;
      error?: string;
      placement?: 'parent' | 'project' | 'inbox';
    } = {
      success: result.success
    };
    if (result.taskId !== undefined) {
      response.taskId = result.taskId;
    }
    if (result.placement !== undefined) {
      response.placement = result.placement;
    }
    return response;
  } catch (error: unknown) {
    logger.error('Error in addOmniFocusTask', 'addOmniFocusTask', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in addOmniFocusTask'
    };
  } finally {
    // Cleanup temp file
    tempFile.cleanup();
  }
}
