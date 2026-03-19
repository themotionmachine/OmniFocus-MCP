import type {
  SelectForecastDaysInput,
  SelectForecastDaysResponse
} from '../../contracts/forecast-tools/select-forecast-days.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Navigate the Forecast perspective to specific dates.
 *
 * @param params - Input parameters with dates array
 * @returns Promise resolving to selection result or error
 */
export async function selectForecastDays(
  params: SelectForecastDaysInput
): Promise<SelectForecastDaysResponse> {
  const { dates } = params;

  // Validate each date
  const validatedDates: string[] = [];
  for (const dateStr of dates) {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      return {
        success: false,
        error: `Invalid date: "${dateStr}" is not a valid date`,
        code: 'INVALID_DATE'
      };
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    validatedDates.push(`${year}-${month}-${day}`);
  }

  const script = generateSelectForecastDaysScript(validatedDates);
  const result = await executeOmniJS(script);

  if (!result) {
    return {
      success: false,
      error: 'No response from OmniFocus script execution',
      code: 'PERSPECTIVE_SWITCH_FAILED'
    };
  }

  return result as SelectForecastDaysResponse;
}

/**
 * Generate OmniJS script to navigate Forecast perspective to specific dates.
 * Exported for testing and manual verification in OmniFocus Script Editor.
 */
export function generateSelectForecastDaysScript(dateStrings: string[]): string {
  const dateArrayStr = dateStrings.map((d) => `"${d}"`).join(', ');

  return `(function() {
  try {
    var win = document.windows[0];
    if (!win) {
      return JSON.stringify({ success: false, error: 'No OmniFocus window is open', code: 'NO_WINDOW' });
    }
    win.perspective = Perspective.BuiltIn.Forecast;

    var dateStrings = [${dateArrayStr}];
    var fdays = [];
    var selectedDates = [];
    dateStrings.forEach(function(dateStr) {
      var d = new Date(dateStr);
      var fday = win.forecastDayForDate(d);
      fdays.push(fday);
      selectedDates.push(d.toISOString());
    });
    win.selectForecastDays(fdays);
    return JSON.stringify({
      success: true,
      selectedDates: selectedDates,
      selectedCount: fdays.length,
      warning: 'This operation changed the visible Forecast perspective in OmniFocus to show the selected dates. The user may notice the view has changed.'
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e), code: 'PERSPECTIVE_SWITCH_FAILED' });
  }
})();`;
}
