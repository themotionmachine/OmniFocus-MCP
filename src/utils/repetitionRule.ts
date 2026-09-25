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
  /**
   * `fixed` only: which date the schedule counts from. Omitted, it is the due
   * date if the item has one, else the defer date, else the planned date — see
   * `repetitionRuleScript` for why that default matters.
   */
  anchor?: RepetitionAnchor;
  /** `fixed` only: OmniFocus's "catch up automatically". Default false. */
  catchUp?: boolean;
}

export type RepetitionAnchor = 'defer' | 'due' | 'planned';

const FREQ_BY_UNIT: Record<RepetitionUnit, string> = {
  day: 'DAILY',
  week: 'WEEKLY',
  month: 'MONTHLY',
  year: 'YEARLY',
};

/**
 * How each method is written through Omni Automation. OmniFocus 4.7 split the
 * old single "method" into a schedule type plus an anchor date; the two
 * after-completion methods imply their anchor, `fixed` needs one chosen.
 * Verified by round-trip: each combination reads back as the OMNIJS_METHOD
 * value below.
 */
const SCHEDULE: Record<RepetitionMethodName, 'Regularly' | 'FromCompletion'> = {
  fixed: 'Regularly',
  'start-after-completion': 'FromCompletion',
  'due-after-completion': 'FromCompletion',
};

const ANCHOR_KEY: Record<RepetitionAnchor, string> = {
  defer: 'DeferDate',
  due: 'DueDate',
  planned: 'PlannedDate',
};

const IMPLIED_ANCHOR: Partial<Record<RepetitionMethodName, RepetitionAnchor>> = {
  'start-after-completion': 'defer',
  'due-after-completion': 'due',
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
  if (!(spec.method in SCHEDULE)) {
    throw new RepetitionSpecError(
      `Invalid repeat method "${spec.method}". Expected one of: fixed, start-after-completion, due-after-completion.`
    );
  }

  if (spec.method !== 'fixed' && (spec.anchor !== undefined || spec.catchUp !== undefined)) {
    throw new RepetitionSpecError(
      `anchor and catchUp only apply to method "fixed"; "${spec.method}" already implies its ` +
        `anchor (${IMPLIED_ANCHOR[spec.method]} date, counted from completion).`
    );
  }
  if (spec.anchor !== undefined && !(spec.anchor in ANCHOR_KEY)) {
    throw new RepetitionSpecError(
      `Invalid repeat anchor "${spec.anchor}". Expected one of: defer, due, planned.`
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
 * AppleScript that sets `targetVar`'s repetition rule and leaves the anchor it
 * was stored with ('defer' | 'due' | 'planned') in the AppleScript variable
 * `_repetitionAnchor`. Emit inside `tell front document`, after the item's dates
 * have been written, so the default anchor sees the dates as they now stand.
 *
 * Why not `set repetition rule of X to {repetition method:…, recurrence:…}`:
 * that record has no anchor field, and OmniFocus stores every `fixed
 * repetition` written that way as anchored on the DUE date — whatever dates the
 * item actually has. A due-anchored repeat on an item with no due date grows
 * one on completion; one live case came back deferred past its own new due
 * date. So the rule is built through Omni Automation instead, where schedule
 * type and anchor are explicit constructor arguments.
 *
 * The id is resolved with `Task.byIdentifier`: AppleScript's id for a project is
 * its root task's id (the two-namespace landmine from #77), and a root task's
 * `.project` is the project itself, so one lookup covers both item types.
 *
 * The stored rule is read back and compared; a mismatch throws, which the
 * caller's `on error` turns into a failure result. A repeat that silently lands
 * as something other than what was asked is the failure this module exists to
 * remove.
 */
export function repetitionRuleScript(
  targetVar: string,
  spec: RepetitionSpec,
  options: { isProject: boolean }
): string {
  const recurrence = compileRecurrence(spec);
  if (options.isProject && spec.anchor === 'planned') {
    throw new RepetitionSpecError(
      'anchor "planned" is not available for projects (projects have no planned date). Use "defer" or "due".'
    );
  }

  const schedule = SCHEDULE[spec.method];
  const catchUp = spec.method === 'fixed' && spec.catchUp === true;
  const fixedAnchor = spec.anchor ?? IMPLIED_ANCHOR[spec.method];
  // The default is evaluated at write time against the item's current dates.
  const anchorExpr = fixedAnchor
    ? `K.${ANCHOR_KEY[fixedAnchor]}`
    : options.isProject
      ? '(x.dueDate ? K.DueDate : K.DeferDate)'
      : '(x.dueDate ? K.DueDate : x.deferDate ? K.DeferDate : x.plannedDate ? K.PlannedDate : K.DeferDate)';

  // Single-quoted JS only: this is spliced into a double-quoted AppleScript
  // string. Every interpolated value is a compiled RRULE or a fixed identifier.
  const js =
    `(function(){var t=Task.byIdentifier('" & _repetitionId & "');` +
    `if(!t)throw new Error('repetition: item not found');` +
    `if(!Task.AnchorDateKey)throw new Error('repetition: setting a repeat requires OmniFocus 4.7 or later');` +
    `var x=t.project?t.project:t;var K=Task.AnchorDateKey;var S=Task.RepetitionScheduleType.${schedule};` +
    `var a=${anchorExpr};` +
    `x.repetitionRule=new Task.RepetitionRule('${recurrence}',null,S,a,${catchUp});` +
    `var r=x.repetitionRule;` +
    `if(!r||r.ruleString!=='${recurrence}'||r.scheduleType!==S||r.anchorDateKey!==a||r.catchUpAutomatically!==${catchUp})` +
    `throw new Error('repetition: rule did not read back as written');` +
    `return a===K.DueDate?'due':a===K.DeferDate?'defer':'planned';})()`;

  return `set _repetitionId to id of ${targetVar} as string
          tell application "OmniFocus" to set _repetitionAnchor to (evaluate javascript "${js}")`;
}

/**
 * The changedProperties label for an edit, built at script runtime so a
 * defaulted anchor is reported as the one actually stored — the caller should
 * never have to re-query to learn which date a fixed repeat counts from.
 */
export function repetitionChangeLabel(spec: RepetitionSpec): string {
  if (spec.method === 'fixed') {
    const catchUp = spec.catchUp ? ', catch up' : '';
    return `"repetition (fixed, from " & _repetitionAnchor & " date${catchUp})"`;
  }
  return spec.method === 'start-after-completion'
    ? '"repetition (start after completion)"'
    : '"repetition (due after completion)"';
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
      ? spec.anchor
        ? `on a fixed schedule from the ${spec.anchor} date`
        : 'on a fixed schedule from the due date (or defer date if none)'
      : spec.method === 'start-after-completion'
        ? 'starting after completion'
        : 'due after completion';
  return `${every}${days}, ${from}`;
}
