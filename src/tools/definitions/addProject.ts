import { z } from 'zod';
import { addProject, AddProjectParams } from '../primitives/addProject.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { repeatShape } from './repeatSchema.js';

export const schema = z.object({
  name: z.string().describe("Project name"),
  note: z.string().optional().describe("Project note"),
  dueDate: z.string().optional().describe("Due date (YYYY-MM-DD or full ISO)"),
  deferDate: z.string().optional().describe("Defer date (YYYY-MM-DD or full ISO)"),
  flagged: z.boolean().optional().describe("Flag the project"),
  estimatedMinutes: z.number().optional().describe("Time estimate in minutes"),
  tags: z.array(z.string()).optional().describe("Tag names to assign"),
  folderName: z.string().optional().describe("Folder to place the project in (root if omitted)"),
  sequential: z.boolean().optional().describe("Make tasks sequential (default: false)"),
  repeat: repeatShape.optional()
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Call the addProject function 
    const result = await addProject(args as AddProjectParams);
    
    if (result.success) {
      // Project was added successfully
      let locationText = args.folderName 
        ? `in folder "${args.folderName}"` 
        : "at the root level";
        
      let tagText = args.tags && args.tags.length > 0
        ? ` with tags: ${args.tags.join(', ')}`
        : "";
        
      let dueDateText = args.dueDate
        ? ` due on ${new Date(args.dueDate).toLocaleDateString()}`
        : "";
        
      let sequentialText = args.sequential
        ? " (sequential)"
        : " (parallel)";

      // Echo the id (#104): without it, agents re-query immediately after every
      // write just to harvest the id for the follow-up edit.
      const idText = result.projectId ? ` (id: ${result.projectId})` : '';

      return {
        content: [{
          type: "text" as const,
          text: `✅ Project "${args.name}" created successfully ${locationText}${dueDateText}${tagText}${sequentialText}${idText}.`
        }]
      };
    } else {
      // Project creation failed
      return {
        content: [{
          type: "text" as const,
          text: `Failed to create project: ${result.error}`
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
        text: `Error creating project: ${error.message}`
      }],
      isError: true
    };
  }
} 