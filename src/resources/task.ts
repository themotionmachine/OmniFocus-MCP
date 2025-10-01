import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';

/**
 * Generate a task resource showing its details, subtasks, and context
 */
export async function getTaskResource(taskId: string): Promise<string> {
  try {
    // Get all tasks to find this one and its context
    const tasksResult = await queryOmnifocus({
      entity: 'tasks',
      limit: 10000 // Need large limit to find specific task
    });

    const task = tasksResult.items?.find(t => t.id === taskId);

    if (!task) {
      return `❌ Task not found: ${taskId}`;
    }

    const flag = task.flagged ? '🚩 ' : '';
    const status = task.taskStatus === 'Completed' ? '✓ ' : '';

    let output = `☑ ${flag}${status}${task.name}\n\n`;

    // Build context path
    if (task.projectName) {
      // Get project and folder info
      const projectsResult = await queryOmnifocus({
        entity: 'projects',
        limit: 1000
      });

      const project = projectsResult.items?.find(p => p.id === task.projectId);

      if (project && project.folderName) {
        const foldersResult = await queryOmnifocus({
          entity: 'folders',
          limit: 1000
        });

        const folder = foldersResult.items?.find(f => f.id === project.folderId);

        if (folder) {
          const pathParts = [folder.name];
          let currentId = folder.parentFolderId;

          // Walk up folder hierarchy
          while (currentId) {
            const parent = foldersResult.items?.find(f => f.id === currentId);
            if (!parent) break;
            pathParts.unshift(parent.name);
            currentId = parent.parentFolderId;
          }

          pathParts.push(project.name);
          pathParts.push(task.name);
          output += `Path: ${pathParts.join(' → ')}\n`;
        }
      } else {
        output += `Path: ${task.projectName} → ${task.name}\n`;
      }

      output += `Project: ${task.projectName}`;
      if (task.projectId) {
        output += ` (omnifocus://project/${task.projectId})`;
      }
      output += '\n';
    } else {
      output += `Location: Inbox (omnifocus://inbox)\n`;
    }

    // Parent task (if this is a subtask)
    if (task.parentId) {
      const parentTask = tasksResult.items?.find(t => t.id === task.parentId);
      if (parentTask) {
        output += `Parent Task: ${parentTask.name} (omnifocus://task/${task.parentId})\n`;
      }
    }

    output += '\n';

    // Task metadata
    output += `Status: ${task.taskStatus || 'Available'}\n`;

    if (task.dueDate) {
      output += `Due: ${new Date(task.dueDate).toLocaleDateString()}\n`;
    }

    if (task.deferDate) {
      output += `Defer: ${new Date(task.deferDate).toLocaleDateString()}\n`;
    }

    if (task.plannedDate) {
      output += `Planned: ${new Date(task.plannedDate).toLocaleDateString()}\n`;
    }

    if (task.estimatedMinutes) {
      const hours = Math.floor(task.estimatedMinutes / 60);
      const mins = task.estimatedMinutes % 60;
      if (hours > 0) {
        output += `Estimated: ${hours}h ${mins}m\n`;
      } else {
        output += `Estimated: ${mins}m\n`;
      }
    }

    if (task.tagNames && task.tagNames.length > 0) {
      output += `Tags: ${task.tagNames.join(', ')}\n`;
    }

    if (task.note && task.note.trim()) {
      output += `\nNote:\n${task.note.trim()}\n`;
    }

    // Find subtasks
    const subtasks = tasksResult.items?.filter(t => t.parentId === taskId) || [];

    if (subtasks.length > 0) {
      output += `\n☑ Subtasks (${subtasks.length}):\n`;
      for (const subtask of subtasks) {
        const subflag = subtask.flagged ? '🚩 ' : '';
        const substatus = subtask.taskStatus === 'Completed' ? '✓ ' : '';
        const subdue = subtask.dueDate ? ` (due: ${new Date(subtask.dueDate).toLocaleDateString()})` : '';

        output += `  • ${subflag}${substatus}${subtask.name}${subdue}\n`;
        output += `    └─ omnifocus://task/${subtask.id}\n`;
      }
    }

    return output;

  } catch (error) {
    return `❌ Error loading task: ${error}`;
  }
}
