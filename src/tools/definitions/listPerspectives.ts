import { z } from 'zod';
import { listPerspectives } from '../primitives/listPerspectives.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  includeBuiltIn: z.boolean().optional().describe("Include built-in perspectives (Inbox, Projects, Tags, etc.). Default: true"),
  includeCustom: z.boolean().optional().describe("Include custom perspectives (Pro feature). Default: true")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await listPerspectives({
      includeBuiltIn: args.includeBuiltIn ?? true,
      includeCustom: args.includeCustom ?? true
    });
    
    if (result.success) {
      const perspectives = result.perspectives || [];
      
      // Format the perspectives in a readable way
      let output = `## Available Perspectives (${perspectives.length})\n\n`;
      
      // Group by type
      const builtIn = perspectives.filter(p => p.type === 'builtin');
      const custom = perspectives.filter(p => p.type === 'custom');
      
      if (builtIn.length > 0) {
        output += `### Built-in Perspectives\n`;
        builtIn.forEach(p => {
          output += `• ${p.name}\n`;
        });
      }
      
      if (custom.length > 0) {
        if (builtIn.length > 0) output += '\n';
        output += `### Custom Perspectives\n`;
        custom.forEach(p => {
          output += `• ${p.name}\n`;
        });
      }
      
      if (perspectives.length === 0) {
        output = "No perspectives found.";
      }
      
      return {
        content: [{
          type: "text" as const,
          text: output
        }]
      };
    } else {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to list perspectives: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Error listing perspectives: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error listing perspectives: ${error.message}`
      }],
      isError: true
    };
  }
}