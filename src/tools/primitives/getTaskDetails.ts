import { OmnifocusTask, OmnifocusDatabase } from '../../types.js';
import { dumpDatabase } from '../dumpDatabase.js';

// Interface for task details parameters
export interface GetTaskDetailsParams {
  taskId?: string;
  taskName?: string;
}

// Interface for the response
export interface TaskDetailsResponse {
  success: boolean;
  task?: OmnifocusTask & {
    projectName?: string;
    parentTaskName?: string;
    childTaskNames?: string[];
    tagNames?: string[];
  };
  error?: string;
}

/**
 * Get detailed information about a specific task
 */
export async function getTaskDetails(params: GetTaskDetailsParams): Promise<TaskDetailsResponse> {
  try {
    // Validate that at least one parameter is provided
    if (!params.taskId && !params.taskName) {
      return {
        success: false,
        error: "Either taskId or taskName must be provided"
      };
    }

    // Get the current database
    const database: OmnifocusDatabase = await dumpDatabase();

    // Find the task
    let task: OmnifocusTask | undefined;
    
    if (params.taskId) {
      // Search by ID (exact match)
      task = database.tasks.find(t => t.id === params.taskId);
    } else if (params.taskName) {
      // Search by name (case-insensitive partial match)
      const searchName = params.taskName.toLowerCase();
      const matches = database.tasks.filter(t => 
        t.name.toLowerCase().includes(searchName)
      );
      
      if (matches.length === 0) {
        return {
          success: false,
          error: `No task found matching name: "${params.taskName}"`
        };
      } else if (matches.length > 1) {
        // If multiple matches, try exact match first
        const exactMatch = matches.find(t => t.name.toLowerCase() === searchName);
        if (exactMatch) {
          task = exactMatch;
        } else {
          // Return error with suggestions
          const suggestions = matches.slice(0, 5).map(t => `"${t.name}" [${t.id}]`).join(', ');
          return {
            success: false,
            error: `Multiple tasks found matching "${params.taskName}". Please be more specific or use task ID. Found: ${suggestions}${matches.length > 5 ? ` and ${matches.length - 5} more` : ''}`
          };
        }
      } else {
        task = matches[0];
      }
    }

    if (!task) {
      return {
        success: false,
        error: params.taskId 
          ? `Task not found with ID: ${params.taskId}`
          : `Task not found with name: ${params.taskName}`
      };
    }

    // Enrich the task with additional information
    const enrichedTask: TaskDetailsResponse['task'] = {
      ...task
    };

    // Add project name if task belongs to a project
    if (task.projectId && database.projects[task.projectId]) {
      enrichedTask.projectName = database.projects[task.projectId].name;
    }

    // Add parent task name if task has a parent
    if (task.parentId) {
      const parentTask = database.tasks.find(t => t.id === task.parentId);
      if (parentTask) {
        enrichedTask.parentTaskName = parentTask.name;
      }
    }

    // Add child task names if task has children
    if (task.childIds && task.childIds.length > 0) {
      enrichedTask.childTaskNames = task.childIds
        .map(childId => {
          const childTask = database.tasks.find(t => t.id === childId);
          return childTask ? childTask.name : undefined;
        })
        .filter((name): name is string => name !== undefined);
    }

    // Tag names are already included in the task object

    return {
      success: true,
      task: enrichedTask
    };

  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Unknown error in getTaskDetails"
    };
  }
}