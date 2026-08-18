import { z } from 'zod';
import { addOmniFocusTask, AddOmniFocusTaskParams } from '../primitives/addOmniFocusTask.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { repeatShape } from './repeatSchema.js';

export const schema = z.object({
  name: z.string().describe("Task name"),
  note: z.string().optional().describe("Task note"),
  dueDate: z.string().optional().describe("Due date (YYYY-MM-DD or full ISO)"),
  deferDate: z.string().optional().describe("Defer date (YYYY-MM-DD or full ISO)"),
  plannedDate: z.string().optional().describe("Planned date — the day you intend to work on it (YYYY-MM-DD or full ISO)"),
  flagged: z.boolean().optional().describe("Flag the task"),
  estimatedMinutes: z.number().optional().describe("Time estimate in minutes"),
  tags: z.array(z.string()).optional().describe("Tag names to assign"),
  projectId: z.string().optional().describe("Project id to place the task in; takes precedence over projectName. Prefer when names are ambiguous"),
  projectName: z.string().optional().describe("Project name or folder path ('Work/My Project') to place the task in; defaults to inbox. To move an EXISTING task, use edit_item with newProjectName instead of creating a duplicate here"),
  // Hierarchy support
  parentTaskId: z.string().optional().describe("Parent task id (preferred over name)"),
  parentTaskName: z.string().optional().describe("Parent task name; matched within the project if one is given"),
  hierarchyLevel: z.number().int().min(0).optional().describe("Ordering hint for batch workflows (0 = root); ignored in single add"),
  repeat: repeatShape.optional()
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
