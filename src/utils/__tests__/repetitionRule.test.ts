import { describe, it, expect } from 'vitest';
import {
  compileRecurrence,
  repetitionRuleRecord,
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

describe('repetitionRuleRecord (#116)', () => {
  it('builds the AppleScript record with the right method constant', () => {
    expect(repetitionRuleRecord({ method: 'fixed', unit: 'week' })).toBe(
      '{repetition method:fixed repetition, recurrence:"FREQ=WEEKLY"}'
    );
    expect(repetitionRuleRecord({ method: 'start-after-completion', unit: 'day', steps: 3 })).toBe(
      '{repetition method:start after completion, recurrence:"FREQ=DAILY;INTERVAL=3"}'
    );
    expect(repetitionRuleRecord({ method: 'due-after-completion', unit: 'month' })).toBe(
      '{repetition method:due after completion, recurrence:"FREQ=MONTHLY"}'
    );
  });

  it('propagates spec errors instead of emitting a broken record', () => {
    expect(() => repetitionRuleRecord({ method: 'fixed', unit: 'week', steps: 0 })).toThrow(
      RepetitionSpecError
    );
  });

  it('covers every method name with a distinct AppleScript constant', () => {
    const records = (['fixed', 'start-after-completion', 'due-after-completion'] as const).map(m =>
      repetitionRuleRecord({ method: m, unit: 'week' })
    );
    expect(new Set(records).size).toBe(3);
  });
});

describe('OMNIJS_METHOD (#116)', () => {
  it('maps each API method to the name query_omnifocus reports back (#115)', () => {
    // This is the round-trip contract: write via AppleScript constant, read back
    // via repetitionMethod. Verified live against OmniFocus.
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
    ).toBe('every 2 weeks on TU, TH, on a fixed schedule');
    expect(describeRepetition({ method: 'due-after-completion', unit: 'day', steps: 3 })).toBe(
      'every 3 days, due after completion'
    );
  });
});
