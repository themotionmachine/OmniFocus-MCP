import { z } from 'zod';
import { editItem, EditItemParams } from '../primitives/editItem.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  id: z.string().optional().describe("Item id (takes precedence over name)"),
  name: z.string().optional().describe("Item name, as fallback when no id"),
  itemType: z.enum(['task', 'project']).describe("What kind of item"),

  // Common editable fields. Dates take YYYY-MM-DD or full ISO; "" clears.
  newName: z.string().optional().describe("New name"),
  newNote: z.string().optional().describe("New note"),
  newDueDate: z.string().optional().describe("New due date (ISO; \"\" clears)"),
  newDeferDate: z.string().optional().describe("New defer date (ISO; \"\" clears)"),
  newPlannedDate: z.string().optional().describe("New planned date (ISO; \"\" clears; tasks only)"),
  newFlagged: z.boolean().optional().describe("Set flagged status"),
  newEstimatedMinutes: z.number().optional().describe("New time estimate in minutes"),

  // Task-specific fields
  newStatus: z.enum(['incomplete', 'completed', 'dropped', 'skipped']).optional().describe("New task status. 'skipped' (repeating tasks only) completes the occurrence to trigger the next repeat, then drops the instance"),
  addTags: z.array(z.string()).optional().describe("Tags to add"),
  removeTags: z.array(z.string()).optional().describe("Tags to remove"),
  replaceTags: z.array(z.string()).optional().describe("Replace all tags with these"),
  newProjectName: z.string().optional().describe("Move the task to this project (name or folder path like 'Work/My Project'); \"\" or 'inbox' moves it to the inbox (tasks only)"),

  // Project-specific fields
  newSequential: z.boolean().optional().describe("Make the project sequential"),
  newFolderName: z.string().optional().describe("Move the project to this folder"),
  newProjectStatus: z.enum(['active', 'completed', 'dropped', 'onHold']).optional().describe("New project status"),
  markReviewed: z.boolean().optional().describe("true marks the project reviewed, scheduling the next review from its review interval (projects only)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Validate that either id or name is provided
    if (!args.id && !args.name) {
      return {
        content: [{
          type: "text" as const,
          text: "Either id or name must be provided to edit an item."
        }],
        isError: true
      };
    }
    
    // Call the editItem function 
    const result = await editItem(args as EditItemParams);
    
    if (result.success) {
      // Item was edited successfully
      const itemTypeLabel = args.itemType === 'task' ? 'Task' : 'Project';
      let changedText = '';
      
      if (result.changedProperties) {
        changedText = ` (${result.changedProperties})`;
      }
      
      // Echo the id (#104) — especially valuable here on the name-fallback
      // lookup path, where the caller may not have known the id at all.
      const idText = result.id ? ` (id: ${result.id})` : '';

      return {
        content: [{
          type: "text" as const,
          text: `✅ ${itemTypeLabel} "${result.name}" updated successfully${changedText}${idText}.`
        }]
      };
    } else {
      // Item editing failed
      let errorMsg = `Failed to update ${args.itemType}`;
      
      if (result.error) {
        if (result.error.includes("Item not found")) {
          errorMsg = `${args.itemType.charAt(0).toUpperCase() + args.itemType.slice(1)} not found`;
          if (args.id) errorMsg += ` with ID "${args.id}"`;
          if (args.name) errorMsg += `${args.id ? ' or' : ' with'} name "${args.name}"`;
          errorMsg += '.';
        } else {
          errorMsg += `: ${result.error}`;
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
        text: `Error updating ${args.itemType}: ${error.message}`
      }],
      isError: true
    };
  }
} 