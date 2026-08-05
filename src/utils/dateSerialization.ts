/**
 * Canonical date -> string serialization for everything this server returns.
 *
 * Why this module exists (issue #91): every date field used to be serialized with
 * `date.toISOString()`, which renders the instant in UTC. OmniFocus dates are
 * *local* wall-clock times — a defer date is "midnight on the 1st", not an instant
 * anybody reasons about in UTC. In any timezone ahead of UTC, local midnight
 * serializes to the previous UTC day:
 *
 *     Europe/London (BST, +01:00), defer date = Oct 1 00:00 local
 *       toISOString()      -> "2026-09-30T23:00:00.000Z"   <- reads as Sep 30
 *       formatDateLocal()  -> "2026-10-01T00:00:00+01:00"  <- reads as Oct 1
 *
 * The bug was invisible to anyone developing behind UTC (the Americas), which is
 * why it survived this long. An offset-qualified local ISO string fixes the
 * calendar day *without* losing the instant — it round-trips through `new Date()`
 * to the exact same moment `toISOString()` would have produced.
 *
 * This is the single implementation. The JXA payloads that run inside OmniFocus
 * cannot `import`, so they receive this function's source text via
 * `JXA_FORMAT_DATE_SOURCE` rather than keeping their own copies — there is
 * nothing to drift.
 */

/**
 * Serialize a Date as an ISO 8601 string in the host's local timezone, with an
 * explicit UTC offset (e.g. `2026-10-01T00:00:00+01:00`).
 *
 * MUST stay self-contained: its source is stringified and shipped into JXA, so it
 * cannot reference imports, module-scope values, or anything outside its own body.
 */
export function formatDateLocal(date: Date | null | undefined): string | null {
  if (!date) return null;
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  // getTimezoneOffset() is minutes to ADD to local to reach UTC, so it is
  // positive west of Greenwich — the opposite sign from the ISO suffix.
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const abs = offset < 0 ? -offset : offset;
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds()) +
    sign +
    pad(Math.floor(abs / 60)) +
    ':' +
    pad(abs % 60)
  );
}

/**
 * `formatDateLocal`'s implementation as JXA-injectable source, bound to the name
 * `formatDate` that the payloads and generated scripts call.
 *
 * Derived from the live function rather than hand-copied, so the code the tests
 * exercise is byte-for-byte the code that runs inside OmniFocus.
 */
export const JXA_FORMAT_DATE_SOURCE = `const formatDate = ${formatDateLocal.toString()};`;

/**
 * Extract the calendar date (`YYYY-MM-DD`) a serialized timestamp refers to.
 *
 * Must not round-trip through UTC: `new Date(s).toISOString().slice(0, 10)` is how
 * the human-readable output re-introduced the very off-by-one day that
 * `formatDateLocal` exists to prevent. When the string carries its own date part
 * (every string this server emits does), trust it verbatim.
 */
export function localDatePart(dateStr: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(dateStr);
  if (match) return match[1];
  // Fall back to local-time getters for anything else (e.g. a bare epoch or a
  // locale string) — still never UTC.
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return formatDateLocal(date)!.slice(0, 10);
}
