import { z } from 'zod';
import { addFolder, AddFolderParams } from '../primitives/addFolder.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  name: z.string().describe("The name of the folder"),
  parentFolderName: z.string().optional().describe("The name of the parent folder to nest this folder under (will create at root if not specified)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Call the addFolder function
    const result = await addFolder(args as AddFolderParams);

    if (result.success) {
      // Folder was added successfully
      let locationText = args.parentFolderName
        ? `nested under "${args.parentFolderName}"`
        : "at the root level";

      return {
        content: [{
          type: "text" as const,
          text: `✅ Folder "${args.name}" created successfully ${locationText}.`
        }]
      };
    } else {
      // Folder creation failed
      return {
        content: [{
          type: "text" as const,
          text: `Failed to create folder: ${result.error}`
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
        text: `Error creating folder: ${error.message}`
      }],
      isError: true
    };
  }
}
