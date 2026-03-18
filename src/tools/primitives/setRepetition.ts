import type {
  SetRepetitionInput,
  SetRepetitionResponse
} from '../../contracts/repetition-tools/set-repetition.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Set the repetition rule for a task or project using an ICS recurrence string.
 *
 * @param params - Input with task or project ID and ICS rule string
 * @returns Promise resolving to the updated repetition rule data or error
 */
export async function setRepetition(params: SetRepetitionInput): Promise<SetRepetitionResponse> {
  const script = generateSetRepetitionScript(params);
  const result = await executeOmniJS(script);

  if (!result) {
    return {
      success: false,
      error: 'OmniJS script returned empty output — possible silent failure'
    };
  }

  return result as SetRepetitionResponse;
}

/**
 * Generate OmniJS script to set a task's or project's repetition rule.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSetRepetitionScript(params: SetRepetitionInput): string {
  const escapedId = escapeForJS(params.id);
  const escapedRuleString = escapeForJS(params.ruleString);

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

    task.repetitionRule = new Task.RepetitionRule("${escapedRuleString}", null);

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: itemName,
      ruleString: task.repetitionRule.ruleString
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
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
