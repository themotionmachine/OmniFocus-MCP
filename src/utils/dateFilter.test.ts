import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveDateFilter } from './dateFilter.js';

describe('resolveDateFilter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('number passthrough', () => {
    it('passes through 0', () => {
      expect(resolveDateFilter(0)).toBe(0);
    });

    it('passes through positive integers', () => {
      expect(resolveDateFilter(7)).toBe(7);
    });

    it('passes through negative integers', () => {
      expect(resolveDateFilter(-1)).toBe(-1);
    });
  });

  describe('named strings', () => {
    it('resolves "today" to 0', () => {
      expect(resolveDateFilter('today')).toBe(0);
    });

    it('resolves "tomorrow" to 1', () => {
      expect(resolveDateFilter('tomorrow')).toBe(1);
    });

    it('resolves "this week" to 7', () => {
      expect(resolveDateFilter('this week')).toBe(7);
    });

    it('resolves "next week" to 14', () => {
      expect(resolveDateFilter('next week')).toBe(14);
    });

    it('is case-insensitive', () => {
      expect(resolveDateFilter('Today')).toBe(0);
      expect(resolveDateFilter('THIS WEEK')).toBe(7);
      expect(resolveDateFilter('Tomorrow')).toBe(1);
    });
  });

  describe('ISO date strings', () => {
    it('resolves an ISO date to days from now', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-26T12:00:00'));

      expect(resolveDateFilter('2026-03-26')).toBe(0); // today
      expect(resolveDateFilter('2026-03-27')).toBe(1); // tomorrow
      expect(resolveDateFilter('2026-04-02')).toBe(7); // one week
    });

    it('resolves a past ISO date to a negative number', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-26T12:00:00'));

      expect(resolveDateFilter('2026-03-25')).toBe(-1);
    });
  });

  describe('error handling', () => {
    it('throws on unrecognized strings', () => {
      expect(() => resolveDateFilter('next month')).toThrow();
    });

    it('throws on empty string', () => {
      expect(() => resolveDateFilter('')).toThrow();
    });

    it('throws on invalid date format', () => {
      expect(() => resolveDateFilter('not-a-date')).toThrow();
    });
  });
});
