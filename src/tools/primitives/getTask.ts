import type { GetTaskInput, GetTaskResponse } from '../../contracts/task-tools/get-task.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Get a single task by ID or name.
 *
 * @param params - Input parameters for getting a task
 * @returns Promise resolving to task details or error
 */
export async function getTask(params: GetTaskInput): Promise<GetTaskResponse> {
  const script = generateGetTaskScript(params);
  const tempFile = writeSecureTempFile(script, 'get_task', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string) as GetTaskResponse;
  } finally {
    tempFile.cleanup();
  }
}

/**
 * Generate OmniJS script to get a task by ID or name.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateGetTaskScript(params: GetTaskInput): string {
  const { id, name } = params;

  // Escape strings for safe embedding in JS
  const escapedId = id ? escapeForJS(id) : null;
  const escapedName = name ? escapeForJS(name) : null;

  return `(function() {
  try {
    var task = null;

    // ID takes precedence over name
    ${
      escapedId
        ? `
    // Find by ID
    task = Task.byIdentifier("${escapedId}");
    if (!task) {
      return JSON.stringify({
        success: false,
        error: "Task '${escapedId}' not found"
      });
    }
    `
        : escapedName
          ? `
    // Find by name
    var matchingTasks = flattenedTasks.filter(function(t) {
      return t.name === "${escapedName}";
    });

    if (matchingTasks.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Task '${escapedName}' not found"
      });
    }

    if (matchingTasks.length > 1) {
      return JSON.stringify({
        success: false,
        error: "Multiple tasks match name '${escapedName}'",
        code: "DISAMBIGUATION_REQUIRED",
        matchingIds: matchingTasks.map(function(t) { return t.id.primaryKey; })
      });
    }

    task = matchingTasks[0];
    `
          : `
    // Should never happen - contract validation ensures id or name
    return JSON.stringify({
      success: false,
      error: "At least one of id or name is required"
    });
    `
    }

    // Map task status to string
    function mapStatus(task) {
      var ts = task.taskStatus;
      if (ts === Task.Status.Available) return "Available";
      if (ts === Task.Status.Blocked) return "Blocked";
      if (ts === Task.Status.Completed) return "Completed";
      if (ts === Task.Status.Dropped) return "Dropped";
      if (ts === Task.Status.DueSoon) return "DueSoon";
      if (ts === Task.Status.Next) return "Next";
      if (ts === Task.Status.Overdue) return "Overdue";
      return "Blocked"; // Unknown status defaults to Blocked
    }

    // Helper to format date as ISO string
    function toISO(d) {
      return d ? d.toISOString() : null;
    }

    // Build TaskFull object
    var proj = task.containingProject;
    var parentTask = task.parent;

    var result = {
      id: task.id.primaryKey,
      name: task.name,
      note: task.note || "",
      taskStatus: mapStatus(task),
      completed: task.completed,
      flagged: task.flagged,
      effectiveFlagged: task.effectiveFlagged,
      deferDate: toISO(task.deferDate),
      dueDate: toISO(task.dueDate),
      plannedDate: task.plannedDate !== undefined ? toISO(task.plannedDate) : null,
      effectiveDeferDate: toISO(task.effectiveDeferDate),
      effectiveDueDate: toISO(task.effectiveDueDate),
      effectivePlannedDate: task.effectivePlannedDate !== undefined ? toISO(task.effectivePlannedDate) : null,
      completionDate: toISO(task.completionDate),
      dropDate: toISO(task.dropDate),
      added: toISO(task.added),
      modified: toISO(task.modified),
      estimatedMinutes: task.estimatedMinutes !== undefined ? task.estimatedMinutes : null,
      sequential: task.sequential,
      completedByChildren: task.completedByChildren,
      shouldUseFloatingTimeZone: task.shouldUseFloatingTimeZone !== undefined ? task.shouldUseFloatingTimeZone : false,
      hasChildren: task.hasChildren,
      inInbox: task.inInbox,
      containingProject: proj ? { id: proj.id.primaryKey, name: proj.name } : null,
      parent: parentTask ? { id: parentTask.id.primaryKey, name: parentTask.name } : null,
      tags: task.tags.map(function(t) {
        return { id: t.id.primaryKey, name: t.name };
      })
    };

    return JSON.stringify({ success: true, task: result });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}

/**
 * Escape string for safe embedding in JavaScript.
 */
function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
