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
});
