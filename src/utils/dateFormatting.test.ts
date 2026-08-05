import { describe, it, expect } from 'vitest';
import { createDateOutsideTellBlock } from './dateFormatting.js';

describe('createDateOutsideTellBlock', () => {
  it('date-only string uses local calendar day, not UTC', () => {
    // "2026-04-10" should always produce day=10, regardless of timezone
    const script = createDateOutsideTellBlock('2026-04-10', 'testDate');
    expect(script).toContain('set day of testDate to 10');
    expect(script).toContain('set month of testDate to 4');
    expect(script).toContain('set year of testDate to 2026');
  });

  it('date-only string defaults to midnight local time', () => {
    const script = createDateOutsideTellBlock('2026-04-10', 'testDate');
    expect(script).toContain('set hours of testDate to 0');
    expect(script).toContain('set minutes of testDate to 0');
  });

  it('datetime string preserves the specified time', () => {
    const script = createDateOutsideTellBlock('2026-04-10T17:30:00', 'testDate');
    expect(script).toContain('set day of testDate to 10');
    expect(script).toContain('set hours of testDate to 17');
    expect(script).toContain('set minutes of testDate to 30');
  });

  it('throws on invalid date string', () => {
    expect(() => createDateOutsideTellBlock('not-a-date', 'v')).toThrow();
  });

  /**
   * Issue #91: the emitted script scaffolds off `current date`, so the intermediate
   * carries today's day-of-month. Setting the month while that day is out of range
   * for the target month makes AppleScript roll forward a month, and the later
   * `set day` cannot undo it (today=Jul 31, target=Nov 1 produced Dec 1).
   *
   * Verified against live AppleScript: with the day normalized to 1 first, the
   * worst case (today = the 31st) resolves correctly for every target below.
   */
  describe('month-rollover safety (#91)', () => {
    const lines = (iso: string) =>
      createDateOutsideTellBlock(iso, 'v')
        .split('\n')
        .map(l => l.trim());

    it('normalizes the day before touching year or month', () => {
      const l = lines('2026-11-01');
      const dayReset = l.indexOf('set day of v to 1');
      const setYear = l.findIndex(x => x.startsWith('set year of v'));
      const setMonth = l.findIndex(x => x.startsWith('set month of v'));

      expect(dayReset, 'day must be normalized to 1 first').toBeGreaterThanOrEqual(0);
      expect(dayReset).toBeLessThan(setYear);
      expect(dayReset).toBeLessThan(setMonth);
    });

    it('still sets the real day after the month', () => {
      const l = lines('2026-11-17');
      const setMonth = l.findIndex(x => x.startsWith('set month of v'));
      const setDay = l.lastIndexOf('set day of v to 17');
      expect(setDay).toBeGreaterThan(setMonth);
    });

    it('day is assigned exactly twice — the reset and the real value', () => {
      // If a refactor drops the reset, or drops the real assignment, this catches it.
      const dayAssignments = lines('2026-11-01').filter(l => /^set day of v to \d+$/.test(l));
      expect(dayAssignments).toEqual(['set day of v to 1', 'set day of v to 1']);

      const other = lines('2026-02-28').filter(l => /^set day of v to \d+$/.test(l));
      expect(other).toEqual(['set day of v to 1', 'set day of v to 28']);
    });

    it('targets a short month without depending on today', () => {
      // The reported case. Pure string generation, so it holds on any run date —
      // the original bug only reproduced on the 29th-31st, which is exactly why
      // it went unnoticed for so long.
      const script = createDateOutsideTellBlock('2026-11-01', 'v');
      expect(script).toContain('set month of v to 11');
      expect(script.trimEnd().split('\n').map(l => l.trim())).toEqual([
        'copy current date to v',
        'set day of v to 1',
        'set year of v to 2026',
        'set month of v to 11',
        'set day of v to 1',
        'set hours of v to 0',
        'set minutes of v to 0',
        'set seconds of v to 0',
      ]);
    });
  });
});
