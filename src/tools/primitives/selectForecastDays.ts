import {
  type SelectForecastDaysInput,
  type SelectForecastDaysResponse,
  SelectForecastDaysResponseSchema
} from '../../contracts/forecast-tools/select-forecast-days.js';
import { formatDateISO } from '../../utils/formatDateISO.js';
import { parseLocalDate } from '../../utils/parseLocalDate.js';
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

  // Defensive: Zod .min(1) validates at the MCP layer, but guard here
  // in case the primitive is called directly without schema validation.
  if (dates.length === 0) {
    return {
      success: false,
      error: 'At least one date is required',
      code: 'EMPTY_DATES'
    };
  }

  // Validate each date — strict: rejects overflow dates like 2026-02-30 or 2026-13-01
  const validatedDates: string[] = [];
  for (const dateStr of dates) {
    const parsed = parseLocalDate(dateStr);
    if (!parsed.valid) {
      return {
        success: false,
        error: `Invalid date: "${dateStr}" is not a valid date`,
        code: 'INVALID_DATE'
      };
    }
    validatedDates.push(formatDateISO(parsed.date));
  }

  const script = generateSelectForecastDaysScript(validatedDates);
  const result = await executeOmniJS(script);

  if (!result) {
    return {
      success: false,
      error: 'OmniJS script returned empty output — possible silent failure'
    };
  }

  return SelectForecastDaysResponseSchema.parse(result);
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

    var cal = Calendar.current;
    var dateStrings = [${dateArrayStr}];
    var fdays = [];
    var selectedDates = [];
    dateStrings.forEach(function(dateStr) {
      var parts = dateStr.split("-");
      var d = cal.startOfDay(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
      var fday = win.forecastDayForDate(d);
      if (!fday) throw new Error('forecastDayForDate returned null for ' + d.toISOString());
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
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
