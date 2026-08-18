import { z } from 'zod';
import { queryOmnifocus, QueryOmnifocusParams } from '../primitives/queryOmnifocus.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { resolveDateFilter } from '../../utils/dateFilter.js';
import { localDatePart } from '../../utils/dateSerialization.js';

// Description budget (#105): these strings load into EVERY session that touches
// the server, so shared grammar is stated once on the filters object and each
// field describe keeps only what an agent can't infer — case-sensitivity,
// exact-vs-partial matching, and cross-field requirements. A test caps the
// total; spend the budget deliberately.
export const schema = z.object({
  entity: z.enum(['tasks', 'projects', 'folders']).describe("What to query"),

  filters: z.object({
    projectId: z.string().optional().describe("Exact project id"),
    projectName: z.string().optional().describe("Project name; case-insensitive partial match. 'inbox' targets the inbox"),
    taskName: z.string().optional().describe("Task name; case-insensitive partial match"),
    folderId: z.string().optional().describe("Folder id, including subfolders; tasks match via their containing project"),
    folderName: z.string().optional().describe("Folder name; case-insensitive partial match, may match several folders, each including subfolders. folderId takes precedence"),
    tags: z.array(z.string()).optional().describe("Tag names; exact match, case-sensitive"),
    status: z.array(z.string()).optional().describe("Tasks: Next, Available, Blocked, DueSoon, Overdue, Completed, Dropped. Projects: Active, OnHold, Done, Dropped"),
    flagged: z.boolean().optional().describe("true = flagged only, false = unflagged only"),
    dueWithin: z.union([z.number(), z.string()]).optional().describe("Due between today and the given day/range"),
    deferredUntil: z.union([z.number(), z.string()]).optional().describe("Currently deferred, becoming available by the given day"),
    plannedWithin: z.union([z.number(), z.string()]).optional().describe("Planned between today and the given day/range"),
    hasNote: z.boolean().optional().describe("true = has a non-empty note"),
    inbox: z.boolean().optional().describe("true = inbox tasks only, false = project tasks only"),
    dueOn: z.union([z.number(), z.string()]).optional().describe("Due on exactly that day"),
    deferOn: z.union([z.number(), z.string()]).optional().describe("Defer date exactly that day"),
    plannedOn: z.union([z.number(), z.string()]).optional().describe("Planned date exactly that day"),
    addedWithin: z.number().optional().describe("Added in the last N days"),
    addedOn: z.number().optional().describe("Added on day N (0 = today, -1 = yesterday)"),
    isRepeating: z.boolean().optional().describe("true = repeating tasks only"),
    completedWithin: z.number().optional().describe("Completed in the last N days (dropped items need droppedWithin). Requires includeCompleted: true"),
    completedOn: z.number().optional().describe("Completed on day N (0 = today, -1 = yesterday). Requires includeCompleted: true"),
    droppedWithin: z.number().optional().describe("Dropped in the last N days. Requires includeCompleted: true"),
    droppedOn: z.number().optional().describe("Dropped on day N (0 = today, -1 = yesterday). Requires includeCompleted: true"),
    reviewDue: z.boolean().optional().describe("true = projects due for review (projects only)")
  }).optional().describe("Filters AND together; array filters (tags, status) OR within the array. Date-valued filters (dueWithin, deferredUntil, plannedWithin, dueOn, deferOn, plannedOn) accept a number of days from today, 'today', 'tomorrow', 'this week', 'next week', or 'YYYY-MM-DD'"),

  fields: z.array(z.string()).optional().describe("Only return the listed fields (smaller responses). Tasks: id, name, note, flagged, taskStatus, dueDate, deferDate, plannedDate, effectiveDueDate, effectiveDeferDate, effectivePlannedDate, completionDate, dropDate, effectiveDropDate, estimatedMinutes, tagNames, tags, projectName, projectId, parentId, childIds, hasChildren, sequential, completedByChildren, inInbox, isRepeating, repetitionRule (ICS, e.g. FREQ=WEEKLY;INTERVAL=2), repetitionMethod (Fixed | DeferUntilDate | DueDate), modificationDate, creationDate. Projects: id, name, status, note, folderName, folderID, sequential, dueDate, deferDate, effectiveDueDate, effectiveDeferDate, completionDate, dropDate, effectiveDropDate, completedByChildren, containsSingletonActions, taskCount, tasks, nextReviewDate, reviewInterval, modificationDate, creationDate. Folders: id, name, path, parentFolderID, status, projectCount, projects, subfolders"),

  limit: z.number().optional().describe("Max items to return"),

  sortBy: z.string().optional().describe("name, dueDate, deferDate, modificationDate, creationDate, estimatedMinutes, or taskStatus"),

  sortOrder: z.enum(['asc', 'desc']).optional().describe("Default: asc"),

  includeCompleted: z.boolean().optional().describe("Include completed/dropped items (default: false)"),

  summary: z.boolean().optional().describe("Return only the match count")
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
        let output = formatQueryResults(items, args.entity);
        
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

// Helper function to format query results in a compact way.
//
// Deliberately spare (#106): the caller is an agent that still has its own
// arguments in context, so restating them ("Filters applied: …", a markdown
// header) was measured at ~15% overhead on typical results and carried no
// information. The count line stays — it's the one thing the items themselves
// don't say.
function formatQueryResults(items: any[], entity: string): string {
  if (items.length === 0) {
    return `No ${entity} found matching the specified criteria.`;
  }

  let output = `${items.length} ${entity}:\n`;

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
    
    // Repetition rule. Before #115 this rendered the literal string
    // "[object Task.RepetitionRule]"; it now carries the ICS rule, and the
    // method rides alongside it because "every 2 weeks" means something
    // different depending on whether it counts from the calendar or from
    // completion.
    if (task.repetitionRule) {
      const method = task.repetitionMethod ? ` ${task.repetitionMethod}` : '';
      parts.push(`[rule: ${task.repetitionRule}${method}]`);
    } else if (task.repetitionMethod) {
      parts.push(`[rule method: ${task.repetitionMethod}]`);
    }

    // Hierarchy info
    if (task.parentId) {
      parts.push(`[parent: ${task.parentId}]`);
    }
    if (task.hasChildren && task.childIds?.length > 0) {
      parts.push(`[children: ${task.childIds.join(', ')}]`);
    }

    // Sequencing only matters for action groups (tasks with children).
    if (task.sequential !== undefined && task.hasChildren) {
      parts.push(task.sequential ? '[sequential]' : '[parallel]');
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
    if (task.dropDate) {
      parts.push(`[dropped: ${formatDate(task.dropDate)}]`);
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
    // The truthiness guard matters (#106): when the caller's `fields` selection
    // omits status, `undefined !== 'Active'` used to render a literal
    // "[undefined]" on every row — 49 times in one live 49-project query.
    const status = project.status && project.status !== 'Active' ? ` [${project.status}]` : '';
    const folder = project.folderName ? ` 📁 ${project.folderName}` : '';
    const taskCount = project.taskCount !== undefined && project.taskCount !== null ? ` (${project.taskCount} tasks)` : '';
    const flagged = project.flagged ? '🚩 ' : '';
    const due = project.dueDate ? ` [due: ${formatDate(project.dueDate)}]` : '';
    const review = project.nextReviewDate ? ` [review: ${formatDate(project.nextReviewDate)}]` : '';
    const reviewInterval = project.reviewInterval ? ` [review every: ${project.reviewInterval}]` : '';
    const sequencing = project.sequential !== undefined
      ? (project.sequential ? ' [sequential]' : ' [parallel]')
      : '';

    const id = project.id ? ` [${project.id}]` : '';
    const tags = project.tagNames?.length > 0 ? ` <${project.tagNames.join(',')}>` : '';

    let result = `P: ${flagged}${project.name}${id}${status}${due}${review}${reviewInterval}${sequencing}${folder}${taskCount}${tags}`;

    // Add note on a new line if present
    if (project.note) {
      result += `\n  Note: ${project.note}`;
    }

    return result;
  }).join('\n');
}

function formatFolders(folders: any[]): string {
  return folders.map(folder => {
    const id = folder.id ? ` [${folder.id}]` : '';
    const projectCount = folder.projectCount !== undefined ? ` (${folder.projectCount} projects)` : '';
    // Only render the path once it says something the name doesn't. A top-level
    // folder's path is just its own name, and "📍 Health" beside "F: Health"
    // reads like a confirmed location when it is only an echo — which is part of
    // how the flat-path bug (#95) stayed invisible.
    const path = folder.path && folder.path !== folder.name ? ` 📍 ${folder.path}` : '';
    // Fields formatFolders used to drop on the floor: requesting parentFolderID
    // and seeing nothing rendered is indistinguishable from requesting it and
    // getting null back (#95).
    const parentFolderID = folder.parentFolderID ? ` ⬆️ ${folder.parentFolderID}` : '';
    const subfolders = folder.subfolders?.length ? ` 📁 ${folder.subfolders.length} subfolders` : '';

    return `F: ${folder.name}${id}${projectCount}${path}${parentFolderID}${subfolders}`;
  }).join('\n');
}

function formatDate(dateStr: string): string {
  // Delegates to localDatePart rather than `new Date(x).toISOString().slice(0,10)`:
  // that round-trip re-introduced the off-by-one day for UTC-ahead users even after
  // the query layer started emitting correct local dates (#91).
  return localDatePart(dateStr);
}

// Exported for testing only - not part of the public API
export const _testExports = {
  formatTasks,
  formatProjects,
  formatFolders,
  formatQueryResults,
};
