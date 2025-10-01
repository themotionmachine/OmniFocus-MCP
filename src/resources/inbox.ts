import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';

/**
 * Generate the inbox resource showing all inbox tasks
 */
export async function getInboxResource(): Promise<string> {
  try {
    // Get inbox tasks
    const result = await queryOmnifocus({
      entity: 'tasks',
      filters: { projectName: 'inbox' },
      limit: 100
    });

    let output = '📥 Inbox\n\n';

    if (!result.items || result.items.length === 0) {
      output += 'No tasks in inbox.\n';
      return output;
    }

    output += `Tasks (${result.items.length}):\n\n`;

    for (const task of result.items) {
      const flag = task.flagged ? '🚩 ' : '';
      const status = task.taskStatus && task.taskStatus !== 'Available' ? ` [${task.taskStatus}]` : '';
      const due = task.dueDate ? ` (due: ${new Date(task.dueDate).toLocaleDateString()})` : '';
      const defer = task.deferDate ? ` (defer: ${new Date(task.deferDate).toLocaleDateString()})` : '';
      const tags = task.tagNames && task.tagNames.length > 0 ? ` <${task.tagNames.join(', ')}>` : '';

      output += `  • ${flag}${task.name}${status}${due}${defer}${tags}\n`;
      output += `    └─ omnifocus://task/${task.id}\n`;
    }

    return output;

  } catch (error) {
    return `❌ Error loading inbox: ${error}`;
  }
}
