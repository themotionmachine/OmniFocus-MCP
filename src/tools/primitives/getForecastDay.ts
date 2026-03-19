import type {
  GetForecastDayInput,
  GetForecastDayResponse
} from '../../contracts/forecast-tools/get-forecast-day.js';
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
    targetDate = new Date(params.date);
    if (Number.isNaN(targetDate.getTime())) {
      return {
        success: false,
        error: `Invalid date: "${params.date}" is not a valid date`,
        code: 'INVALID_DATE'
      };
    }
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
      error: 'No response from OmniFocus script execution',
      code: 'PERSPECTIVE_SWITCH_FAILED'
    };
  }

  return result as GetForecastDayResponse;
}

/**
 * Format a Date to YYYY-MM-DD string for OmniJS consumption.
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    var targetDate = cal.startOfDay(new Date("${dateStr}"));
    var fday = win.forecastDayForDate(targetDate);
    return JSON.stringify({
      success: true,
      day: {
        date: targetDate.toISOString(),
        name: fday.name,
        kind: kindToString(fday.kind),
        badgeCount: fday.badgeCount,
        badgeStatus: statusToString(fday.badgeKind()),
        deferredCount: fday.deferredCount
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e), code: 'PERSPECTIVE_SWITCH_FAILED' });
  }
})();`;
}
