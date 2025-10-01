import { z } from 'zod';
import { batchMoveTasks, BatchMoveTasksParams } from '../primitives/batchMoveTasks.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  tasks: z.array(z.object({
    taskId: z.string().optional()
      .describe("ID of the task to move (preferred over name)"),
    taskName: z.string().optional()
      .describe("Name of the task to move")
  })).min(1).describe("Array of tasks to move (minimum 1 task required)"),

  // Destination (ONE required)
  toProjectId: z.string().optional()
    .describe("Move all tasks to this project (by ID, preferred over name)"),
  toProjectName: z.string().optional()
    .describe("Move all tasks to this project (by name)"),
  toTaskId: z.string().optional()
    .describe("Make all tasks subtasks of this task (by ID)"),
  toTaskName: z.string().optional()
    .describe("Make all tasks subtasks of this task (by name)"),
  toInbox: z.boolean().optional()
    .describe("Move all tasks back to inbox (set to true)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Validate that each task has either taskId or taskName
    for (let i = 0; i < args.tasks.length; i++) {
      const task = args.tasks[i];
      if (!task.taskId && !task.taskName) {
        return {
          content: [{
            type: "text" as const,
            text: `Task at index ${i} must have either taskId or taskName.`
          }],
          isError: true
        };
      }
    }

    // Validate that exactly one destination is provided
    const destinations = [
      args.toProjectId,
      args.toProjectName,
      args.toTaskId,
      args.toTaskName,
      args.toInbox
    ];
    const providedDests = destinations.filter(d => d !== undefined && d !== false);

    if (providedDests.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: "No destination specified. Provide one of: toProjectId, toProjectName, toTaskId, toTaskName, or toInbox=true"
        }],
        isError: true
      };
    }

    if (providedDests.length > 1) {
      return {
        content: [{
          type: "text" as const,
          text: "Multiple destinations specified. Provide only ONE of: toProjectId, toProjectName, toTaskId, toTaskName, or toInbox=true"
        }],
        isError: true
      };
    }

    // Call the batchMoveTasks function
    const result = await batchMoveTasks(args as BatchMoveTasksParams);

    if (result.success) {
      // Tasks were moved successfully
      let message = `✅ Moved ${result.movedCount} task${result.movedCount !== 1 ? 's' : ''}`;

      if (result.toLocation) {
        message += ` to ${result.toLocation}`;
      }

      if (result.failedCount > 0 && result.errors) {
        message += `. Could not find ${result.failedCount} task${result.failedCount !== 1 ? 's' : ''}: ${result.errors.join(', ')}`;
      }

      message += '.';

      return {
        content: [{
          type: "text" as const,
          text: message
        }]
      };
    } else {
      // Task movement failed
      let errorMsg = "Failed to move tasks";

      if (result.error) {
        if (result.error.includes("No tasks found")) {
          errorMsg = `No tasks found to move. Searched for: ${result.errors?.join(', ') || 'unknown'}`;
        } else if (result.error.includes("Destination")) {
          errorMsg = result.error;
        } else if (result.error.includes("No destination")) {
          errorMsg = "No destination specified. Use one of: toProjectId, toProjectName, toTaskId, toTaskName, or toInbox=true";
        } else {
          errorMsg = `Failed to move tasks: ${result.error}`;
        }
      }

      return {
        content: [{
          type: "text" as const,
          text: errorMsg
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);

    return {
      content: [{
        type: "text" as const,
        text: `Error moving tasks: ${error.message}`
      }],
      isError: true
    };
  }
}
