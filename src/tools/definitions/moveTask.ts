import { z } from 'zod';
import { moveTask, MoveTaskParams } from '../primitives/moveTask.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  // Source task (ONE required)
  taskId: z.string().optional()
    .describe("ID of the task to move (preferred over name for accuracy)"),
  taskName: z.string().optional()
    .describe("Name of the task to move (used if ID not provided)"),

  // Destination (ONE required)
  toProjectId: z.string().optional()
    .describe("Move task to this project (by ID, preferred over name)"),
  toProjectName: z.string().optional()
    .describe("Move task to this project (by name)"),
  toTaskId: z.string().optional()
    .describe("Make task a subtask of this task (by ID)"),
  toTaskName: z.string().optional()
    .describe("Make task a subtask of this task (by name)"),
  toInbox: z.boolean().optional()
    .describe("Move task back to inbox (set to true)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Validate that either taskId or taskName is provided
    if (!args.taskId && !args.taskName) {
      return {
        content: [{
          type: "text" as const,
          text: "Either taskId or taskName must be provided to move a task."
        }],
        isError: true
      };
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

    // Call the moveTask function
    const result = await moveTask(args as MoveTaskParams);

    if (result.success) {
      // Task was moved successfully
      let message = `✅ Moved task "${result.taskName}"`;

      if (result.fromLocation) {
        message += ` from ${result.fromLocation}`;
      }

      if (result.toLocation) {
        message += ` to ${result.toLocation}`;
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
      let errorMsg = "Failed to move task";

      if (result.error) {
        if (result.error.includes("Task not found")) {
          errorMsg = result.error;
        } else if (result.error.includes("Destination")) {
          errorMsg = result.error;
        } else if (result.error.includes("No destination")) {
          errorMsg = "No destination specified. Use one of: toProjectId, toProjectName, toTaskId, toTaskName, or toInbox=true";
        } else {
          errorMsg = `Failed to move task: ${result.error}`;
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
        text: `Error moving task: ${error.message}`
      }],
      isError: true
    };
  }
}
