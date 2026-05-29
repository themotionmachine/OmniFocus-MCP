import { z } from 'zod';
import { createTag } from '../primitives/createTag.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  name: z.string().describe("Name of the tag to create"),
  parentTagName: z.string().optional().describe("Name of an existing tag to nest the new tag under. Ignored if parentTagID is provided."),
  parentTagID: z.string().optional().describe("ID of an existing tag to nest the new tag under. Takes precedence over parentTagName.")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await createTag({
      name: args.name,
      parentTagName: args.parentTagName,
      parentTagID: args.parentTagID
    });

    if (result.success) {
      const nested = args.parentTagID || args.parentTagName;
      const location = nested ? ` under "${args.parentTagName ?? args.parentTagID}"` : '';
      return {
        content: [{
          type: "text" as const,
          text: `Created tag "${result.name}"${location} (id: ${result.tagId})`
        }]
      };
    } else {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to create tag: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Error creating tag: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error creating tag: ${error.message}`
      }],
      isError: true
    };
  }
}
