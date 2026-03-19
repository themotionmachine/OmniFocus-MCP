import {
  type SetPlannedDateInput,
  type SetPlannedDateResponse,
  SetPlannedDateResponseSchema
} from '../../contracts/task-tools/set-planned-date.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Set or clear the planned date for a task.
 *
 * This operation requires OmniFocus v4.7 or later with database migration.
 *
 * @param params - Input parameters (id or name, and plannedDate)
 * @returns Promise resolving to success or error response
 */
export async function setPlannedDate(params: SetPlannedDateInput): Promise<SetPlannedDateResponse> {
  const script = generateSetPlannedDateScript(params);
  const result = await executeOmniJS(script);
  return SetPlannedDateResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to set or clear a task's planned date.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSetPlannedDateScript(params: SetPlannedDateInput): string {
  const { id, name, plannedDate } = params;

  // Escape strings for safe embedding in JS
  const escapedId = id ? escapeForJS(id) : null;
  const escapedName = name ? escapeForJS(name) : null;
  const escapedPlannedDate = plannedDate ? escapeForJS(plannedDate) : null;

  return `(function() {
  try {
    // Check OmniFocus version using userVersion (app.version is deprecated)
    var userVersion = app.userVersion;
    if (!userVersion.atLeast(new Version('4.7'))) {
      return JSON.stringify({
        success: false,
        error: 'Planned date requires OmniFocus v4.7 or later. Current version: ' + userVersion.versionString
      });
    }

    // Check if plannedDate property exists (migration check)
    var testTask = flattenedTasks.length > 0 ? flattenedTasks[0] : null;
    if (testTask && testTask.plannedDate === undefined) {
      return JSON.stringify({
        success: false,
        error: 'Planned date requires database migration. Please open OmniFocus preferences to migrate.'
      });
    }

    var task;

    // Find task by ID (takes precedence) or name
    ${
      escapedId
        ? `
    // Lookup by ID
    task = Task.byIdentifier("${escapedId}");
    if (!task) {
      return JSON.stringify({
        success: false,
        error: "Task '${escapedId}' not found"
      });
    }
    `
        : `
    // Lookup by name
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
      var ids = matchingTasks.map(function(t) {
        return t.id.primaryKey;
      });
      return JSON.stringify({
        success: false,
        error: "Multiple tasks match name '${escapedName}'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ids
      });
    }

    task = matchingTasks[0];
    `
    }

    // Set or clear the planned date
    ${
      escapedPlannedDate
        ? `
    task.plannedDate = new Date("${escapedPlannedDate}");
    `
        : `
    task.plannedDate = null;
    `
    }

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: task.name
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
