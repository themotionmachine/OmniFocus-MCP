import type {
  GetNextTaskInput,
  GetNextTaskResponse
} from '../../contracts/status-tools/get-next-task.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Get the next available task in a project.
 *
 * For sequential projects, returns the first unblocked task.
 * For single-actions projects, returns a SINGLE_ACTIONS_PROJECT reason.
 * If no tasks are available, returns NO_AVAILABLE_TASKS.
 *
 * @param params - Input parameters (project id or name)
 * @returns Promise resolving to next task details or reason for no task
 */
export async function getNextTask(params: GetNextTaskInput): Promise<GetNextTaskResponse> {
  const script = generateGetNextTaskScript(params);
  const result = await executeOmniJS(script);
  return result as GetNextTaskResponse;
}

/**
 * Generate OmniJS script to get the next available task in a project.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateGetNextTaskScript(params: GetNextTaskInput): string {
  const { id, name } = params;

  const escapedId = id ? escapeForJS(id) : null;
  const escapedName = name ? escapeForJS(name) : null;

  const lookupBlock = escapedId
    ? `
    // Find by ID (preferred)
    project = Project.byIdentifier("${escapedId}");
    if (!project) {
      return JSON.stringify({
        success: false,
        error: "Project '${escapedId}' not found"
      });
    }
    `
    : `
    // Find by name
    var matchingProjects = flattenedProjects.filter(function(p) {
      return p.name === "${escapedName}";
    });

    if (matchingProjects.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Project '${escapedName}' not found"
      });
    }

    if (matchingProjects.length > 1) {
      return JSON.stringify({
        success: false,
        error: "Multiple projects match name '${escapedName}'",
        code: "DISAMBIGUATION_REQUIRED",
        matchingIds: matchingProjects.map(function(p) { return p.id.primaryKey; })
      });
    }

    project = matchingProjects[0];
    `;

  return `(function() {
  try {
    var project = null;
    ${lookupBlock}

    // Check containsSingletonActions FIRST — single-actions projects have no sequential ordering
    if (project.containsSingletonActions) {
      return JSON.stringify({
        success: true,
        hasNext: false,
        reason: "SINGLE_ACTIONS_PROJECT",
        message: "Single-actions projects do not have a sequential next task."
      });
    }

    var next = project.nextTask;
    if (next === null || next === undefined) {
      return JSON.stringify({
        success: true,
        hasNext: false,
        reason: "NO_AVAILABLE_TASKS",
        message: "No available tasks in this project."
      });
    }

    // Map task status to string
    function mapStatus(t) {
      var ts = t.taskStatus;
      if (ts === Task.Status.Available) return "Available";
      if (ts === Task.Status.Blocked) return "Blocked";
      if (ts === Task.Status.Completed) return "Completed";
      if (ts === Task.Status.Dropped) return "Dropped";
      if (ts === Task.Status.DueSoon) return "DueSoon";
      if (ts === Task.Status.Next) return "Next";
      if (ts === Task.Status.Overdue) return "Overdue";
      return "Blocked";
    }

    return JSON.stringify({
      success: true,
      hasNext: true,
      task: {
        id: next.id.primaryKey,
        name: next.name,
        note: next.note || "",
        flagged: next.flagged,
        taskStatus: mapStatus(next),
        dueDate: next.dueDate ? next.dueDate.toISOString() : null,
        deferDate: next.deferDate ? next.deferDate.toISOString() : null,
        tags: next.tags.map(function(t) {
          return { id: t.id.primaryKey, name: t.name };
        }),
        project: { id: project.id.primaryKey, name: project.name }
      }
    });
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
