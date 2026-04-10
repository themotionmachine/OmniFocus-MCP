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

export function resolveDateFilter(input: number | string): number {
  if (typeof input === 'number') {
    return input;
  }

  if (typeof input !== 'string' || input.length === 0) {
    throw new Error(`Invalid date filter value: "${input}"`);
  }

  const normalized = input.trim().toLowerCase();

  if (normalized in NAMED_DATES) {
    return NAMED_DATES[normalized];
  }

  if (ISO_DATE_RE.test(normalized)) {
    const target = new Date(normalized + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  throw new Error(`Unrecognized date filter value: "${input}". Use a number, "today", "tomorrow", "this week", "next week", or an ISO date (YYYY-MM-DD).`);
}
