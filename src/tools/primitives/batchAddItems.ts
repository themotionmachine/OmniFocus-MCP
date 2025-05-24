import { addOmniFocusTask, AddOmniFocusTaskParams } from './addOmniFocusTask.js';
import { addProject, AddProjectParams } from './addProject.js';

// Define the parameters for the batch operation
export type BatchAddItemsParams = {
  type: 'task' | 'project';
  name: string;
  note?: string;
  dueDate?: string;
  deferDate?: string;
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[];
  projectName?: string; // For tasks
  parentTaskId?: string; // For tasks: parent task ID
  parentTaskName?: string; // For tasks: parent task name
  folderName?: string; // For projects
  sequential?: boolean; // For projects
};

// Define the result type for individual operations
type ItemResult = {
  success: boolean;
  id?: string;
  error?: string;
};

// Define the result type for the batch operation
type BatchResult = {
  success: boolean;
  results: ItemResult[];
  error?: string;
};

/**
 * Add multiple items (tasks or projects) to OmniFocus
 */
export async function batchAddItems(items: BatchAddItemsParams[]): Promise<BatchResult> {
  try {
    // Results array to track individual operation outcomes
    const results: ItemResult[] = [];
    
    // Process each item in sequence
    for (const item of items) {
      try {
        if (item.type === 'task') {
          // Extract task-specific params
          const taskParams: AddOmniFocusTaskParams = {
            name: item.name,
            note: item.note,
            dueDate: item.dueDate,
            deferDate: item.deferDate,
            flagged: item.flagged,
            estimatedMinutes: item.estimatedMinutes,
            tags: item.tags,
            projectName: item.projectName,
            parentTaskId: item.parentTaskId,
            parentTaskName: item.parentTaskName
          };
          
          // Add task
          const taskResult = await addOmniFocusTask(taskParams);
          results.push({
            success: taskResult.success,
            id: taskResult.taskId,
            error: taskResult.error
          });
        } else if (item.type === 'project') {
          // Extract project-specific params
          const projectParams: AddProjectParams = {
            name: item.name,
            note: item.note,
            dueDate: item.dueDate,
            deferDate: item.deferDate,
            flagged: item.flagged,
            estimatedMinutes: item.estimatedMinutes,
            tags: item.tags,
            folderName: item.folderName,
            sequential: item.sequential
          };
          
          // Add project
          const projectResult = await addProject(projectParams);
          results.push({
            success: projectResult.success,
            id: projectResult.projectId,
            error: projectResult.error
          });
        } else {
          // Invalid type
          results.push({
            success: false,
            error: `Invalid item type: ${(item as any).type}`
          });
        }
      } catch (itemError: any) {
        // Handle individual item errors
        results.push({
          success: false,
          error: itemError.message || "Unknown error processing item"
        });
      }
    }
    
    // Determine overall success (true if at least one item was added successfully)
    const overallSuccess = results.some(result => result.success);
    
    return {
      success: overallSuccess,
      results: results
    };
  } catch (error: any) {
    console.error("Error in batchAddItems:", error);
    return {
      success: false,
      results: [],
      error: error.message || "Unknown error in batchAddItems"
    };
  }
} 