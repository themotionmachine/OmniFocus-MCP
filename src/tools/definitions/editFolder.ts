import { z } from 'zod';
import { editFolder, EditFolderParams } from '../primitives/editFolder.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  id: z.string().optional().describe("The ID of the folder to edit (preferred over name)"),
  name: z.string().optional().describe("The name of the folder to edit (used if id is not provided)"),
  newName: z.string().optional().describe("New name for the folder"),
  newParentFolderName: z.string().optional().describe("Move folder to this parent folder (use empty string to move to root level)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  // Validation: Must provide id or name
  if (!args.id && !args.name) {
    return {
      content: [{
        type: "text" as const,
        text: "Either id or name must be provided"
      }],
      isError: true
    };
  }

  // Validation: Must provide at least one change
  if (!args.newName && args.newParentFolderName === undefined) {
    return {
      content: [{
        type: "text" as const,
        text: "At least one property to update must be provided (newName or newParentFolderName)"
      }],
      isError: true
    };
  }

  try {
    // Call the editFolder function
    const result = await editFolder(args as EditFolderParams);

    if (result.success) {
      // Folder was edited successfully
      return {
        content: [{
          type: "text" as const,
          text: `✅ Folder "${result.name}" updated successfully. Changed: ${result.changedProperties}`
        }]
      };
    } else {
      // Folder edit failed
      return {
        content: [{
          type: "text" as const,
          text: `Failed to update folder: ${result.error}`
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
        text: `Error updating folder: ${error.message}`
      }],
      isError: true
    };
  }
}
