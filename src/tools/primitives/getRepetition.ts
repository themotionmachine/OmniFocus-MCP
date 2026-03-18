import type {
  GetRepetitionInput,
  GetRepetitionResponse
} from '../../contracts/repetition-tools/get-repetition.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Get the repetition rule for a task or project.
 *
 * @param params - Input with task or project ID
 * @returns Promise resolving to repetition rule data or error
 */
export async function getRepetition(params: GetRepetitionInput): Promise<GetRepetitionResponse> {
  const script = generateGetRepetitionScript(params);
  const result = await executeOmniJS(script);

  if (!result) {
    return {
      success: false,
      error: 'OmniJS script returned empty output — possible silent failure'
    };
  }

  return result as GetRepetitionResponse;
}

/**
 * Generate OmniJS script to read a task's or project's repetition rule.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateGetRepetitionScript(params: GetRepetitionInput): string {
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

    var rule = task.repetitionRule;
    if (!rule) {
      return JSON.stringify({
        success: true,
        id: task.id.primaryKey,
        name: itemName,
        hasRule: false,
        rule: null
      });
    }

    var isV47 = app.userVersion.atLeast(new Version('4.7'));

    // Extract enum name from OmniJS enum values.
    // OmniJS enums stringify as "EnumType: Value]" (e.g., "RepetitionScheduleType: FromCompletion]").
    // The .name property is undefined for repetition enums, so parse from String().
    function enumName(val) {
      if (!val) return null;
      if (typeof val.name === 'string') return val.name;
      var s = String(val);
      var colon = s.indexOf(': ');
      if (colon >= 0) {
        var after = s.substring(colon + 2);
        var bracket = after.indexOf(']');
        return bracket >= 0 ? after.substring(0, bracket) : after;
      }
      return s;
    }

    var ruleData = {
      ruleString: rule.ruleString,
      isRepeating: true,
      scheduleType: isV47 ? enumName(rule.scheduleType) : null,
      anchorDateKey: isV47 ? enumName(rule.anchorDateKey) : null,
      catchUpAutomatically: isV47 ? (rule.catchUpAutomatically != null ? rule.catchUpAutomatically : null) : null,
      method: enumName(rule.method)
    };

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: itemName,
      hasRule: true,
      rule: ruleData
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
