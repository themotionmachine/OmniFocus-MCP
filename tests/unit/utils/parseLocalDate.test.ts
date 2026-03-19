import { describe, expect, it } from 'vitest';
import { parseLocalDate } from '../../../src/utils/parseLocalDate.js';

describe('parseLocalDate', () => {
  describe('valid dates', () => {
    it('should parse a standard date', () => {
      const result = parseLocalDate('2026-03-18');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.date.getFullYear()).toBe(2026);
        expect(result.date.getMonth()).toBe(2);
        expect(result.date.getDate()).toBe(18);
      }
    });

    it('should parse January 1 (year boundary)', () => {
      const result = parseLocalDate('2027-01-01');
      expect(result.valid).toBe(true);
    });

    it('should parse December 31 (year boundary)', () => {
      const result = parseLocalDate('2026-12-31');
      expect(result.valid).toBe(true);
    });

    it('should parse leap day', () => {
      const result = parseLocalDate('2028-02-29');
      expect(result.valid).toBe(true);
    });
  });

  describe('overflow dates (round-trip detection)', () => {
    it('should reject Feb 30 (month overflow)', () => {
      expect(parseLocalDate('2026-02-30').valid).toBe(false);
    });

    it('should reject Feb 29 in non-leap year', () => {
      expect(parseLocalDate('2026-02-29').valid).toBe(false);
    });

    it('should reject month 13 (month overflow)', () => {
      expect(parseLocalDate('2026-13-01').valid).toBe(false);
    });

    it('should reject month 00', () => {
      expect(parseLocalDate('2026-00-10').valid).toBe(false);
    });

    it('should reject day 00', () => {
      expect(parseLocalDate('2026-03-00').valid).toBe(false);
    });

    it('should reject day 32', () => {
      expect(parseLocalDate('2026-01-32').valid).toBe(false);
    });

    it('should reject Apr 31 (30-day month overflow)', () => {
      expect(parseLocalDate('2026-04-31').valid).toBe(false);
    });
  });

  describe('format validation', () => {
    it('should reject non-date strings', () => {
      expect(parseLocalDate('not-a-date').valid).toBe(false);
    });

    it('should reject empty string', () => {
      expect(parseLocalDate('').valid).toBe(false);
    });

    it('should reject full ISO datetime', () => {
      expect(parseLocalDate('2026-03-18T00:00:00.000Z').valid).toBe(false);
    });

    it('should reject single-digit month', () => {
      expect(parseLocalDate('2026-3-18').valid).toBe(false);
    });

    it('should reject single-digit day', () => {
      expect(parseLocalDate('2026-03-8').valid).toBe(false);
    });

    it('should reject slash-separated date', () => {
      expect(parseLocalDate('2026/03/18').valid).toBe(false);
    });

    it('should reject date with spaces', () => {
      expect(parseLocalDate(' 2026-03-18 ').valid).toBe(false);
    });
  });
});
