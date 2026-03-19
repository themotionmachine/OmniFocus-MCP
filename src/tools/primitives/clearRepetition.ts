import {
  type ClearRepetitionInput,
  type ClearRepetitionResponse,
  ClearRepetitionResponseSchema
} from '../../contracts/repetition-tools/clear-repetition.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Clear the repetition rule from a task or project, making it non-recurring.
 *
 * @param params - Input with task or project ID
 * @returns Promise resolving to success (with id/name) or error
 */
export async function clearRepetition(
  params: ClearRepetitionInput
): Promise<ClearRepetitionResponse> {
  const script = generateClearRepetitionScript(params);
  const result = await executeOmniJS(script);

  if (!result) {
    return {
      success: false,
      error: 'OmniJS script returned empty output — possible silent failure'
    };
  }

  return ClearRepetitionResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to remove a task's or project's repetition rule.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateClearRepetitionScript(params: ClearRepetitionInput): string {
  const escapedId = escapeForJS(params.id);

  return `(function() {
  try {
    var task = null;
    var itemName = '';

    task = Task.byIdentifier("${escapedId}");
    if (task) {
      itemName = task.name;
    } else {
      var project = Project.byIdentifier("${escapedId}");
      if (project) {
        task = project.task;
        itemName = project.name;
        if (!task) {
          return JSON.stringify({
            success: false,
            error: "Project '${escapedId}' has no root task — data integrity issue"
          });
        }
      }
    }

    if (!task) {
      return JSON.stringify({
        success: false,
        error: "Item '${escapedId}' not found as task or project"
      });
    }

    task.repetitionRule = null;

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: itemName
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
