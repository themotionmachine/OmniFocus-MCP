import { describe, it, expect } from 'vitest';
import {
  compileRecurrence,
  repetitionRuleScript,
  repetitionChangeLabel,
  describeRepetition,
  RepetitionSpecError,
  OMNIJS_METHOD,
  type RepetitionSpec,
} from '../repetitionRule.js';

describe('compileRecurrence (#116)', () => {
  it('maps each unit to its ICS frequency', () => {
    const freq = (unit: RepetitionSpec['unit']) =>
      compileRecurrence({ method: 'fixed', unit });
    expect(freq('day')).toBe('FREQ=DAILY');
    expect(freq('week')).toBe('FREQ=WEEKLY');
    expect(freq('month')).toBe('FREQ=MONTHLY');
    expect(freq('year')).toBe('FREQ=YEARLY');
  });

  it('omits INTERVAL when steps is 1 or absent', () => {
    // INTERVAL=1 is the ICS default; omitting it keeps our rules byte-identical
    // to what OmniFocus writes for a plain weekly repeat, so a written rule can
    // be compared against a hand-set one.
    expect(compileRecurrence({ method: 'fixed', unit: 'week' })).toBe('FREQ=WEEKLY');
    expect(compileRecurrence({ method: 'fixed', unit: 'week', steps: 1 })).toBe('FREQ=WEEKLY');
  });

  it('emits INTERVAL for steps above 1', () => {
    expect(compileRecurrence({ method: 'fixed', unit: 'day', steps: 15 })).toBe(
      'FREQ=DAILY;INTERVAL=15'
    );
  });

  it('compiles weekday sets to BYDAY', () => {
    expect(
      compileRecurrence({ method: 'fixed', unit: 'week', weekdays: ['MO', 'WE', 'FR'] })
    ).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });

  it('normalizes weekday order so the same set always yields the same rule', () => {
    // Callers pass days in whatever order they think of them; an unstable rule
    // string would break comparison against an existing rule.
    expect(
      compileRecurrence({ method: 'fixed', unit: 'week', weekdays: ['FR', 'MO', 'WE'] })
    ).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });

  it('combines INTERVAL and BYDAY in ICS field order', () => {
    // This is the exact shape of the live rule that motivated the feature.
    expect(
      compileRecurrence({ method: 'fixed', unit: 'week', steps: 2, weekdays: ['TU', 'TH'] })
    ).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH');
  });

  it('ignores an empty weekdays array rather than emitting BYDAY=', () => {
    expect(compileRecurrence({ method: 'fixed', unit: 'week', weekdays: [] })).toBe('FREQ=WEEKLY');
  });

  describe('rejects malformed specs loudly', () => {
    // A silently-dropped or silently-wrong repeat is the exact failure this
    // feature removes, so an invalid spec must never degrade into
    // "created without a repeat, reported success".
    const bad: [string, any][] = [
      ['unknown unit', { method: 'fixed', unit: 'fortnight' }],
      ['unknown method', { method: 'whenever', unit: 'week' }],
      ['zero steps', { method: 'fixed', unit: 'week', steps: 0 }],
      ['negative steps', { method: 'fixed', unit: 'week', steps: -2 }],
      ['fractional steps', { method: 'fixed', unit: 'week', steps: 1.5 }],
      ['bad weekday code', { method: 'fixed', unit: 'week', weekdays: ['MON'] }],
      ['duplicate weekday', { method: 'fixed', unit: 'week', weekdays: ['MO', 'MO'] }],
      ['weekdays on a non-week unit', { method: 'fixed', unit: 'month', weekdays: ['MO'] }],
    ];
    for (const [label, spec] of bad) {
      it(label, () => {
        expect(() => compileRecurrence(spec)).toThrow(RepetitionSpecError);
      });
    }
  });

  it('names the unsupported positional case in the weekday error', () => {
    // "third Tuesday" is the shape a caller will try next; the error should say
    // where to go rather than just refusing.
    expect(() =>
      compileRecurrence({ method: 'fixed', unit: 'month', weekdays: ['TU'] })
    ).toThrow(/third Tuesday/);
  });
});

/**
 * Run the JS that repetitionRuleScript embeds against a minimal fake of the
 * OmniJS surface it touches. String-matching the script would pin its spelling;
 * executing it pins what it DOES — which anchor it picks for which dates, and
 * that it refuses a rule that reads back differently.
 */
function runRuleScript(
  spec: RepetitionSpec,
  dates: { dueDate?: Date | null; deferDate?: Date | null; plannedDate?: Date | null },
  options: { isProject?: boolean; tamper?: (rule: any) => void } = {}
) {
  const script = repetitionRuleScript('x', spec, { isProject: options.isProject ?? false });
  const m = script.match(/evaluate javascript "(.*)"\)$/m);
  if (!m) throw new Error('no evaluate javascript call in:\n' + script);
  const js = m[1].replace('" & _repetitionId & "', 'ID1');

  const K = { DeferDate: { k: 'DeferDate' }, DueDate: { k: 'DueDate' }, PlannedDate: { k: 'PlannedDate' } };
  const S = { Regularly: { s: 'Regularly' }, FromCompletion: { s: 'FromCompletion' } };
  class RepetitionRule {
    constructor(
      public ruleString: string,
      public method: unknown,
      public scheduleType: unknown,
      public anchorDateKey: unknown,
      public catchUpAutomatically: boolean
    ) {}
  }
  let stored: any = null;
  const target = {
    dueDate: dates.dueDate ?? null,
    deferDate: dates.deferDate ?? null,
    plannedDate: dates.plannedDate ?? null,
    get repetitionRule() { return stored; },
    set repetitionRule(r: any) { stored = r; options.tamper?.(r); },
  };
  const rootTask = options.isProject ? { project: target } : null;
  const Task = {
    byIdentifier: (id: string) => (id === 'ID1' ? (rootTask ?? Object.assign(target, { project: null })) : null),
    AnchorDateKey: K,
    RepetitionScheduleType: S,
    RepetitionRule,
  };
  const anchor = new Function('Task', `return ${js}`)(Task) as string;
  const keyName = (v: unknown) => Object.entries(K).find(([, o]) => o === v)?.[0];
  const schedName = (v: unknown) => Object.entries(S).find(([, o]) => o === v)?.[0];
  return {
    anchor,
    stored: {
      ruleString: stored.ruleString,
      schedule: schedName(stored.scheduleType),
      anchorKey: keyName(stored.anchorDateKey),
      catchUp: stored.catchUpAutomatically,
    },
  };
}

const D = new Date('2026-10-02T12:00:00Z');

describe('repetitionRuleScript: which date a fixed repeat counts from', () => {
  const fixedWeekly: RepetitionSpec = { method: 'fixed', unit: 'week', weekdays: ['FR'] };

  // The bug this replaces: the AppleScript record always stored DueDate, so an
  // item with no due date grew one on completion.
  it.each([
    ['due only', { dueDate: D }, 'DueDate'],
    ['defer only', { deferDate: D }, 'DeferDate'],
    ['due and defer', { dueDate: D, deferDate: D }, 'DueDate'],
    ['planned only', { plannedDate: D }, 'PlannedDate'],
    ['no dates at all', {}, 'DeferDate'],
  ] as const)('defaults sensibly for a task with %s', (_label, dates, expected) => {
    const { stored } = runRuleScript(fixedWeekly, dates);
    expect(stored.anchorKey).toBe(expected);
    expect(stored.schedule).toBe('Regularly');
    expect(stored.ruleString).toBe('FREQ=WEEKLY;BYDAY=FR');
    expect(stored.catchUp).toBe(false);
  });

  it('honors an explicit anchor over the default, whatever dates exist', () => {
    const { stored, anchor } = runRuleScript({ ...fixedWeekly, anchor: 'defer' }, { dueDate: D, deferDate: D });
    expect(stored.anchorKey).toBe('DeferDate');
    expect(anchor).toBe('defer');
  });

  it('reports the anchor it actually stored, so a default is never silent', () => {
    expect(runRuleScript(fixedWeekly, { deferDate: D }).anchor).toBe('defer');
    expect(runRuleScript(fixedWeekly, { dueDate: D }).anchor).toBe('due');
    expect(runRuleScript(fixedWeekly, { plannedDate: D }).anchor).toBe('planned');
  });

  it('passes catchUp through', () => {
    expect(runRuleScript({ ...fixedWeekly, catchUp: true }, { deferDate: D }).stored.catchUp).toBe(true);
  });

  it('never defaults a project to the planned date (projects have none)', () => {
    const { stored } = runRuleScript(fixedWeekly, { plannedDate: D }, { isProject: true });
    expect(stored.anchorKey).toBe('DeferDate');
  });

  it('sets the rule on the project, not its root task', () => {
    const { stored } = runRuleScript({ method: 'fixed', unit: 'month' }, { dueDate: D }, { isProject: true });
    expect(stored.anchorKey).toBe('DueDate');
  });
});

describe('repetitionRuleScript: after-completion methods', () => {
  it.each([
    ['start-after-completion', 'DeferDate', 'defer'],
    ['due-after-completion', 'DueDate', 'due'],
  ] as const)('%s writes FromCompletion anchored on %s regardless of dates', (method, key, word) => {
    for (const dates of [{}, { dueDate: D }, { deferDate: D }, { dueDate: D, deferDate: D }]) {
      const { stored, anchor } = runRuleScript({ method, unit: 'month', steps: 3 }, dates);
      expect(stored.schedule).toBe('FromCompletion');
      expect(stored.anchorKey).toBe(key);
      expect(stored.ruleString).toBe('FREQ=MONTHLY;INTERVAL=3');
      expect(anchor).toBe(word);
    }
  });
});

describe('repetitionRuleScript: failing loudly', () => {
  it('throws if OmniFocus stores something other than what was asked', () => {
    expect(() =>
      runRuleScript({ method: 'fixed', unit: 'week' }, { deferDate: D }, {
        tamper: r => { r.ruleString = 'FREQ=DAILY'; },
      })
    ).toThrow(/did not read back as written/);
  });

  it('rejects anchor or catchUp on an after-completion method (they imply their anchor)', () => {
    expect(() =>
      repetitionRuleScript('x', { method: 'start-after-completion', unit: 'week', anchor: 'due' }, { isProject: false })
    ).toThrow(/only apply to method "fixed"/);
    expect(() =>
      repetitionRuleScript('x', { method: 'due-after-completion', unit: 'week', catchUp: true }, { isProject: false })
    ).toThrow(/only apply to method "fixed"/);
  });

  it('rejects a planned anchor on a project', () => {
    expect(() =>
      repetitionRuleScript('x', { method: 'fixed', unit: 'week', anchor: 'planned' }, { isProject: true })
    ).toThrow(/projects/);
  });

  it('propagates spec errors instead of emitting a broken script', () => {
    expect(() => repetitionRuleScript('x', { method: 'fixed', unit: 'week', steps: 0 }, { isProject: false })).toThrow(
      RepetitionSpecError
    );
  });

  it('keeps the embedded JS free of characters that would break the AppleScript string', () => {
    for (const spec of [
      { method: 'fixed', unit: 'week', weekdays: ['MO', 'FR'], anchor: 'planned', catchUp: true },
      { method: 'start-after-completion', unit: 'day', steps: 2 },
    ] as RepetitionSpec[]) {
      const js = repetitionRuleScript('x', spec, { isProject: false })
        .match(/evaluate javascript "(.*)"\)$/m)![1]
        .replace('" & _repetitionId & "', '');
      expect(js).not.toMatch(/["\\]/);
    }
  });

  it('names the version requirement rather than failing obscurely on old OmniFocus', () => {
    expect(repetitionRuleScript('x', { method: 'fixed', unit: 'week' }, { isProject: false })).toContain(
      'requires OmniFocus 4.7 or later'
    );
  });
});

describe('repetitionChangeLabel', () => {
  it('splices the stored anchor into the fixed label at runtime', () => {
    expect(repetitionChangeLabel({ method: 'fixed', unit: 'week' })).toBe(
      '"repetition (fixed, from " & _repetitionAnchor & " date)"'
    );
    expect(repetitionChangeLabel({ method: 'fixed', unit: 'week', catchUp: true })).toContain('catch up');
  });

  it('uses a static label for after-completion methods', () => {
    expect(repetitionChangeLabel({ method: 'start-after-completion', unit: 'week' })).toBe(
      '"repetition (start after completion)"'
    );
  });
});

describe('OMNIJS_METHOD (#116)', () => {
  it('maps each API method to the name query_omnifocus reports back (#115)', () => {
    // The round-trip contract: write through Omni Automation, read back via
    // repetitionMethod. Verified live against OmniFocus.
    expect(OMNIJS_METHOD.fixed).toBe('Fixed');
    expect(OMNIJS_METHOD['start-after-completion']).toBe('DeferUntilDate');
    expect(OMNIJS_METHOD['due-after-completion']).toBe('DueDate');
  });
});

describe('describeRepetition (#116)', () => {
  it('renders a plain-language summary so callers need not decode RRULEs', () => {
    expect(describeRepetition({ method: 'start-after-completion', unit: 'week' })).toBe(
      'every week, starting after completion'
    );
    expect(
      describeRepetition({ method: 'fixed', unit: 'week', steps: 2, weekdays: ['TU', 'TH'] })
    ).toBe('every 2 weeks on TU, TH, on a fixed schedule from the due date (or defer date if none)');
    expect(describeRepetition({ method: 'fixed', unit: 'week', anchor: 'defer' })).toBe(
      'every week, on a fixed schedule from the defer date'
    );
    expect(describeRepetition({ method: 'due-after-completion', unit: 'day', steps: 3 })).toBe(
      'every 3 days, due after completion'
    );
  });
});
