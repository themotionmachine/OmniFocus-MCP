/**
 * Resolves human-readable date filter strings to numeric days-from-now values.
 * Accepts numbers (passthrough), named strings, or ISO date strings (YYYY-MM-DD).
 */

const NAMED_DATES: Record<string, number> = {
  'today': 0,
  'tomorrow': 1,
  'this week': 7,
  'next week': 14,
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `direction: 'past'` is for the backward-looking `*Within` filters
 * (addedWithin, completedWithin, droppedWithin), whose value is "days ago".
 * A future value there has no meaning — "added within tomorrow" — and used to
 * resolve silently to something else ("tomorrow" meant since midnight
 * yesterday), so it is refused.
 */
export function resolveDateFilter(input: number | string, direction: 'future' | 'past' = 'future'): number {
  const resolved = resolveRaw(input, direction);
  if (direction === 'past' && resolved < 0) {
    throw new Error(
      `Date filter value ${JSON.stringify(input)} is in the future, but this filter looks backward ` +
        `("within the last N days"). Use a number of days ago, "today", "this week", or a past YYYY-MM-DD.`
    );
  }
  return resolved;
}

const FUTURE_NAMES = new Set(['tomorrow', 'next week']);

function resolveRaw(input: number | string, direction: 'future' | 'past'): number {
  if (typeof input === 'number') {
    return input;
  }

  if (typeof input !== 'string' || input.length === 0) {
    throw new Error(`Invalid date filter value: "${input}"`);
  }

  const normalized = input.trim().toLowerCase();

  if (normalized in NAMED_DATES) {
    if (direction === 'past' && FUTURE_NAMES.has(normalized)) return -1;
    return NAMED_DATES[normalized];
  }

  if (ISO_DATE_RE.test(normalized)) {
    const target = new Date(normalized + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysFromNow = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // Backward-looking filters (e.g. addedWithin) expect an unsigned "days ago"
    // count, which is the negation of the forward "days from now" offset.
    return direction === 'past' ? -daysFromNow : daysFromNow;
  }

  throw new Error(`Unrecognized date filter value: "${input}". Use a number, "today", "tomorrow", "this week", "next week", or an ISO date (YYYY-MM-DD).`);
}
