/**
 * Repetition rule support (issue #116).
 *
 * OmniFocus stores a repeat as an ICS recurrence string plus a method. Callers
 * shouldn't have to hand-write RRULEs — a mistyped `INTERVAL` is silent and
 * costly (a live task was found scheduled `FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH`
 * against a note reading "2x/week", i.e. half the intended rate, undetected for
 * months). So the tool surface takes a typed shape and this module compiles it.
 *
 * Scope is set by a census of a real, heavily-used database (78 rules): every
 * rule in the wild was a simple interval or a weekday set. Zero used BYSETPOS
 * ("third Tuesday"), BYMONTHDAY, COUNT, or UNTIL — so those are deliberately
 * unsupported rather than half-implemented.
 */

export type RepetitionMethodName = 'fixed' | 'start-after-completion' | 'due-after-completion';
export type RepetitionUnit = 'day' | 'week' | 'month' | 'year';
export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export interface RepetitionSpec {
  method: RepetitionMethodName;
  unit: RepetitionUnit;
  steps?: number;
  /** Week-unit only; compiles to BYDAY. */
  weekdays?: Weekday[];
}

const FREQ_BY_UNIT: Record<RepetitionUnit, string> = {
  day: 'DAILY',
  week: 'WEEKLY',
  month: 'MONTHLY',
  year: 'YEARLY',
};

/**
 * AppleScript enum constants. These are the literal tokens the OmniFocus
 * dictionary expects — verified by round-trip against OmniJS, which reports them
 * back as Fixed / DeferUntilDate / DueDate respectively.
 */
const APPLESCRIPT_METHOD: Record<RepetitionMethodName, string> = {
  fixed: 'fixed repetition',
  'start-after-completion': 'start after completion',
  'due-after-completion': 'due after completion',
};

/** How the method reads back from query_omnifocus (#115), for verification. */
export const OMNIJS_METHOD: Record<RepetitionMethodName, string> = {
  fixed: 'Fixed',
  'start-after-completion': 'DeferUntilDate',
  'due-after-completion': 'DueDate',
};

const VALID_WEEKDAYS: readonly Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export class RepetitionSpecError extends Error {}

/**
 * Compile a spec into an ICS recurrence string.
 *
 * Throws RepetitionSpecError on anything malformed. Failing loudly matters here:
 * a silently-dropped or silently-wrong repeat is exactly the failure this
 * feature exists to remove, so an invalid spec must never degrade into "created
 * without a repeat, reported success".
 */
export function compileRecurrence(spec: RepetitionSpec): string {
  const freq = FREQ_BY_UNIT[spec.unit];
  if (!freq) {
    throw new RepetitionSpecError(
      `Invalid repeat unit "${spec.unit}". Expected one of: day, week, month, year.`
    );
  }
  if (!(spec.method in APPLESCRIPT_METHOD)) {
    throw new RepetitionSpecError(
      `Invalid repeat method "${spec.method}". Expected one of: fixed, start-after-completion, due-after-completion.`
    );
  }

  const steps = spec.steps ?? 1;
  if (!Number.isInteger(steps) || steps < 1) {
    throw new RepetitionSpecError(
      `Invalid repeat steps "${spec.steps}". Expected a positive whole number.`
    );
  }

  const parts = [`FREQ=${freq}`];
  // INTERVAL=1 is the ICS default; omitting it keeps rules byte-identical to
  // what OmniFocus itself writes for a plain weekly repeat, which matters when
  // comparing a written rule against one set by hand in the inspector.
  if (steps > 1) parts.push(`INTERVAL=${steps}`);

  if (spec.weekdays && spec.weekdays.length > 0) {
    if (spec.unit !== 'week') {
      throw new RepetitionSpecError(
        `weekdays is only valid with unit "week" (got "${spec.unit}"). For monthly or yearly ` +
          `positional rules ("third Tuesday"), set the repeat in OmniFocus directly — not yet supported here.`
      );
    }
    const seen = new Set<string>();
    for (const day of spec.weekdays) {
      if (!VALID_WEEKDAYS.includes(day)) {
        throw new RepetitionSpecError(
          `Invalid weekday "${day}". Expected two-letter codes: ${VALID_WEEKDAYS.join(', ')}.`
        );
      }
      if (seen.has(day)) {
        throw new RepetitionSpecError(`Duplicate weekday "${day}" in repeat.`);
      }
      seen.add(day);
    }
    // Emit in calendar order rather than the caller's order, so the same set
    // always produces the same rule string and comparisons are stable.
    const ordered = VALID_WEEKDAYS.filter(d => seen.has(d));
    parts.push(`BYDAY=${ordered.join(',')}`);
  }

  return parts.join(';');
}

/**
 * The AppleScript record literal for a repetition rule, ready to interpolate
 * into `set repetition rule of X to …` or a `make new …with properties` list.
 *
 * NOTE for anyone extending this: only assigning the WHOLE record works.
 * Setting `recurrence` or `repetition method` as sub-properties fails with
 * "Can't make … into type specifier". Verified empirically.
 */
export function repetitionRuleRecord(spec: RepetitionSpec): string {
  const recurrence = compileRecurrence(spec);
  return `{repetition method:${APPLESCRIPT_METHOD[spec.method]}, recurrence:"${recurrence}"}`;
}

/**
 * Human-readable rendering for tool results, so a caller can confirm what was
 * set without decoding an RRULE.
 */
export function describeRepetition(spec: RepetitionSpec): string {
  const steps = spec.steps ?? 1;
  const every = steps === 1 ? `every ${spec.unit}` : `every ${steps} ${spec.unit}s`;
  const days =
    spec.weekdays && spec.weekdays.length > 0
      ? ` on ${VALID_WEEKDAYS.filter(d => spec.weekdays!.includes(d)).join(', ')}`
      : '';
  const from =
    spec.method === 'fixed'
      ? 'on a fixed schedule'
      : spec.method === 'start-after-completion'
        ? 'starting after completion'
        : 'due after completion';
  return `${every}${days}, ${from}`;
}
