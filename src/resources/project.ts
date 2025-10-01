import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';

/**
 * Generate a project resource showing its tasks and context
 */
export async function getProjectResource(projectId: string): Promise<string> {
  try {
    // Get project details
    const projectsResult = await queryOmnifocus({
      entity: 'projects',
      limit: 1000
    });

    const project = projectsResult.items?.find(p => p.id === projectId);

    if (!project) {
      return `❌ Project not found: ${projectId}`;
    }

    let output = `📋 ${project.name}\n\n`;

    // Build path with folder hierarchy
    if (project.folderName) {
      // Get folder to build full path
      const foldersResult = await queryOmnifocus({
        entity: 'folders',
        limit: 1000
      });

      const folder = foldersResult.items?.find(f => f.id === project.folderId);

      if (folder) {
        const pathParts = [folder.name];
        let currentId = folder.parentFolderId;

        // Walk up the hierarchy
        while (currentId) {
          const parent = foldersResult.items?.find(f => f.id === currentId);
          if (!parent) break;
          pathParts.unshift(parent.name);
          currentId = parent.parentFolderId;
        }

        pathParts.push(project.name);
        output += `Path: ${pathParts.join(' → ')}\n`;
        output += `Folder: ${folder.name} (omnifocus://folder/${folder.id})\n`;
      } else {
        output += `Folder: ${project.folderName}\n`;
      }
    } else {
      output += `Path: Root → ${project.name}\n`;
    }

    // Project metadata
    output += `Status: ${project.status || 'Active'}`;
    if (project.dueDate) {
      output += ` | Due: ${new Date(project.dueDate).toLocaleDateString()}`;
    }
    if (project.deferDate) {
      output += ` | Defer: ${new Date(project.deferDate).toLocaleDateString()}`;
    }
    output += '\n';

    if (project.flagged) {
      output += '🚩 Flagged\n';
    }

    if (project.nextReviewDate) {
      output += `Next Review: ${new Date(project.nextReviewDate).toLocaleDateString()}\n`;
    }

    output += '\n';

    // Get tasks in project
    const tasksResult = await queryOmnifocus({
      entity: 'tasks',
      filters: { projectId: projectId },
      limit: 1000
    });

    const tasks = tasksResult.items || [];

    if (tasks.length > 0) {
      // Count by status
      const completed = tasks.filter(t => t.taskStatus === 'Completed').length;
      const flagged = tasks.filter(t => t.flagged).length;

      output += `☑ Tasks (${tasks.length}`;
      if (completed > 0) {
        output += `, ${completed} completed`;
      }
      if (flagged > 0) {
        output += `, ${flagged} flagged`;
      }
      output += '):\n\n';

      // Group tasks by parent (to show hierarchy)
      const topLevelTasks = tasks.filter(t => !t.parentId);
      const subtasksByParent = new Map<string, typeof tasks>();

      for (const task of tasks) {
        if (task.parentId) {
          if (!subtasksByParent.has(task.parentId)) {
            subtasksByParent.set(task.parentId, []);
          }
          subtasksByParent.get(task.parentId)!.push(task);
        }
      }

      // Display tasks with hierarchy
      for (const task of topLevelTasks) {
        output += formatTask(task, 0, subtasksByParent);
      }
    } else {
      output += `☑ Tasks: (none)\n`;
    }

    return output;

  } catch (error) {
    return `❌ Error loading project: ${error}`;
  }
}

function formatTask(task: any, indent: number, subtasksMap: Map<string, any[]>): string {
  const prefix = '  '.repeat(indent);
  const flag = task.flagged ? '🚩 ' : '';
  const status = task.taskStatus === 'Completed' ? '✓ ' : '';
  const due = task.dueDate ? ` (due: ${new Date(task.dueDate).toLocaleDateString()})` : '';
  const defer = task.deferDate ? ` (defer: ${new Date(task.deferDate).toLocaleDateString()})` : '';

  let output = `${prefix}  • ${flag}${status}${task.name}${due}${defer}\n`;
  output += `${prefix}    └─ omnifocus://task/${task.id}\n`;

  // Show subtasks
  const subtasks = subtasksMap.get(task.id) || [];
  for (const subtask of subtasks) {
    output += formatTask(subtask, indent + 1, subtasksMap);
  }

  return output;
}
