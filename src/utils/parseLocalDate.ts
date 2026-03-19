/**
 * Strict YYYY-MM-DD local date parser.
 *
 * JavaScript's `new Date(y, m-1, d)` silently normalizes overflow dates:
 *   - 2026-02-30 → March 2, 2026
 *   - 2026-13-01 → January 1, 2027
 *
 * This helper detects normalization by round-tripping the components back
 * through `getFullYear()`, `getMonth()`, and `getDate()`. If any component
 * differs from the input, the date was overflowed and is invalid.
 *
 * @param dateStr - A date string in YYYY-MM-DD format
 * @returns `{ valid: true, date: Date }` or `{ valid: false }`
 */
export function parseLocalDate(dateStr: string): { valid: true; date: Date } | { valid: false } {
  // Step 1: format check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { valid: false };
  }

  const parts = dateStr.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  // Step 2: construct local date — use setFullYear to avoid JS treating years 0-99 as 1900-1999
  const date = new Date(0);
  date.setFullYear(y, m - 1, d);
  date.setHours(0, 0, 0, 0);

  // Step 3: round-trip check — catches overflow (e.g. Feb 30 → Mar 2)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return { valid: false };
  }

  return { valid: true, date };
}
