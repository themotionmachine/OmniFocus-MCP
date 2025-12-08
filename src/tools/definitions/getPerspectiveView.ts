import { z } from 'zod';
import { getPerspectiveView } from '../primitives/getPerspectiveView.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

export const schema = z.object({
  perspectiveName: z.string().describe("Name of the perspective to view (e.g., 'Inbox', 'Projects', 'Flagged', or custom perspective name)"),
  
  limit: z.number().optional().describe("Maximum number of items to return. Default: 100"),
  
  includeMetadata: z.boolean().optional().describe("Include additional metadata like project names, tags, dates. Default: true"),
  
  fields: z.array(z.string()).optional().describe("Specific fields to include in the response. Reduces response size. Available fields: id, name, note, flagged, dueDate, deferDate, completionDate, taskStatus, projectName, tagNames, estimatedMinutes")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    const result = await getPerspectiveView({
      perspectiveName: args.perspectiveName,
      limit: args.limit ?? 100,
      includeMetadata: args.includeMetadata ?? true,
      fields: args.fields
    });
    
    if (result.success) {
      const items = result.items || [];
      
      // Format the output
      let output = `## ${args.perspectiveName} Perspective (${items.length} items)\n\n`;
      
      if (items.length === 0) {
        output += "No items visible in this perspective.";
      } else {
        // Format each item
        items.forEach(item => {
          const parts = [];
          
          // Core display
          const flag = item.flagged ? '🚩 ' : '';
          const checkbox = item.completed ? '☑' : '☐';
          parts.push(`${checkbox} ${flag}${item.name || 'Unnamed'}`);
          
          // Project context
          if (item.projectName) {
            parts.push(`(${item.projectName})`);
          }
          
          // Due date
          if (item.dueDate) {
            const date = new Date(item.dueDate);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            parts.push(`[due: ${dateStr}]`);
          }
          
          // Defer date
          if (item.deferDate) {
            const date = new Date(item.deferDate);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            parts.push(`[defer: ${dateStr}]`);
          }
          
          // Time estimate
          if (item.estimatedMinutes) {
            const hours = item.estimatedMinutes >= 60 
              ? `${Math.floor(item.estimatedMinutes / 60)}h${item.estimatedMinutes % 60 > 0 ? (item.estimatedMinutes % 60) + 'm' : ''}`
              : `${item.estimatedMinutes}m`;
            parts.push(`(${hours})`);
          }
          
          // Tags
          if (item.tagNames && item.tagNames.length > 0) {
            parts.push(`<${item.tagNames.join(',')}>`);
          }
          
          // Status
          if (item.taskStatus && item.taskStatus !== 'Available') {
            parts.push(`#${item.taskStatus.toLowerCase()}`);
          }
          
          // ID for reference
          if (item.id) {
            parts.push(`[${item.id}]`);
          }
          
          output += `• ${parts.join(' ')}\n`;
          
          // Add note preview if present and not too long
          if (item.note && item.note.trim()) {
            const notePreview = item.note.trim().split('\n')[0].substring(0, 80);
            const ellipsis = item.note.length > 80 || item.note.includes('\n') ? '...' : '';
            output += `  └─ ${notePreview}${ellipsis}\n`;
          }
        });
      }
      
      if (items.length === args.limit) {
        output += `\n⚠️ Results limited to ${args.limit} items. More may be available in this perspective.`;
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
          text: `Failed to get perspective view: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Error getting perspective view: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error getting perspective view: ${error.message}`
      }],
      isError: true
    };
  }
}