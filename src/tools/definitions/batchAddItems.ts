import { z } from 'zod';
import { batchAddItems, BatchAddItemsParams } from '../primitives/batchAddItems.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

export const schema = z.object({
  items: z.array(z.object({
    type: z.enum(['task', 'project']).describe("Type of item to add ('task' or 'project')"),
    name: z.string().describe("The name of the item"),
    note: z.string().optional().describe("Additional notes for the item"),
    dueDate: z.string().optional().describe("The due date in ISO format (YYYY-MM-DD or full ISO date)"),
    deferDate: z.string().optional().describe("The defer date in ISO format (YYYY-MM-DD or full ISO date)"),
    flagged: z.boolean().optional().describe("Whether the item is flagged or not"),
    estimatedMinutes: z.number().optional().describe("Estimated time to complete the item, in minutes"),
    tags: z.array(z.string()).optional().describe("Tags to assign to the item"),
    
    // Task-specific properties
    projectName: z.string().optional().describe("For tasks: The name of the project to add the task to"),
    parentTaskId: z.string().optional().describe("For tasks: ID of the parent task"),
    parentTaskName: z.string().optional().describe("For tasks: Name of the parent task (scoped to project when provided)"),
    tempId: z.string().optional().describe("For tasks: Temporary ID for within-batch references"),
    parentTempId: z.string().optional().describe("For tasks: Reference to parent's tempId within the batch"),
    hierarchyLevel: z.number().int().min(0).optional().describe("Optional ordering hint (0=root, 1=child, ...)"),
    
    // Project-specific properties
    folderName: z.string().optional().describe("For projects: The name of the folder to add the project to"),
    sequential: z.boolean().optional().describe("For projects: Whether tasks in the project should be sequential")
  })).describe("Array of items (tasks or projects) to add")
  ,
  createSequentially: z.boolean().optional().describe("Process parents before children; when false, best-effort order will still try to resolve parents first")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    // Call the batchAddItems function
    const result = await batchAddItems(args.items as BatchAddItemsParams[]);
    
    if (result.success) {
      const successCount = result.results.filter(r => r.success).length;
      const failureCount = result.results.filter(r => !r.success).length;
      
      let message = `✅ Successfully added ${successCount} items.`;
      
      if (failureCount > 0) {
        message += ` ⚠️ Failed to add ${failureCount} items.`;
      }
      
      // Include details about added items
      const details = result.results.map((item, index) => {
        if (item.success) {
          const itemType = args.items[index].type;
          const itemName = args.items[index].name;
          return `- ✅ ${itemType}: "${itemName}"`;
        } else {
          const itemType = args.items[index].type;
          const itemName = args.items[index].name;
          return `- ❌ ${itemType}: "${itemName}" - Error: ${item.error}`;
        }
      }).join('\n');
      
      return {
        content: [{
          type: "text" as const,
          text: `${message}\n\n${details}`
        }]
      };
    } else {
      console.error('[batch_add_items] failure result:', JSON.stringify(result));
      // Batch operation failed completely or no items succeeded.
      const failureDetails = (result.results && result.results.length > 0)
        ? result.results.map((r, index) => {
            const itemType = args.items[index].type;
            const itemName = args.items[index].name;
            return r.success
              ? `- ✅ ${itemType}: \"${itemName}\"`
              : `- ❌ ${itemType}: \"${itemName}\" - Error: ${r?.error || 'Unknown error'}`;
          }).join('\\n')
        : `No items processed. ${result.error || ''}`;

      return {
        content: [{
          type: "text" as const,
          text: `Failed to process batch operation.\\n\\n${failureDetails}`
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
        text: `Error processing batch operation: ${error.message}`
      }],
      isError: true
    };
  }
} 
