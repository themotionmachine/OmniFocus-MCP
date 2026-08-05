import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { formatDateLocal, localDatePart, JXA_FORMAT_DATE_SOURCE } from './dateSerialization.js';

/**
 * Regression suite for issue #91 (the read half).
 *
 * The bug that shipped: every date was serialized with `toISOString()`, so in any
 * timezone ahead of UTC a local-midnight defer date rendered as the previous
 * calendar day. It was structurally invisible to anyone developing behind UTC,
 * which is why no existing test caught it — so these tests assert the property
 * that actually matters (local calendar day survives) rather than a fixed string,
 * and the JXA half is *executed*, not pattern-matched.
 */

describe('formatDateLocal', () => {
  it('preserves the local calendar day for local midnight', () => {
    // The exact shape of the reported failure: midnight on the 1st must not
    // render as the last day of the previous month.
    const d = new Date(2026, 9, 1, 0, 0, 0); // Oct 1 local, whatever the host TZ
    expect(formatDateLocal(d)!.slice(0, 10)).toBe('2026-10-01');
  });

  it('round-trips back to the identical instant', () => {
    // The offset suffix means switching away from UTC output loses no information.
    for (const d of [
      new Date(2026, 0, 1, 0, 0, 0),
      new Date(2026, 6, 15, 13, 45, 30),
      new Date(2026, 11, 31, 23, 59, 59),
    ]) {
      expect(new Date(formatDateLocal(d)!).getTime()).toBe(d.getTime());
    }
  });

  it('emits a well-formed ISO 8601 offset, zero-padded', () => {
    const s = formatDateLocal(new Date(2026, 2, 4, 5, 6, 7))!;
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(s.slice(0, 19)).toBe('2026-03-04T05:06:07');
  });

  it('returns null for absent dates rather than throwing', () => {
    expect(formatDateLocal(null)).toBeNull();
    expect(formatDateLocal(undefined)).toBeNull();
  });
});

describe('localDatePart', () => {
  it('never round-trips through UTC', () => {
    // This is the second half of the bug: the human-readable formatter did
    // `new Date(s).toISOString().slice(0,10)`, which re-broke a correct input.
    expect(localDatePart('2026-10-01T00:00:00+01:00')).toBe('2026-10-01');
    expect(localDatePart('2026-10-01T00:00:00+13:00')).toBe('2026-10-01');
    expect(localDatePart('2026-10-01T23:30:00-08:00')).toBe('2026-10-01');
  });

  it('leaves a UTC-suffixed instant on its own stated date', () => {
    expect(localDatePart('2026-09-30T23:00:00.000Z')).toBe('2026-09-30');
  });

  it('passes through unparseable input instead of emitting Invalid Date', () => {
    expect(localDatePart('not a date')).toBe('not a date');
  });
});

describe('JXA_FORMAT_DATE_SOURCE', () => {
  // Asserting the source merely *contains* something is the trap that let three
  // silent-empty query bugs through in #71 ("a filter that emits code is not a
  // filter that works"). So evaluate it and check behavior.
  const evalPrelude = (): ((d: Date | null) => string | null) => {
    // eslint-disable-next-line no-new-func -- deliberately exercising the shipped text
    return new Function(`${JXA_FORMAT_DATE_SOURCE}\nreturn formatDate;`)();
  };

  it('evaluates to a working function under the name the payloads call', () => {
    const formatDate = evalPrelude();
    expect(typeof formatDate).toBe('function');
    expect(formatDate(null)).toBeNull();
  });

  it('behaves identically to the TypeScript implementation', () => {
    // If someone edits formatDateLocal to reference an import or module-scope
    // value, `toString()` still produces text but the injected copy breaks at
    // runtime inside OmniFocus. This catches that class of change.
    const formatDate = evalPrelude();
    for (const d of [
      new Date(2026, 9, 1, 0, 0, 0),
      new Date(2026, 0, 31, 23, 59, 59),
      new Date(2026, 5, 15, 12, 0, 0),
    ]) {
      expect(formatDate(d)).toBe(formatDateLocal(d));
    }
  });

  it('binds the bare name formatDate exactly once, so payloads can rely on it', () => {
    // \b excludes the inner `formatDateLocal` occurrence the stringified function
    // body carries — only the standalone binding should match.
    expect(JXA_FORMAT_DATE_SOURCE.match(/\bformatDate\b/g)?.length).toBe(1);
    expect(JXA_FORMAT_DATE_SOURCE).toMatch(/^const formatDate = /);
  });
});

describe('JXA payloads do not redeclare formatDate', () => {
  // The executor prepends the prelude to every payload. A `function formatDate`
  // in a payload would be a redeclaration SyntaxError against the prelude's
  // `const`, breaking that tool at runtime with no compile-time warning.
  const dir = join(__dirname, 'omnifocusScripts');

  for (const file of readdirSync(dir).filter(f => f.endsWith('.js'))) {
    it(`${file} relies on the prelude`, () => {
      const src = readFileSync(join(dir, file), 'utf8');
      expect(src, `${file} must not declare its own formatDate`).not.toMatch(
        /^\s*(function\s+formatDate|(const|let|var)\s+formatDate)\b/m
      );
    });
  }
});
