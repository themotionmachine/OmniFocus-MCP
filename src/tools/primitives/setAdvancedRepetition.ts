import type {
  SetAdvancedRepetitionInput,
  SetAdvancedRepetitionResponse
} from '../../contracts/repetition-tools/set-advanced-repetition.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Configure advanced v4.7+ repetition parameters using the 5-param
 * Task.RepetitionRule constructor with read-then-merge semantics.
 *
 * Version gate: requires OmniFocus 4.7 or later.
 * Read-then-merge: when ruleString is omitted, the existing rule's ruleString
 * is used. When scheduleType, anchorDateKey, or catchUpAutomatically are
 * omitted, existing rule values are preserved.
 *
 * @param params - Input with task or project ID and optional v4.7+ parameters
 * @returns Promise resolving to the updated repetition rule data or error
 */
export async function setAdvancedRepetition(
  params: SetAdvancedRepetitionInput
): Promise<SetAdvancedRepetitionResponse> {
  const script = generateSetAdvancedRepetitionScript(params);
  const result = await executeOmniJS(script);

  if (result === null || result === undefined) {
    return {
      success: false,
      error: 'OmniJS script returned empty output — possible silent failure'
    };
  }

  return result as SetAdvancedRepetitionResponse;
}

/**
 * Generate OmniJS script for the v4.7+ 5-param RepetitionRule constructor
 * with version gate and read-then-merge logic.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSetAdvancedRepetitionScript(params: SetAdvancedRepetitionInput): string {
  const escapedId = escapeForJS(params.id);
  const escapedRuleString = params.ruleString ? escapeForJS(params.ruleString) : null;

  // Map TypeScript enum strings to OmniJS enum constants
  const scheduleTypeExpr = params.scheduleType
    ? `Task.RepetitionScheduleType.${params.scheduleType}`
    : null;
  const anchorDateKeyExpr = params.anchorDateKey
    ? `Task.AnchorDateKey.${params.anchorDateKey}`
    : null;
  const catchUpExpr =
    params.catchUpAutomatically !== undefined ? String(params.catchUpAutomatically) : null;

  const ruleStringJS = escapedRuleString ? `"${escapedRuleString}"` : 'null';
  const scheduleTypeJS = scheduleTypeExpr ?? '(existingRule ? existingRule.scheduleType : null)';
  const anchorDateKeyJS = anchorDateKeyExpr ?? '(existingRule ? existingRule.anchorDateKey : null)';
  const catchUpJS = catchUpExpr ?? '(existingRule ? existingRule.catchUpAutomatically : null)';

  return `(function() {
  try {
    // 1. Version check FIRST
    var userVersion = app.userVersion;
    if (!userVersion.atLeast(new Version('4.7'))) {
      return JSON.stringify({
        success: false,
        error: 'set_advanced_repetition requires OmniFocus 4.7 or later (current: ' + userVersion.versionString + ')'
      });
    }

    // 2. Item resolution: try task then project
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

    // 3. Read existing rule for merge
    var existingRule = task.repetitionRule;

    // 4. Determine ruleString: use provided or fall back to existing
    var ruleString = ${ruleStringJS};
    if (!ruleString) {
      if (!existingRule) {
        return JSON.stringify({
          success: false,
          error: 'No ruleString provided and task has no existing repetition rule to merge with'
        });
      }
      ruleString = existingRule.ruleString;
    }

    // 5. Merge: provided values override existing, fall back to existing or null
    var scheduleType = ${scheduleTypeJS};
    var anchorDateKey = ${anchorDateKeyJS};
    var catchUp = ${catchUpJS};

    // 6. Construct with 5-param v4.7+ constructor
    task.repetitionRule = new Task.RepetitionRule(ruleString, null, scheduleType, anchorDateKey, catchUp);

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
 * Escape a string for safe embedding in a JavaScript string literal.
 */
function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
