import type {
  GetForecastRangeInput,
  GetForecastRangeResponse
} from '../../contracts/forecast-tools/get-forecast-range.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

const MAX_RANGE_DAYS = 90;

/**
 * Get forecast data for a date range.
 *
 * @param params - Input parameters with optional startDate and endDate
 * @returns Promise resolving to forecast days or error
 */
export async function getForecastRange(
  params: GetForecastRangeInput
): Promise<GetForecastRangeResponse> {
  // Default dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate: Date;
  let endDate: Date;

  // Validate and resolve startDate
  if (params.startDate) {
    startDate = new Date(params.startDate);
    if (Number.isNaN(startDate.getTime())) {
      return {
        success: false,
        error: `Invalid startDate: "${params.startDate}" is not a valid date`,
        code: 'INVALID_DATE'
      };
    }
  } else {
    startDate = today;
  }

  // Validate and resolve endDate
  if (params.endDate) {
    endDate = new Date(params.endDate);
    if (Number.isNaN(endDate.getTime())) {
      return {
        success: false,
        error: `Invalid endDate: "${params.endDate}" is not a valid date`,
        code: 'INVALID_DATE'
      };
    }
  } else {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  }

  // Validate range: start must be <= end
  if (startDate.getTime() > endDate.getTime()) {
    return {
      success: false,
      error: 'Start date must be before or equal to end date',
      code: 'INVALID_RANGE'
    };
  }

  // Validate range size: max 90 days
  const dayDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff > MAX_RANGE_DAYS) {
    return {
      success: false,
      error: `Range of ${dayDiff} days exceeds maximum of ${MAX_RANGE_DAYS} days`,
      code: 'RANGE_TOO_LARGE'
    };
  }

  const startDateStr = formatDateISO(startDate);
  const endDateStr = formatDateISO(endDate);

  const script = generateGetForecastRangeScript(startDateStr, endDateStr);
  const result = await executeOmniJS(script);

  if (!result) {
    return {
      success: false,
      error: 'No response from OmniFocus script execution',
      code: 'PERSPECTIVE_SWITCH_FAILED'
    };
  }

  return result as GetForecastRangeResponse;
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
 * Generate OmniJS script to query forecast data for a date range.
 * Exported for testing and manual verification in OmniFocus Script Editor.
 */
export function generateGetForecastRangeScript(startDateStr: string, endDateStr: string): string {
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
    var start = cal.startOfDay(new Date("${startDateStr}"));
    var end = cal.startOfDay(new Date("${endDateStr}"));
    var dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    var days = [];
    var dc = new DateComponents();
    for (var i = 0; i < dayCount; i++) {
      dc.day = i;
      var date = cal.dateByAddingDateComponents(start, dc);
      var fday = win.forecastDayForDate(date);
      days.push({
        date: date.toISOString(),
        name: fday.name,
        kind: kindToString(fday.kind),
        badgeCount: fday.badgeCount,
        badgeStatus: statusToString(fday.badgeKind()),
        deferredCount: fday.deferredCount
      });
    }
    return JSON.stringify({
      success: true,
      days: days,
      totalDays: days.length,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e), code: 'PERSPECTIVE_SWITCH_FAILED' });
  }
})();`;
}
