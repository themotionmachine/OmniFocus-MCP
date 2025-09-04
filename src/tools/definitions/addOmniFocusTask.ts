import { z } from 'zod';
import { addOmniFocusTask, AddOmniFocusTaskParams } from '../primitives/addOmniFocusTask.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  name: z.string().describe("The name of the task"),
  note: z.string().optional().describe("Additional notes for the task"),
  dueDate: z.string().optional().describe("The due date of the task in ISO format (YYYY-MM-DD or full ISO date)"),
  deferDate: z.string().optional().describe("The defer date of the task in ISO format (YYYY-MM-DD or full ISO date)"),
  flagged: z.boolean().optional().describe("Whether the task is flagged or not"),
  estimatedMinutes: z.number().optional().describe("Estimated time to complete the task, in minutes"),
  tags: z.array(z.string()).optional().describe("Tags to assign to the task"),
  projectName: z.string().optional().describe("The name of the project to add the task to (will add to inbox if not specified)"),
  // Hierarchy support
  parentTaskId: z.string().optional().describe("ID of the parent task (preferred for accuracy)"),
  parentTaskName: z.string().optional().describe("Name of the parent task (used if ID not provided; matched within project or globally if no project)"),
  hierarchyLevel: z.number().int().min(0).optional().describe("Explicit level indicator for ordering in batch workflows (0=root) - ignored in single add")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Call the addOmniFocusTask function 
    const result = await addOmniFocusTask(args as AddOmniFocusTaskParams);
    console.error('[add_omnifocus_task] args:', JSON.stringify(args));
    console.error('[add_omnifocus_task] result:', JSON.stringify(result));
    
    if (result.success) {
      // Determine actual placement
      const placement = (result as any).placement as 'parent' | 'project' | 'inbox' | undefined;
      let locationText = '';
      if (placement === 'parent') {
        locationText = 'under the parent task';
      } else if (placement === 'project') {
        locationText = args.projectName ? `in project "${args.projectName}"` : 'in a project';
      } else {
        locationText = 'in your inbox';
      }

      const tagText = args.tags && args.tags.length > 0
        ? ` with tags: ${args.tags.join(', ')}`
        : '';

      const dueDateText = args.dueDate
        ? ` due on ${new Date(args.dueDate).toLocaleDateString()}`
        : '';

      // Warning if parent requested but not used
      let placementWarning = '';
      if ((args.parentTaskId || args.parentTaskName) && placement && placement !== 'parent') {
        placementWarning = `\n⚠️ Parent not found; task created ${placement === 'project' ? 'in project' : 'in inbox'}.`;
      }

      return {
        content: [{
          type: "text" as const,
          text: `✅ Task "${args.name}" created successfully ${locationText}${dueDateText}${tagText}.${placementWarning}`
        }]
      };
    } else {
      // Task creation failed
      return {
        content: [{
          type: "text" as const,
          text: `Failed to create task: ${result.error}`
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
        text: `Error creating task: ${error.message}`
      }],
      isError: true
    };
  }
} 
