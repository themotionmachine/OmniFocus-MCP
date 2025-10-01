import { z } from 'zod';
import { removeFolder, RemoveFolderParams } from '../primitives/removeFolder.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  id: z.string().optional().describe("The ID of the folder to remove (preferred over name)"),
  name: z.string().optional().describe("The name of the folder to remove (used if id is not provided)")
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

  try {
    // Call the removeFolder function
    const result = await removeFolder(args as RemoveFolderParams);

    if (result.success) {
      // Folder was removed successfully
      let message = `✅ Folder "${result.name}" has been permanently deleted.`;

      // Report what was moved to root
      if (result.projectsMoved || result.childFoldersMoved) {
        message += `\n\n📦 Before deletion, contents were moved to root level:`;
        if (result.projectsMoved) {
          message += `\n  • ${result.projectsMoved} project(s) moved to root`;
        }
        if (result.childFoldersMoved) {
          message += `\n  • ${result.childFoldersMoved} child folder(s) moved to root`;
        }
      }

      return {
        content: [{
          type: "text" as const,
          text: message
        }]
      };
    } else {
      // Folder removal failed
      return {
        content: [{
          type: "text" as const,
          text: `Failed to delete folder: ${result.error}`
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
        text: `Error deleting folder: ${error.message}`
      }],
      isError: true
    };
  }
}
