import { z } from 'zod';
import { addOmniFocusTask, AddOmniFocusTaskParams } from '../primitives/addOmniFocusTask.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  name: z.string().describe("The name of the task"),
  note: z.string().optional().describe("Additional notes for the task"),
  dueDate: z.string().optional().describe("The due date of the task in ISO format (YYYY-MM-DD or full ISO date)"),
  deferDate: z.string().optional().describe("The defer date of the task in ISO format (YYYY-MM-DD or full ISO date)"),
  plannedDate: z.string().optional().describe("The planned date of the task in ISO format (YYYY-MM-DD or full ISO date) - indicates intention to work on this task on this date"),
  flagged: z.boolean().optional().describe("Whether the task is flagged or not"),
  estimatedMinutes: z.number().optional().describe("Estimated time to complete the task, in minutes"),
  tags: z.array(z.string()).optional().describe("Tags to assign to the task"),
  projectId: z.string().optional().describe("The id of the project to add the task to (preferred when the project name is ambiguous — e.g. multiple 'Single Actions' projects across folders). Obtain via query_omnifocus. Takes precedence over projectName when both are supplied."),
  projectName: z.string().optional().describe("The name or folder path of the project to add the task to (e.g. 'My Project' or 'Work/My Project' to disambiguate by folder). Will add to inbox if not specified. Used when projectId is not supplied; for ambiguous names, prefer projectId. This places a NEWLY created task; to move a task that already exists into a project, use edit_item with newProjectName instead of creating a new task here."),
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
        // Name the project we were asked for. "in a project" was the old
        // fallback for the projectId path, which is exactly the caller who
        // cannot check the result by eye.
        if (args.projectName) {
          locationText = `in project "${args.projectName}"`;
        } else if (args.projectId) {
          locationText = `in project id ${args.projectId}`;
        } else {
          locationText = 'in a project';
        }
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

      // Echo the id (#104): without it, agents re-query immediately after every
      // write just to harvest the id for the follow-up edit.
      const idText = result.taskId ? ` (id: ${result.taskId})` : '';

      return {
        content: [{
          type: "text" as const,
          text: `✅ Task "${args.name}" created successfully ${locationText}${dueDateText}${tagText}${idText}.${placementWarning}`
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
