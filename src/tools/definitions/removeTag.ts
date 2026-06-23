import { z } from 'zod';
import { removeTag } from '../primitives/removeTag.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  id: z.string().optional().describe("The ID of the tag to remove"),
  name: z.string().optional().describe("The exact name of the tag to remove (as fallback if ID not provided)"),
  dangerousGrant: z.string().optional().describe("Short-lived signed grant authorizing this exact destructive operation")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    if (!args.id && !args.name) {
      return {
        content: [{
          type: "text" as const,
          text: "Either id or name must be provided to remove a tag."
        }],
        isError: true
      };
    }

    const result = await removeTag({
      id: args.id,
      name: args.name
    });

    if (result.success) {
      return {
        content: [{
          type: "text" as const,
          text: `✅ Tag "${result.name}" removed successfully.`
        }]
      };
    }

    let errorMsg = 'Failed to remove tag';
    if (result.error) {
      if (result.error.includes("Tag not found")) {
        errorMsg = 'Tag not found';
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
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);

    return {
      content: [{
        type: "text" as const,
        text: `Error removing tag: ${error.message}`
      }],
      isError: true
    };
  }
}
