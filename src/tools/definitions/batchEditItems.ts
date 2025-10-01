import { z } from 'zod';
import { batchEditItems, BatchEditItemParams } from '../primitives/batchEditItems.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  items: z.array(z.object({
    // Identification
    id: z.string().optional().describe("The ID of the task or project to edit"),
    name: z.string().optional().describe("The name of the task or project to edit (as fallback if ID not provided)"),
    itemType: z.enum(['task', 'project']).describe("Type of item to edit ('task' or 'project')"),

    // Common editable fields
    newName: z.string().optional().describe("New name for the item"),
    newNote: z.string().optional().describe("New note for the item"),
    newDueDate: z.string().optional().describe("New due date in ISO format (YYYY-MM-DD or full ISO date); set to empty string to clear"),
    newDeferDate: z.string().optional().describe("New defer date in ISO format (YYYY-MM-DD or full ISO date); set to empty string to clear"),
    newPlannedDate: z.string().optional().describe("New planned date in ISO format (YYYY-MM-DD or full ISO date); set to empty string to clear (tasks only)"),
    newFlagged: z.boolean().optional().describe("Set flagged status (set to false for no flag, true for flag)"),
    newEstimatedMinutes: z.number().optional().describe("New estimated minutes"),

    // Task-specific fields
    newStatus: z.enum(['incomplete', 'completed', 'dropped']).optional()
      .describe("New status for tasks. Use 'completed' to mark task as done, 'dropped' to abandon, 'incomplete' to reopen"),
    addTags: z.array(z.string()).optional().describe("Tags to add to the task"),
    removeTags: z.array(z.string()).optional().describe("Tags to remove from the task"),
    replaceTags: z.array(z.string()).optional().describe("Tags to replace all existing tags with"),

    // Project-specific fields
    newSequential: z.boolean().optional().describe("Whether the project should be sequential"),
    newFolderName: z.string().optional().describe("New folder to move the project to"),
    newProjectStatus: z.enum(['active', 'completed', 'dropped', 'onHold']).optional()
      .describe("New status for projects"),
    newReviewInterval: z.object({
      steps: z.number().int().positive().describe("Number of time units between reviews"),
      unit: z.enum(['days', 'weeks', 'months', 'years']).describe("Time unit for review interval")
    }).optional().describe("Set review interval for the project (projects only)"),
    markReviewed: z.boolean().optional()
      .describe("Mark project as reviewed - sets lastReviewDate to now (projects only)")
  })).min(1).describe("Array of items to edit (minimum 1 item required)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Validate that each item has either id or name
    for (let i = 0; i < args.items.length; i++) {
      const item = args.items[i];
      if (!item.id && !item.name) {
        return {
          content: [{
            type: "text" as const,
            text: `Item at index ${i} must have either id or name.`
          }],
          isError: true
        };
      }
    }

    // Call the batchEditItems function
    const result = await batchEditItems(args.items as BatchEditItemParams[]);

    if (result.success) {
      // Items were edited successfully
      let message = `✅ Edited ${result.successCount} item${result.successCount !== 1 ? 's' : ''} successfully`;

      if (result.failureCount > 0) {
        message += `. Failed to edit ${result.failureCount} item${result.failureCount !== 1 ? 's' : ''}`;

        // Show first few failures
        const failures = result.results.filter(r => !r.success).slice(0, 3);
        if (failures.length > 0) {
          const failureDetails = failures.map(f => f.error || 'Unknown error').join('; ');
          message += `: ${failureDetails}`;
          if (result.failureCount > 3) {
            message += ` (and ${result.failureCount - 3} more)`;
          }
        }
      }

      message += '.';

      return {
        content: [{
          type: "text" as const,
          text: message
        }]
      };
    } else {
      // Editing failed
      let errorMsg = "Failed to edit items";

      if (result.error) {
        errorMsg = `Failed to edit items: ${result.error}`;
      } else if (result.failureCount > 0) {
        const failures = result.results.filter(r => !r.success).slice(0, 3);
        if (failures.length > 0) {
          const failureDetails = failures.map(f => f.error || 'Unknown error').join('; ');
          errorMsg = `Failed to edit items: ${failureDetails}`;
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
        text: `Error editing items: ${error.message}`
      }],
      isError: true
    };
  }
}
