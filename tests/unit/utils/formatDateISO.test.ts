import { describe, expect, it } from 'vitest';
import { formatDateISO } from '../../../src/utils/formatDateISO.js';

describe('formatDateISO', () => {
  it('should format a standard date as YYYY-MM-DD', () => {
    expect(formatDateISO(new Date(2026, 2, 18))).toBe('2026-03-18');
  });

  it('should zero-pad single-digit months', () => {
    expect(formatDateISO(new Date(2026, 0, 15))).toBe('2026-01-15');
  });

  it('should zero-pad single-digit days', () => {
    expect(formatDateISO(new Date(2026, 11, 5))).toBe('2026-12-05');
  });

  it('should handle January 1 (year boundary)', () => {
    expect(formatDateISO(new Date(2027, 0, 1))).toBe('2027-01-01');
  });

  it('should handle December 31 (year boundary)', () => {
    expect(formatDateISO(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('should handle leap day', () => {
    expect(formatDateISO(new Date(2028, 1, 29))).toBe('2028-02-29');
  });
});
