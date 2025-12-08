import { z } from 'zod';
import { dumpDatabase } from '../dumpDatabase.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

export const schema = z.object({
  hideCompleted: z.boolean().optional().describe("Set to false to show completed and dropped tasks (default: true)"),
  hideRecurringDuplicates: z.boolean().optional().describe("Set to true to hide duplicate instances of recurring tasks (default: true)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    // Get raw database
    const database = await dumpDatabase();

    // Format as compact report
    const formattedReport = formatCompactReport(database, {
      hideCompleted: args.hideCompleted !== false, // Default to true
      hideRecurringDuplicates: args.hideRecurringDuplicates !== false // Default to true
    });

    return {
      content: [{
        type: "text" as const,
        text: formattedReport
      }]
    };
  } catch (err: unknown) {
    return {
      content: [{
        type: "text" as const,
        text: `Error generating report. Please ensure OmniFocus is running and try again.`
      }],
      isError: true
    };
  }
}

// Function to format date in compact format (M/D)
function formatCompactDate(isoDate: string | null): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Function to format the database in the compact report format
function formatCompactReport(database: any, options: { hideCompleted: boolean, hideRecurringDuplicates: boolean }): string {
  const { hideCompleted, hideRecurringDuplicates } = options;

  // Get current date for the header
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  let output = `# OMNIFOCUS [${dateStr}]\n\n`;

  // Add legend
  output += `FORMAT LEGEND:
F: Folder | P: Project | •: Task | 🚩: Flagged
Dates: [M/D] | Duration: (30m) or (2h) | Tags: <tag1,tag2>
Status: #next #avail #block #due #over #compl #drop\n\n`;

  // Map of folder IDs to folder objects for quick lookup
  const folderMap = new Map();
  Object.values(database.folders).forEach((folder: any) => {
    folderMap.set(folder.id, folder);
  });

  // Get all tag names to compute minimum unique prefixes
  const allTagNames = Object.values(database.tags).map((tag: any) => tag.name);
  const tagPrefixMap = computeMinimumUniquePrefixes(allTagNames);

  // Function to get folder hierarchy path
  function getFolderPath(folderId: string): string[] {
    const path = [];
    let currentId = folderId;

    while (currentId) {
      const folder = folderMap.get(currentId);
      if (!folder) break;

      path.unshift(folder.name);
      currentId = folder.parentFolderID;
    }

    return path;
  }

  // Get root folders (no parent)
  const rootFolders = Object.values(database.folders).filter((folder: any) => !folder.parentFolderID);

  // Process folders recursively
  function processFolder(folder: any, level: number): string {
    const indent = '   '.repeat(level);
    let folderOutput = `${indent}F: ${folder.name}\n`;

    // Process subfolders
    if (folder.subfolders && folder.subfolders.length > 0) {
      for (const subfolderId of folder.subfolders) {
        const subfolder = database.folders[subfolderId];
        if (subfolder) {
          folderOutput += `${processFolder(subfolder, level + 1)}`;
        }
      }
    }

    // Process projects in this folder
    if (folder.projects && folder.projects.length > 0) {
      for (const projectId of folder.projects) {
        const project = database.projects[projectId];
        if (project) {
          folderOutput += processProject(project, level + 1);
        }
      }
    }

    return folderOutput;
  }

  // Process a project
  function processProject(project: any, level: number): string {
    const indent = '   '.repeat(level);

    // Skip if it's completed or dropped and we're hiding completed items
    if (hideCompleted && (project.status === 'Done' || project.status === 'Dropped')) {
      return '';
    }

    // Format project status info
    let statusInfo = '';
    if (project.status === 'OnHold') {
      statusInfo = ' [OnHold]';
    } else if (project.status === 'Dropped') {
      statusInfo = ' [Dropped]';
    }

    // Add due date if present
    if (project.dueDate) {
      const dueDateStr = formatCompactDate(project.dueDate);
      statusInfo += statusInfo ? ` [DUE:${dueDateStr}]` : ` [DUE:${dueDateStr}]`;
    }

    // Add flag if present
    const flaggedSymbol = project.flagged ? ' 🚩' : '';

    let projectOutput = `${indent}P: ${project.name}${flaggedSymbol}${statusInfo}\n`;

    // Process tasks in this project
    const projectTasks = database.tasks.filter((task: any) =>
      task.projectId === project.id && !task.parentId
    );

    if (projectTasks.length > 0) {
      for (const task of projectTasks) {
        projectOutput += processTask(task, level + 1);
      }
    }

    return projectOutput;
  }

  // Process a task
  function processTask(task: any, level: number): string {
    const indent = '   '.repeat(level);

    // Skip if it's completed or dropped and we're hiding completed items
    if (hideCompleted && (task.completed || task.taskStatus === 'Completed' || task.taskStatus === 'Dropped')) {
      return '';
    }

    // Flag symbol
    const flagSymbol = task.flagged ? '🚩 ' : '';

    // Format dates
    let dateInfo = '';
    if (task.dueDate) {
      const dueDateStr = formatCompactDate(task.dueDate);
      dateInfo += ` [DUE:${dueDateStr}]`;
    }
    if (task.deferDate) {
      const deferDateStr = formatCompactDate(task.deferDate);
      dateInfo += ` [defer:${deferDateStr}]`;
    }

    // Format duration
    let durationStr = '';
    if (task.estimatedMinutes) {
      // Convert to hours if >= 60 minutes
      if (task.estimatedMinutes >= 60) {
        const hours = Math.floor(task.estimatedMinutes / 60);
        durationStr = ` (${hours}h)`;
      } else {
        durationStr = ` (${task.estimatedMinutes}m)`;
      }
    }

    // Format tags
    let tagsStr = '';
    if (task.tagNames && task.tagNames.length > 0) {
      // Use minimum unique prefixes for tag names
      const abbreviatedTags = task.tagNames.map((tag: string) => {
        return tagPrefixMap.get(tag) || tag;
      });

      tagsStr = ` <${abbreviatedTags.join(',')}>`;
    }

    // Format status
    let statusStr = '';
    switch (task.taskStatus) {
      case 'Next':
        statusStr = ' #next';
        break;
      case 'Available':
        statusStr = ' #avail';
        break;
      case 'Blocked':
        statusStr = ' #block';
        break;
      case 'DueSoon':
        statusStr = ' #due';
        break;
      case 'Overdue':
        statusStr = ' #over';
        break;
      case 'Completed':
        statusStr = ' #compl';
        break;
      case 'Dropped':
        statusStr = ' #drop';
        break;
    }

    let taskOutput = `${indent}• ${flagSymbol}${task.name}${dateInfo}${durationStr}${tagsStr}${statusStr}\n`;

    // Process subtasks
    if (task.childIds && task.childIds.length > 0) {
      const childTasks = database.tasks.filter((t: any) => task.childIds.includes(t.id));

      for (const childTask of childTasks) {
        taskOutput += processTask(childTask, level + 1);
      }
    }

    return taskOutput;
  }

  // Process all root folders
  for (const folder of rootFolders) {
    output += processFolder(folder, 0);
  }

  // Process projects not in any folder (if any)
  const rootProjects = Object.values(database.projects).filter((project: any) => !project.folderID);

  for (const project of rootProjects) {
    output += processProject(project, 0);
  }

  // Process tasks in the Inbox (not in any project)
  const inboxTasks = database.tasks.filter(function (task: any) {
    return !task.projectId;
  });

  if (inboxTasks.length > 0) {
    output += `\nP: Inbox\n`;
    for (const task of inboxTasks) {
      output += processTask(task, 0);
    }
  }

  return output;
}

// Compute minimum unique prefixes for all tags (minimum 3 characters)
function computeMinimumUniquePrefixes(tagNames: string[]): Map<string, string> {
  const prefixMap = new Map<string, string>();

  // For each tag name
  for (const tagName of tagNames) {
    // Start with minimum length of 3
    let prefixLength = 3;
    let isUnique = false;

    // Keep increasing prefix length until we find a unique prefix
    while (!isUnique && prefixLength <= tagName.length) {
      const prefix = tagName.substring(0, prefixLength);

      // Check if this prefix uniquely identifies the tag
      isUnique = tagNames.every(otherTag => {
        // If it's the same tag, skip comparison
        if (otherTag === tagName) return true;

        // If the other tag starts with the same prefix, it's not unique
        return !otherTag.startsWith(prefix);
      });

      if (isUnique) {
        prefixMap.set(tagName, prefix);
      } else {
        prefixLength++;
      }
    }

    // If we couldn't find a unique prefix, use the full tag name
    if (!isUnique) {
      prefixMap.set(tagName, tagName);
    }
  }

  return prefixMap;
}