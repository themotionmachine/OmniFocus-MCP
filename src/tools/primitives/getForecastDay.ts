import {
  type GetForecastDayInput,
  type GetForecastDayResponse,
  GetForecastDayResponseSchema
} from '../../contracts/forecast-tools/get-forecast-day.js';
import { formatDateISO } from '../../utils/formatDateISO.js';
import { parseLocalDate } from '../../utils/parseLocalDate.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Get forecast data for a single date.
 *
 * @param params - Input parameters with optional date (default: today)
 * @returns Promise resolving to forecast day or error
 */
export async function getForecastDay(params: GetForecastDayInput): Promise<GetForecastDayResponse> {
  // Default to today
  let targetDate: Date;

  if (params.date) {
    // Strict parse: rejects overflow dates like 2026-02-30 or 2026-13-01
    const parsed = parseLocalDate(params.date);
    if (!parsed.valid) {
      return {
        success: false,
        error: `Invalid date: "${params.date}" is not a valid date`,
        code: 'INVALID_DATE'
      };
    }
    targetDate = parsed.date;
  } else {
    targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
  }

  const dateStr = formatDateISO(targetDate);

  const script = generateGetForecastDayScript(dateStr);
  const result = await executeOmniJS(script);

  if (!result) {
    return {
      success: false,
      error: 'OmniJS script returned empty output — possible silent failure'
    };
  }

  return GetForecastDayResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to query forecast data for a single date.
 * Exported for testing and manual verification in OmniFocus Script Editor.
 */
export function generateGetForecastDayScript(dateStr: string): string {
  return `(function() {
  try {
    var win = document.windows[0];
    if (!win) {
      return JSON.stringify({ success: false, error: 'No OmniFocus window is open', code: 'NO_WINDOW' });
    }
    win.perspective = Perspective.BuiltIn.Forecast;

    function kindToString(k) {
      if (k === ForecastDay.Kind.Day) return 'Day';
      if (k === ForecastDay.Kind.Today) return 'Today';
      if (k === ForecastDay.Kind.Past) return 'Past';
      if (k === ForecastDay.Kind.FutureMonth) return 'FutureMonth';
      if (k === ForecastDay.Kind.DistantFuture) return 'DistantFuture';
      return 'Day';
    }

    function statusToString(s) {
      if (s === ForecastDay.Status.Available) return 'Available';
      if (s === ForecastDay.Status.DueSoon) return 'DueSoon';
      if (s === ForecastDay.Status.NoneAvailable) return 'NoneAvailable';
      if (s === ForecastDay.Status.Overdue) return 'Overdue';
      return 'NoneAvailable';
    }

    var cal = Calendar.current;
    var parts = "${dateStr}".split("-");
    var targetDate = cal.startOfDay(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    var fday = win.forecastDayForDate(targetDate);
    if (!fday) throw new Error('forecastDayForDate returned null for ' + targetDate.toISOString());
    return JSON.stringify({
      success: true,
      day: {
        date: targetDate.toISOString(),
        name: fday.name,
        kind: kindToString(fday.kind),
        badgeCount: fday.badgeCount,
        badgeStatus: statusToString(fday.badgeKind()),
        deferredCount: fday.deferredCount
      },
      warning: 'The Forecast perspective was activated in OmniFocus to fulfill this query. The user may notice the view has changed.'
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
