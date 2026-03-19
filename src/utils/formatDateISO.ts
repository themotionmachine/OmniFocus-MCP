/**
 * Format a Date to YYYY-MM-DD string for OmniJS consumption.
 *
 * Uses component extraction (getFullYear/getMonth/getDate) to avoid
 * timezone issues with toISOString() which produces UTC strings.
 *
 * @param date - A JavaScript Date object
 * @returns Date formatted as YYYY-MM-DD in local time
 */
export function formatDateISO(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
