/**
 * Rebuild the Forecast perspective's Today list from OmniFocus's own settings.
 *
 * Omni Automation has no API that returns Forecast's rows: a window's content
 * tree does, but only for a window on screen showing Forecast. So the Forecast
 * view is reconstructed from the same inputs OmniFocus uses, all of which live
 * in the database's Setting table and are readable through `settings`:
 *
 * | Forecast view option                | Setting key                                        | Default |
 * |-------------------------------------|----------------------------------------------------|---------|
 * | Include items on planned date       | `_ForecastIncludePlannedItems`                     | true    |
 * | Include items on defer date         | `_ForecastIncludeDeferredItems`                    | false   |
 * | Include items on notification date  | `_ForecastIncludeItemsWithScheduledNotifications`  | false   |
 * | Today includes flagged items        | `_ForecastTodayIncludesFlaggedItems`               | true    |
 * | Today includes items tagged …       | `_ForecastBlessedTagIdentifier` (tag id)           | none    |
 * | Structure: Organized (vs Flexible)  | `_ForecastIsOrganizedIntoGroups`                   | false   |
 * | Keep sorted (unchecked = custom)    | `_ForecastAllowCustomOrder`                        | false   |
 * | Order the user dragged (Flexible)   | `ForecastFlatListCustomOrder`                      | {}      |
 *
 * The key names come from OmniFocusModel.framework; a key absent from the
 * Setting table holds its default. The defaults of the underscore keys are not
 * in the framework's .registrations file, so the "true" defaults above were
 * read off the view-options popover of a database that had never changed them.
 *
 * `ForecastFlatListCustomOrder` maps a short date ("11/11/26", M/D/YY) to the
 * ids in that day's dragged order. The list also carries calendar-event slots
 * ("8:35 AM,9:00 AM") and ids of tasks no longer shown (completed, deferred);
 * only relative order matters, so those are simply skipped.
 */

export interface ForecastSettings {
  includePlanned: boolean;
  includeDeferred: boolean;
  includeNotifications: boolean;
  todayIncludesFlagged: boolean;
  blessedTagId: string | null;
  organizedIntoGroups: boolean;
  allowCustomOrder: boolean;
  flatCustomOrder: Record<string, string[]>;
}

/** Raw values as read from `settings.objectForKey`; null/undefined = unset. */
export type RawForecastSettings = Record<string, unknown>;

export const FORECAST_SETTING_KEYS = [
  '_ForecastIncludePlannedItems',
  '_ForecastIncludeDeferredItems',
  '_ForecastIncludeItemsWithScheduledNotifications',
  '_ForecastTodayIncludesFlaggedItems',
  '_ForecastBlessedTagIdentifier',
  '_ForecastIsOrganizedIntoGroups',
  '_ForecastAllowCustomOrder',
  'ForecastFlatListCustomOrder',
] as const;

function bool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return fallback;
}

export function resolveForecastSettings(raw: RawForecastSettings): ForecastSettings {
  const tag = raw['_ForecastBlessedTagIdentifier'];
  const order = raw['ForecastFlatListCustomOrder'];
  const flatCustomOrder: Record<string, string[]> = {};
  if (order && typeof order === 'object' && !Array.isArray(order)) {
    for (const [key, value] of Object.entries(order as Record<string, unknown>)) {
      if (Array.isArray(value)) flatCustomOrder[key] = value.map(String);
    }
  }
  return {
    includePlanned: bool(raw['_ForecastIncludePlannedItems'], true),
    includeDeferred: bool(raw['_ForecastIncludeDeferredItems'], false),
    includeNotifications: bool(raw['_ForecastIncludeItemsWithScheduledNotifications'], false),
    todayIncludesFlagged: bool(raw['_ForecastTodayIncludesFlaggedItems'], true),
    blessedTagId: typeof tag === 'string' && tag !== '' ? tag : null,
    organizedIntoGroups: bool(raw['_ForecastIsOrganizedIntoGroups'], false),
    allowCustomOrder: bool(raw['_ForecastAllowCustomOrder'], false),
    flatCustomOrder,
  };
}

/** The `ForecastFlatListCustomOrder` key for a local calendar day: M/D/YY. */
export function forecastOrderKey(day: Date): string {
  const yy = String(day.getFullYear() % 100).padStart(2, '0');
  return `${day.getMonth() + 1}/${day.getDate()}/${yy}`;
}

/** A remaining task as the OmniJS side reports it for Forecast. */
export interface ForecastCandidate {
  id: string;
  name: string;
  flagged: boolean;
  /** Effective dates, ISO strings with offset, or null. */
  effectivePlannedDate: string | null;
  effectiveDueDate: string | null;
  effectiveDeferDate: string | null;
  /** Earliest pending notification fire date, if any. */
  notificationDate?: string | null;
  tagIds: string[];
  [extra: string]: unknown;
}

export type ForecastReason = 'due' | 'planned' | 'deferred' | 'notification' | 'flagged' | 'tagged';

function isOnDay(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

function dayBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start, end };
}

/**
 * Why a task appears in Today, or [] if it doesn't. Only dates falling on
 * today count: an earlier date puts a task in Forecast's Past column instead.
 */
export function forecastTodayReasons(
  task: ForecastCandidate,
  settings: ForecastSettings,
  now: Date,
): ForecastReason[] {
  const { start, end } = dayBounds(now);
  const reasons: ForecastReason[] = [];
  if (isOnDay(task.effectiveDueDate, start, end)) reasons.push('due');
  if (settings.includePlanned && isOnDay(task.effectivePlannedDate, start, end)) reasons.push('planned');
  if (settings.includeDeferred && isOnDay(task.effectiveDeferDate, start, end)) reasons.push('deferred');
  if (settings.includeNotifications && isOnDay(task.notificationDate, start, end)) reasons.push('notification');
  if (settings.todayIncludesFlagged && task.flagged) reasons.push('flagged');
  if (settings.blessedTagId && task.tagIds.includes(settings.blessedTagId)) reasons.push('tagged');
  return reasons;
}

/** The time a task sorts by when there is no custom position for it. */
function sortTime(task: ForecastCandidate, settings: ForecastSettings, now: Date): number {
  const { start, end } = dayBounds(now);
  const dates = [task.effectiveDueDate];
  if (settings.includePlanned) dates.push(task.effectivePlannedDate);
  if (settings.includeDeferred) dates.push(task.effectiveDeferDate);
  const today = dates
    .filter((d): d is string => isOnDay(d, start, end))
    .map(d => new Date(d).getTime());
  // Flagged/tagged-only items carry no date today; they sort after dated ones.
  return today.length > 0 ? Math.min(...today) : Number.POSITIVE_INFINITY;
}

export type ForecastOrderSource = 'custom' | 'time';

export interface ForecastToday<T extends ForecastCandidate> {
  items: Array<T & { forecastReasons: ForecastReason[] }>;
  orderSource: ForecastOrderSource;
  /** Items placed by the user's dragged order (the rest follow, by time). */
  customOrderedCount: number;
}

/**
 * Today's Forecast items, in the order Forecast shows them.
 *
 * With Flexible structure and "Keep sorted" off, the user's dragged order for
 * today comes first; items they never dragged (e.g. planned since) follow by
 * time. Otherwise, and for Organized structure, items sort by time.
 */
export function buildForecastToday<T extends ForecastCandidate>(
  candidates: T[],
  settings: ForecastSettings,
  now: Date,
): ForecastToday<T> {
  const members = candidates
    .map(task => ({ ...task, forecastReasons: forecastTodayReasons(task, settings, now) }))
    .filter(task => task.forecastReasons.length > 0);

  const useCustom = settings.allowCustomOrder && !settings.organizedIntoGroups;
  const customList = useCustom ? settings.flatCustomOrder[forecastOrderKey(now)] ?? [] : [];
  const position = new Map<string, number>();
  customList.forEach((id, i) => {
    if (!position.has(id)) position.set(id, i);
  });

  const byTime = (a: T, b: T) =>
    sortTime(a, settings, now) - sortTime(b, settings, now) || a.name.localeCompare(b.name);

  const placed = members
    .filter(t => position.has(t.id))
    .sort((a, b) => position.get(a.id)! - position.get(b.id)!);
  const rest = members.filter(t => !position.has(t.id)).sort(byTime);

  return {
    items: [...placed, ...rest],
    orderSource: useCustom && placed.length > 0 ? 'custom' : 'time',
    customOrderedCount: placed.length,
  };
}
