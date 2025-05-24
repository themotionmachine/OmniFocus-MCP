import { z } from 'zod';
import { getTaskDetails, GetTaskDetailsParams } from '../primitives/getTaskDetails.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  taskId: z.string().optional().describe("The ID of the task to get details for"),
  taskName: z.string().optional().describe("The name of the task to get details for (partial match supported)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Call the getTaskDetails function
    const result = await getTaskDetails(args as GetTaskDetailsParams);
    
    if (result.success && result.task) {
      // Format the task details for display
      const task = result.task;
      let output = `📋 **Task Details**\n\n`;
      
      // Basic information
      output += `**Name:** ${task.name}\n`;
      output += `**ID:** ${task.id}\n`;
      output += `**Status:** ${task.taskStatus}\n`;
      
      // Flags and properties
      if (task.flagged) output += `**Flagged:** 🚩 Yes\n`;
      if (task.sequential) output += `**Sequential:** Yes\n`;
      if (task.completedByChildren) output += `**Completed by children:** Yes\n`;
      
      // Dates
      if (task.dueDate) {
        output += `**Due Date:** ${new Date(task.dueDate).toLocaleDateString()}\n`;
      }
      if (task.deferDate) {
        output += `**Defer Date:** ${new Date(task.deferDate).toLocaleDateString()}\n`;
      }
      if (task.completionDate) {
        output += `**Completed:** ${new Date(task.completionDate).toLocaleDateString()}\n`;
      }
      
      // Time estimate
      if (task.estimatedMinutes) {
        const hours = Math.floor(task.estimatedMinutes / 60);
        const minutes = task.estimatedMinutes % 60;
        output += `**Estimated Time:** ${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}m` : ''}\n`;
      }
      
      // Relationships
      if (task.projectName) {
        output += `**Project:** ${task.projectName}\n`;
      }
      if (task.parentTaskName) {
        output += `**Parent Task:** ${task.parentTaskName} [${task.parentId}]\n`;
      }
      if (task.childTaskNames && task.childTaskNames.length > 0) {
        output += `**Subtasks:** ${task.childTaskNames.length} tasks\n`;
        task.childTaskNames.forEach((childName, index) => {
          output += `  - ${childName} [${task.childIds[index]}]\n`;
        });
      }
      
      // Tags
      if (task.tagNames && task.tagNames.length > 0) {
        output += `**Tags:** ${task.tagNames.join(', ')}\n`;
      }
      
      // Note
      if (task.note) {
        output += `\n**Note:**\n${task.note}\n`;
      }
      
      // Additional metadata
      output += `\n**Metadata:**\n`;
      output += `- Has Children: ${task.hasChildren ? 'Yes' : 'No'}\n`;
      output += `- Active: ${task.active ? 'Yes' : 'No'}\n`;
      if (task.repetitionRule) {
        output += `- Repeating: Yes (${task.repetitionRule})\n`;
      }
      
      return {
        content: [{
          type: "text" as const,
          text: output
        }]
      };
    } else {
      // Task not found or error
      return {
        content: [{
          type: "text" as const,
          text: `❌ ${result.error || 'Task not found'}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    return {
      content: [{
        type: "text" as const,
        text: `Error getting task details: ${error.message}`
      }],
      isError: true
    };
  }
}