import {
  type SetFloatingTimezoneInput,
  type SetFloatingTimezoneResponse,
  SetFloatingTimezoneResponseSchema
} from '../../contracts/status-tools/set-floating-timezone.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Enable or disable floating timezone for a task or project.
 *
 * When floating timezone is enabled, dates follow the device timezone
 * when traveling instead of being fixed to a specific timezone.
 *
 * @param params - Input parameters (id or name, and enabled boolean)
 * @returns Promise resolving to success or error response
 */
export async function setFloatingTimezone(
  params: SetFloatingTimezoneInput
): Promise<SetFloatingTimezoneResponse> {
  const script = generateSetFloatingTimezoneScript(params);
  const result = await executeOmniJS(script);
  return SetFloatingTimezoneResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to set or clear floating timezone on a task or project.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSetFloatingTimezoneScript(params: SetFloatingTimezoneInput): string {
  const { id, name, enabled } = params;

  const escapedId = id ? escapeForJS(id) : null;
  const escapedName = name ? escapeForJS(name) : null;
  const enabledValue = enabled ? 'true' : 'false';

  return `(function() {
  try {
    var item = null;
    var isProject = false;

    ${
      escapedId
        ? `
    // Lookup by ID — try task first, then project
    item = Task.byIdentifier("${escapedId}");
    if (!item) {
      item = Project.byIdentifier("${escapedId}");
      if (item) {
        isProject = true;
      }
    }
    if (!item) {
      return JSON.stringify({
        success: false,
        error: "Item '${escapedId}' not found"
      });
    }
    `
        : `
    // Lookup by name — search tasks then projects
    var matchingTasks = flattenedTasks.filter(function(t) {
      return t.name === "${escapedName}";
    });
    var matchingProjects = flattenedProjects.filter(function(p) {
      return p.name === "${escapedName}";
    });
    var allMatches = matchingTasks.concat(matchingProjects.map(function(p) { return p.task; }));
    var allIds = matchingTasks.map(function(t) { return t.id.primaryKey; })
      .concat(matchingProjects.map(function(p) { return p.id.primaryKey; }));

    if (allIds.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Item '${escapedName}' not found"
      });
    }

    if (allIds.length > 1) {
      return JSON.stringify({
        success: false,
        error: "Multiple items match '${escapedName}'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: allIds
      });
    }

    if (matchingTasks.length === 1) {
      item = matchingTasks[0];
      isProject = false;
    } else {
      item = matchingProjects[0];
      isProject = true;
    }
    `
    }

    // Set floating timezone
    item.shouldUseFloatingTimeZone = ${enabledValue};

    return JSON.stringify({
      success: true,
      id: item.id.primaryKey,
      name: item.name,
      itemType: isProject ? 'project' : 'task',
      floatingTimezone: ${enabledValue}
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
