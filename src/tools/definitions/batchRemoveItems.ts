import { z } from 'zod';
import { batchRemoveItems, BatchRemoveItemsParams } from '../primitives/batchRemoveItems.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

export const schema = z.object({
  items: z.array(z.object({
    id: z.string().optional().describe("The ID of the task or project to remove"),
    name: z.string().optional().describe("The name of the task or project to remove (as fallback if ID not provided)"),
    itemType: z.enum(['task', 'project']).describe("Type of item to remove ('task' or 'project')")
  })).describe("Array of items (tasks or projects) to remove")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    // Validate that each item has at least an ID or name
    for (const item of args.items) {
      if (!item.id && !item.name) {
        return {
          content: [{
            type: "text" as const,
            text: "Each item must have either id or name provided to remove it."
          }],
          isError: true
        };
      }
    }
    
    // Call the batchRemoveItems function
    const result = await batchRemoveItems(args.items as BatchRemoveItemsParams[]);
    
    if (result.success) {
      const successCount = result.results.filter(r => r.success).length;
      const failureCount = result.results.filter(r => !r.success).length;
      
      let message = `✅ Successfully removed ${successCount} items.`;
      
      if (failureCount > 0) {
        message += ` ⚠️ Failed to remove ${failureCount} items.`;
      }
      
      // Include details about removed items
      const details = result.results.map((item, index) => {
        if (item.success) {
          const itemType = args.items[index].itemType;
          return `- ✅ ${itemType}: "${item.name}"`;
        } else {
          const itemType = args.items[index].itemType;
          const identifier = args.items[index].id || args.items[index].name;
          return `- ❌ ${itemType}: ${identifier} - Error: ${item.error}`;
        }
      }).join('\n');
      
      return {
        content: [{
          type: "text" as const,
          text: `${message}\n\n${details}`
        }]
      };
    } else {
      // Batch operation failed completely
      return {
        content: [{
          type: "text" as const,
          text: `Failed to process batch removal: ${result.error}`
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
        text: `Error processing batch removal: ${error.message}`
      }],
      isError: true
    };
  }
} 