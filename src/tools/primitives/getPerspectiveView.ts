import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import {
  buildForecastToday,
  ForecastCandidate,
  ForecastOrderSource,
  resolveForecastSettings,
} from '../../utils/forecastToday.js';

export interface GetPerspectiveViewParams {
  perspectiveName: string;
  limit?: number;
  includeMetadata?: boolean;
  fields?: string[];
  /** Injectable clock for tests; defaults to now. */
  now?: Date;
}

/** How a Forecast result was ordered, so callers can tell a guess from the real thing. */
export interface ForecastOrderInfo {
  orderSource: ForecastOrderSource;
  customOrderedCount: number;
  totalCount: number;
  settingErrors?: Record<string, string>;
}

interface PerspectiveViewResult {
  success: boolean;
  items?: any[];
  error?: string;
  forecast?: ForecastOrderInfo;
  debug?: {
    rules: any;
    tasksEvaluated: number;
    unknownRuleTypes?: string[];
    isCustomPerspective?: boolean;
    rulesUsed?: boolean;
    ruleParseError?: string;
  };
}

// Fields that exist only to compute Forecast membership; not part of an item.
const FORECAST_INTERNAL_FIELDS = new Set([
  'effectivePlannedDate',
  'effectiveDueDate',
  'effectiveDeferDate',
  'notificationDate',
  'tagIds',
]);

/**
 * Turn the script's raw Forecast payload into Today's items, in Forecast order.
 * Exported for tests.
 */
export function resolveForecastResult(
  forecast: {
    settings: Record<string, unknown>;
    candidates: ForecastCandidate[];
    settingErrors?: Record<string, string>;
  },
  now: Date,
): { items: Record<string, unknown>[]; info: ForecastOrderInfo } {
  const settings = resolveForecastSettings(forecast.settings ?? {});
  const today = buildForecastToday(forecast.candidates ?? [], settings, now);
  const items = today.items.map(item => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (!FORECAST_INTERNAL_FIELDS.has(key)) out[key] = value;
    }
    return out;
  });
  return {
    items,
    info: {
      orderSource: today.orderSource,
      customOrderedCount: today.customOrderedCount,
      totalCount: items.length,
      settingErrors: forecast.settingErrors,
    },
  };
}

export async function getPerspectiveView(params: GetPerspectiveViewParams): Promise<PerspectiveViewResult> {
  const { perspectiveName, limit = 100, fields, now = new Date() } = params;

  try {
    // Execute the script with arguments using the @ shorthand
    const result = await executeOmniFocusScript('@getPerspectiveView.js', [perspectiveName, limit.toString()]);

    // The result is already parsed JSON from the script
    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    let items = result.items || [];

    // Forecast comes back as raw settings + candidates; resolve to Today's
    // list in Forecast's own order (see src/utils/forecastToday.ts).
    let forecastInfo: ForecastOrderInfo | undefined;
    if (result.forecast) {
      const resolved = resolveForecastResult(result.forecast, now);
      items = resolved.items;
      forecastInfo = resolved.info;
    }

    // Apply field filtering if specified
    if (fields && fields.length > 0) {
      items = items.map((item: any) => {
        const filtered: any = {};
        fields.forEach(field => {
          if (item.hasOwnProperty(field)) {
            filtered[field] = item[field];
          }
        });
        return filtered;
      });
    }

    // Apply limit (script already limits, but we may filter further)
    if (limit && items.length > limit) {
      items = items.slice(0, limit);
    }

    return {
      success: true,
      items: items,
      forecast: forecastInfo,
      debug: result.debug ? {
        ...result.debug,
        isCustomPerspective: result.isCustomPerspective,
        rulesUsed: result.rulesUsed,
        ruleParseError: result.ruleParseError,
      } : undefined,
    };

  } catch (error) {
    console.error('Error getting perspective view:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
