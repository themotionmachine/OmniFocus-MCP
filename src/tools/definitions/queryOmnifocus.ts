import { z } from 'zod';
import { queryOmnifocus, QueryOmnifocusParams } from '../primitives/queryOmnifocus.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  entity: z.enum(['tasks', 'projects', 'folders']).describe("Type of entity to query. Choose 'tasks' for individual tasks, 'projects' for projects, or 'folders' for folder organization"),
  
  filters: z.object({
    projectId: z.string().optional().describe("Filter tasks by exact project ID (use when you know the specific project ID)"),
    projectName: z.string().optional().describe("Filter tasks by project name. CASE-INSENSITIVE PARTIAL MATCHING - 'review' matches 'Weekly Review', 'Review Documents', etc. Special value: 'inbox' returns inbox tasks"),
    folderId: z.string().optional().describe("Filter projects by exact folder ID (use when you know the specific folder ID)"),
    tags: z.array(z.string()).optional().describe("Filter by tag names. EXACT MATCH, CASE-SENSITIVE. OR logic - items must have at least ONE of the specified tags. Example: ['Work'] and ['work'] are different"),
    status: z.array(z.string()).optional().describe("Filter by status (OR logic - matches any). TASKS: 'Next' (next action), 'Available' (ready to work), 'Blocked' (waiting), 'DueSoon' (due <24h), 'Overdue' (past due), 'Completed', 'Dropped'. PROJECTS: 'Active', 'OnHold', 'Done', 'Dropped'"),
    flagged: z.boolean().optional().describe("Filter by flagged status. true = only flagged items, false = only unflagged items"),
    dueWithin: z.number().optional().describe("Returns items due from TODAY through N days in future. Example: 7 = items due within next week (today + 6 days)"),
    deferredUntil: z.number().optional().describe("Returns items CURRENTLY DEFERRED that will become available within N days. Example: 3 = items becoming available in next 3 days"),
    plannedWithin: z.number().optional().describe("Returns tasks planned from TODAY through N days in future. Example: 7 = tasks planned within next week (today + 6 days)"),
    hasNote: z.boolean().optional().describe("Filter by note presence. true = items with non-empty notes (whitespace ignored), false = items with no notes or only whitespace"),
    reviewDue: z.enum(['overdue', 'today', 'this_week', 'this_month']).optional().describe("Filter projects by review status. 'overdue' = past due for review, 'today' = due today, 'this_week' = due within 7 days, 'this_month' = due this month")
  }).optional().describe("Optional filters to narrow results. ALL filters combine with AND logic (must match all). Within array filters (tags, status) OR logic applies"),
  
  fields: z.array(z.string()).optional().describe("Specific fields to return (reduces response size). TASK FIELDS: id, name, note, flagged, taskStatus, dueDate, deferDate, plannedDate, effectiveDueDate, effectiveDeferDate, effectivePlannedDate, completionDate, estimatedMinutes, tagNames, tags, projectName, projectId, parentId, childIds, hasChildren, sequential, completedByChildren, inInbox, modificationDate (or modified), creationDate (or added). PROJECT FIELDS: id, name, status, note, folderName, folderID, sequential, dueDate, deferDate, effectiveDueDate, effectiveDeferDate, completedByChildren, containsSingletonActions, taskCount, tasks, reviewInterval, reviewIntervalSteps, reviewIntervalUnit, nextReviewDate, lastReviewDate, modificationDate, creationDate. FOLDER FIELDS: id, name, path, parentFolderID, status, projectCount, projects, subfolders. NOTE: Date fields use 'added' and 'modified' in OmniFocus API"),
  
  limit: z.number().optional().describe("Maximum number of items to return. Useful for large result sets. Default: no limit"),
  
  sortBy: z.string().optional().describe("Field to sort by. OPTIONS: name (alphabetical), dueDate (earliest first, null last), deferDate (earliest first, null last), plannedDate (earliest first, null last), nextReviewDate (earliest first, null last), modificationDate (most recent first), creationDate (oldest first), estimatedMinutes (shortest first), taskStatus (groups by status)"),
  
  sortOrder: z.enum(['asc', 'desc']).optional().describe("Sort order. 'asc' = ascending (A-Z, old-new, small-large), 'desc' = descending (Z-A, new-old, large-small). Default: 'asc'"),
  
  includeCompleted: z.boolean().optional().describe("Include completed/dropped items in results. Default: false (excludes: completed/dropped tasks, done/dropped projects, dropped folders). Set to true to see all items regardless of status."),
  
  summary: z.boolean().optional().describe("Return only count of matches, not full details. Efficient for statistics. Default: false")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Call the queryOmniFocus function
    const result = await queryOmnifocus(args as QueryOmnifocusParams);
    
    if (result.success) {
      // Format response based on whether it's a summary or full results
      if (args.summary) {
        return {
          content: [{
            type: "text" as const,
            text: `Found ${result.count} ${args.entity} matching your criteria.`
          }]
        };
      } else {
        // Format the results in a compact, readable format
        const items = result.items || [];
        let output = formatQueryResults(items, args.entity, args.filters);

        // Add resource hint footer for navigation
        if (items.length > 0) {
          output += `\n\n💡 Tip: Use MCP resources to browse details:\n`;
          output += `   • Tasks: omnifocus://task/{id}\n`;
          output += `   • Projects: omnifocus://project/{id}\n`;
          output += `   • Folders: omnifocus://folder/{id}`;
        }

        // Add metadata about the query
        if (items.length === args.limit) {
          output += `\n\n⚠️ Results limited to ${args.limit} items. More may be available.`;
        }

        return {
          content: [{
            type: "text" as const,
            text: output
          }]
        };
      }
    } else {
      return {
        content: [{
          type: "text" as const,
          text: `Query failed: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Query execution error: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error executing query: ${error.message}`
      }],
      isError: true
    };
  }
}

// Helper function to format query results in a compact way
function formatQueryResults(items: any[], entity: string, filters?: any): string {
  if (items.length === 0) {
    return `No ${entity} found matching the specified criteria.`;
  }
  
  let output = `## Query Results: ${items.length} ${entity}\n\n`;
  
  // Add filter summary if filters were applied
  if (filters && Object.keys(filters).length > 0) {
    output += `Filters applied: ${formatFilters(filters)}\n\n`;
  }
  
  // Format each item based on entity type
  switch (entity) {
    case 'tasks':
      output += formatTasks(items);
      break;
    case 'projects':
      output += formatProjects(items);
      break;
    case 'folders':
      output += formatFolders(items);
      break;
  }
  
  return output;
}

function formatFilters(filters: any): string {
  const parts = [];
  if (filters.projectId) parts.push(`projectId: "${filters.projectId}"`);
  if (filters.projectName) parts.push(`project: "${filters.projectName}"`);
  if (filters.folderId) parts.push(`folderId: "${filters.folderId}"`);
  if (filters.tags) parts.push(`tags: [${filters.tags.join(', ')}]`);
  if (filters.status) parts.push(`status: [${filters.status.join(', ')}]`);
  if (filters.flagged !== undefined) parts.push(`flagged: ${filters.flagged}`);
  if (filters.dueWithin) parts.push(`due within ${filters.dueWithin} days`);
  if (filters.deferredUntil) parts.push(`deferred becoming available within ${filters.deferredUntil} days`);
  if (filters.hasNote !== undefined) parts.push(`has note: ${filters.hasNote}`);
  return parts.join(', ');
}

function formatTasks(tasks: any[]): string {
  return tasks.map(task => {
    const parts = [];

    // Core display
    const flag = task.flagged ? '🚩 ' : '';
    parts.push(`• ${flag}${task.name || 'Unnamed'}`);

    // Add ID if present
    if (task.id) {
      parts.push(`[${task.id}]`);
    }

    // Project context
    if (task.projectName) {
      parts.push(`(${task.projectName})`);
    }

    // Dates
    if (task.dueDate) {
      parts.push(`[due: ${formatDate(task.dueDate)}]`);
    }
    if (task.deferDate) {
      parts.push(`[defer: ${formatDate(task.deferDate)}]`);
    }
    if (task.plannedDate) {
      parts.push(`[planned: ${formatDate(task.plannedDate)}]`);
    }

    // Time estimate
    if (task.estimatedMinutes) {
      const hours = task.estimatedMinutes >= 60
        ? `${Math.floor(task.estimatedMinutes / 60)}h`
        : `${task.estimatedMinutes}m`;
      parts.push(`(${hours})`);
    }

    // Tags
    if (task.tagNames?.length > 0) {
      parts.push(`<${task.tagNames.join(',')}>`);
    }

    // Status
    if (task.taskStatus) {
      parts.push(`#${task.taskStatus.toLowerCase()}`);
    }

    // Metadata dates if requested
    if (task.creationDate) {
      parts.push(`[created: ${formatDate(task.creationDate)}]`);
    }
    if (task.modificationDate) {
      parts.push(`[modified: ${formatDate(task.modificationDate)}]`);
    }
    if (task.completionDate) {
      parts.push(`[completed: ${formatDate(task.completionDate)}]`);
    }

    return parts.join(' ');
  }).join('\n');
}

function formatProjects(projects: any[]): string {
  return projects.map(project => {
    const status = project.status !== 'Active' ? ` [${project.status}]` : '';
    const folder = project.folderName ? ` 📁 ${project.folderName}` : '';
    const taskCount = project.taskCount !== undefined && project.taskCount !== null ? ` (${project.taskCount} tasks)` : '';
    const flagged = project.flagged ? '🚩 ' : '';
    const due = project.dueDate ? ` [due: ${formatDate(project.dueDate)}]` : '';
    const review = project.nextReviewDate ? ` [review: ${formatDate(project.nextReviewDate)}]` : '';

    return `P: ${flagged}${project.name}${status}${due}${review}${folder}${taskCount}`;
  }).join('\n');
}

function formatFolders(folders: any[]): string {
  return folders.map(folder => {
    const parts = [];

    // Name
    parts.push(`F: ${folder.name}`);

    // ID if present
    if (folder.id) {
      parts.push(`[${folder.id}]`);
    }

    // Parent folder info
    if (folder.parentFolderName) {
      parts.push(`(in: ${folder.parentFolderName})`);
    } else if (folder.parentFolderId || folder.parentFolderID) {
      const parentId = folder.parentFolderId || folder.parentFolderID;
      parts.push(`(parent: ${parentId})`);
    }

    // Project count
    if (folder.projectCount !== undefined) {
      parts.push(`(${folder.projectCount} projects)`);
    }

    // Path
    if (folder.path) {
      parts.push(`📍 ${folder.path}`);
    }

    return parts.join(' ');
  }).join('\n');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}