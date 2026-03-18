import type {
  SetCommonRepetitionInput,
  SetCommonRepetitionResponse
} from '../../contracts/repetition-tools/set-common-repetition.js';
import type { PresetName } from '../../contracts/repetition-tools/shared/repetition-enums.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Set a common repetition preset on a task or project.
 *
 * @param params - Input with task/project ID, preset name, and optional modifiers
 * @returns Promise resolving to the applied rule data or an error
 */
export async function setCommonRepetition(
  params: SetCommonRepetitionInput
): Promise<SetCommonRepetitionResponse> {
  const icsString = presetToICS(params.preset, params.days, params.dayOfMonth);
  const script = generateSetCommonRepetitionScript(params.id, icsString);
  const result = await executeOmniJS(script);

  if (!result) {
    return {
      success: false,
      error: 'OmniJS script returned empty output — possible silent failure'
    };
  }

  return result as SetCommonRepetitionResponse;
}

/**
 * Convert a named preset to an ICS RRULE string (server-side TypeScript).
 *
 * - `days` is used only for weekly and biweekly presets; silently ignored otherwise.
 * - `dayOfMonth` is used only for monthly and quarterly presets; silently ignored otherwise.
 */
function presetToICS(preset: PresetName, days?: string[], dayOfMonth?: number): string {
  switch (preset) {
    case 'daily':
      return 'FREQ=DAILY';
    case 'weekdays':
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    case 'weekly': {
      const base = 'FREQ=WEEKLY';
      return days?.length ? `${base};BYDAY=${days.join(',')}` : base;
    }
    case 'biweekly': {
      const base = 'FREQ=WEEKLY;INTERVAL=2';
      return days?.length ? `${base};BYDAY=${days.join(',')}` : base;
    }
    case 'monthly': {
      const base = 'FREQ=MONTHLY';
      return dayOfMonth ? `${base};BYMONTHDAY=${dayOfMonth}` : base;
    }
    case 'monthly_last_day':
      return 'FREQ=MONTHLY;BYMONTHDAY=-1';
    case 'quarterly': {
      const base = 'FREQ=MONTHLY;INTERVAL=3';
      return dayOfMonth ? `${base};BYMONTHDAY=${dayOfMonth}` : base;
    }
    case 'yearly':
      return 'FREQ=YEARLY';
    default:
      throw new Error(`Unknown preset: ${preset as string}`);
  }
}

/**
 * Generate OmniJS script to apply an ICS RRULE to a task or project.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSetCommonRepetitionScript(id: string, icsString: string): string {
  const escapedId = escapeForJS(id);
  const escapedICS = escapeForJS(icsString);

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

    task.repetitionRule = new Task.RepetitionRule("${escapedICS}", null);

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
