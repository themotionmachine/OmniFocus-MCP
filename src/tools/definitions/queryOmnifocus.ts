import { z } from 'zod';
import { queryOmnifocus, QueryOmnifocusParams } from '../primitives/queryOmnifocus.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { resolveDateFilter } from '../../utils/dateFilter.js';

export const schema = z.object({
  entity: z.enum(['tasks', 'projects', 'folders']).describe("Type of entity to query. Choose 'tasks' for individual tasks, 'projects' for projects, or 'folders' for folder organization"),
  
  filters: z.object({
    projectId: z.string().optional().describe("Filter tasks by exact project ID (use when you know the specific project ID)"),
    projectName: z.string().optional().describe("Filter tasks by project name. CASE-INSENSITIVE PARTIAL MATCHING - 'review' matches 'Weekly Review', 'Review Documents', etc. Special value: 'inbox' returns inbox tasks"),
    taskName: z.string().optional().describe("Filter tasks by task name. CASE-INSENSITIVE PARTIAL MATCHING - 'email' matches 'Send email to IT', 'Confirm email' etc. Useful for fuzzy searching specific tasks across all projects"),
    folderId: z.string().optional().describe("Filter by folder ID. For tasks, returns tasks whose containing project is in this folder (or a subfolder). For projects, returns projects in this folder (or a subfolder)"),
    tags: z.array(z.string()).optional().describe("Filter by tag names. EXACT MATCH, CASE-SENSITIVE. OR logic - items must have at least ONE of the specified tags. Example: ['Work'] and ['work'] are different"),
    status: z.array(z.string()).optional().describe("Filter by status (OR logic - matches any). TASKS: 'Next' (next action), 'Available' (ready to work), 'Blocked' (waiting), 'DueSoon' (due <24h), 'Overdue' (past due), 'Completed', 'Dropped'. PROJECTS: 'Active', 'OnHold', 'Done', 'Dropped'"),
    flagged: z.boolean().optional().describe("Filter by flagged status. true = only flagged items, false = only unflagged items"),
    dueWithin: z.union([z.number(), z.string()]).optional().describe("Returns items due from TODAY through N days in future. Accepts: number (days), 'today', 'tomorrow', 'this week', 'next week', or ISO date 'YYYY-MM-DD'"),
    deferredUntil: z.union([z.number(), z.string()]).optional().describe("Returns items CURRENTLY DEFERRED that will become available within N days. Accepts: number (days), 'today', 'tomorrow', 'this week', 'next week', or ISO date 'YYYY-MM-DD'"),
    plannedWithin: z.union([z.number(), z.string()]).optional().describe("Returns tasks planned from TODAY through N days in future. Accepts: number (days), 'today', 'tomorrow', 'this week', 'next week', or ISO date 'YYYY-MM-DD'"),
    hasNote: z.boolean().optional().describe("Filter by note presence. true = items with non-empty notes (whitespace ignored), false = items with no notes or only whitespace"),
    inbox: z.boolean().optional().describe("Filter tasks by inbox status. true = only inbox tasks (no project), false = only tasks in a project"),
    dueOn: z.union([z.number(), z.string()]).optional().describe("Returns items due on exactly this day. Accepts: number (0 = today, 1 = tomorrow), 'today', 'tomorrow', 'this week', 'next week', or ISO date 'YYYY-MM-DD'"),
    deferOn: z.union([z.number(), z.string()]).optional().describe("Returns items with defer date on exactly this day. Accepts: number (0 = today, 1 = tomorrow), 'today', 'tomorrow', 'this week', 'next week', or ISO date 'YYYY-MM-DD'"),
    plannedOn: z.union([z.number(), z.string()]).optional().describe("Returns tasks with planned date on exactly this day. Accepts: number (0 = today, 1 = tomorrow), 'today', 'tomorrow', 'this week', 'next week', or ISO date 'YYYY-MM-DD'"),
    addedWithin: z.number().optional().describe("Returns items added (created) within the last N days. Example: 7 = items added in the last week"),
    addedOn: z.number().optional().describe("Returns items added (created) on exactly this day. 0 = today, 1 = tomorrow, -1 = yesterday. Negative values look backward"),
    isRepeating: z.boolean().optional().describe("Filter by repeating status. true = only repeating tasks, false = only non-repeating tasks"),
    completedWithin: z.number().optional().describe("Returns items completed or dropped within the last N days (uses completionDate which OmniFocus sets for both). Example: 7 = items completed in the last week. Combine with status: ['Dropped'] to find only dropped items. Note: use with includeCompleted: true"),
    completedOn: z.number().optional().describe("Returns items completed or dropped on exactly this day (uses completionDate which OmniFocus sets for both). 0 = today, -1 = yesterday. Negative values look backward. Combine with status: ['Dropped'] to find only dropped items. Note: use with includeCompleted: true")
  }).optional().describe("Optional filters to narrow results. ALL filters combine with AND logic (must match all). Within array filters (tags, status) OR logic applies"),
  
  fields: z.array(z.string()).optional().describe("Specific fields to return (reduces response size). TASK FIELDS: id, name, note, flagged, taskStatus, dueDate, deferDate, plannedDate, effectiveDueDate, effectiveDeferDate, effectivePlannedDate, completionDate, estimatedMinutes, tagNames, tags, projectName, projectId, parentId, childIds, hasChildren, sequential, completedByChildren, inInbox, isRepeating, repetitionRule, modificationDate (or modified), creationDate (or added). PROJECT FIELDS: id, name, status, note, folderName, folderID, sequential, dueDate, deferDate, effectiveDueDate, effectiveDeferDate, completedByChildren, containsSingletonActions, taskCount, tasks, modificationDate, creationDate. FOLDER FIELDS: id, name, path, parentFolderID, status, projectCount, projects, subfolders. NOTE: Date fields use 'added' and 'modified' in OmniFocus API"),
  
  limit: z.number().optional().describe("Maximum number of items to return. Useful for large result sets. Default: no limit"),
  
  sortBy: z.string().optional().describe("Field to sort by. OPTIONS: name (alphabetical), dueDate (earliest first, null last), deferDate (earliest first, null last), modificationDate (most recent first), creationDate (oldest first), estimatedMinutes (shortest first), taskStatus (groups by status)"),
  
  sortOrder: z.enum(['asc', 'desc']).optional().describe("Sort order. 'asc' = ascending (A-Z, old-new, small-large), 'desc' = descending (Z-A, new-old, large-small). Default: 'asc'"),
  
  includeCompleted: z.boolean().optional().describe("Include completed and dropped items. Default: false (active items only)"),
  
  summary: z.boolean().optional().describe("Return only count of matches, not full details. Efficient for statistics. Default: false")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Normalize date filter strings to numbers
    const normalizedArgs = { ...args };
    if (normalizedArgs.filters) {
      const f = { ...normalizedArgs.filters };
      const dateFields = ['dueWithin', 'deferredUntil', 'plannedWithin', 'dueOn', 'deferOn', 'plannedOn'] as const;
      for (const field of dateFields) {
        if (f[field] !== undefined) {
          (f as any)[field] = resolveDateFilter(f[field]!);
        }
      }
      normalizedArgs.filters = f;
    }

    // Call the queryOmniFocus function
    const result = await queryOmnifocus(normalizedArgs as QueryOmnifocusParams);
    
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
  if (filters.taskName) parts.push(`taskName: "${filters.taskName}"`);
  if (filters.folderId) parts.push(`folderId: "${filters.folderId}"`);
  if (filters.tags) parts.push(`tags: [${filters.tags.join(', ')}]`);
  if (filters.status) parts.push(`status: [${filters.status.join(', ')}]`);
  if (filters.flagged !== undefined) parts.push(`flagged: ${filters.flagged}`);
  if (filters.dueWithin) parts.push(`due within ${filters.dueWithin} days`);
  if (filters.deferredUntil) parts.push(`deferred becoming available within ${filters.deferredUntil} days`);
  if (filters.hasNote !== undefined) parts.push(`has note: ${filters.hasNote}`);
  if (filters.inbox !== undefined) parts.push(`inbox: ${filters.inbox}`);
  if (filters.dueOn !== undefined) parts.push(`due on day +${filters.dueOn}`);
  if (filters.deferOn !== undefined) parts.push(`defer on day +${filters.deferOn}`);
  if (filters.plannedOn !== undefined) parts.push(`planned on day +${filters.plannedOn}`);
  if (filters.addedWithin !== undefined) parts.push(`added within ${filters.addedWithin} days`);
  if (filters.addedOn !== undefined) parts.push(`added on day ${filters.addedOn}`);
  if (filters.isRepeating !== undefined) parts.push(`repeating: ${filters.isRepeating}`);
  if (filters.completedWithin !== undefined) parts.push(`completed within ${filters.completedWithin} days`);
  if (filters.completedOn !== undefined) parts.push(`completed on day ${filters.completedOn}`);
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

    // Repeating
    if (task.isRepeating !== undefined) {
      parts.push(task.isRepeating ? '[repeating]' : '[not repeating]');
    }
    
    // Repetition rule
    if (task.repetitionRule) {
      parts.push(`[rule: ${task.repetitionRule}]`);
    }

    // Hierarchy info
    if (task.parentId) {
      parts.push(`[parent: ${task.parentId}]`);
    }
    if (task.hasChildren && task.childIds?.length > 0) {
      parts.push(`[children: ${task.childIds.join(', ')}]`);
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

    let result = parts.join(' ');

    // Add note on a new line if present
    if (task.note) {
      result += `\n  Note: ${task.note}`;
    }

    return result;
  }).join('\n');
}

function formatProjects(projects: any[]): string {
  return projects.map(project => {
    const status = project.status !== 'Active' ? ` [${project.status}]` : '';
    const folder = project.folderName ? ` 📁 ${project.folderName}` : '';
    const taskCount = project.taskCount !== undefined && project.taskCount !== null ? ` (${project.taskCount} tasks)` : '';
    const flagged = project.flagged ? '🚩 ' : '';
    const due = project.dueDate ? ` [due: ${formatDate(project.dueDate)}]` : '';

    let result = `P: ${flagged}${project.name}${status}${due}${folder}${taskCount}`;

    // Add note on a new line if present
    if (project.note) {
      result += `\n  Note: ${project.note}`;
    }

    return result;
  }).join('\n');
}

function formatFolders(folders: any[]): string {
  return folders.map(folder => {
    const projectCount = folder.projectCount !== undefined ? ` (${folder.projectCount} projects)` : '';
    const path = folder.path ? ` 📍 ${folder.path}` : '';
    
    return `F: ${folder.name}${projectCount}${path}`;
  }).join('\n');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().slice(0, 10);
}

// Exported for testing only - not part of the public API
export const _testExports = {
  formatTasks,
  formatProjects,
  formatFolders,
  formatQueryResults,
  formatFilters,
};
