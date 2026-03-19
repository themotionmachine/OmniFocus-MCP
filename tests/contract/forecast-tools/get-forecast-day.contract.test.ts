import { describe, expect, it } from 'vitest';
import {
  GetForecastDayErrorSchema,
  GetForecastDayInputSchema,
  GetForecastDayResponseSchema,
  GetForecastDaySuccessSchema
} from '../../../src/contracts/forecast-tools/get-forecast-day.js';

// T016: Contract tests for get_forecast_day schemas

describe('GetForecastDayInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept empty object (default: today)', () => {
      const result = GetForecastDayInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept date string', () => {
      const result = GetForecastDayInputSchema.safeParse({ date: '2026-03-20' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe('2026-03-20');
      }
    });

    it('should accept date as undefined (optional)', () => {
      const result = GetForecastDayInputSchema.safeParse({ date: undefined });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBeUndefined();
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject non-string date', () => {
      const result = GetForecastDayInputSchema.safeParse({ date: 12345 });
      expect(result.success).toBe(false);
    });

    it('should reject boolean date', () => {
      const result = GetForecastDayInputSchema.safeParse({ date: true });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetForecastDaySuccessSchema', () => {
  const validDay = {
    date: '2026-03-20T00:00:00.000Z',
    name: 'Friday',
    kind: 'Day',
    badgeCount: 3,
    badgeStatus: 'Available',
    deferredCount: 1
  };

  it('should accept success response with day', () => {
    const result = GetForecastDaySuccessSchema.safeParse({
      success: true,
      day: validDay
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.day.date).toBe('2026-03-20T00:00:00.000Z');
      expect(result.data.day.name).toBe('Friday');
      expect(result.data.day.kind).toBe('Day');
      expect(result.data.day.badgeCount).toBe(3);
      expect(result.data.day.badgeStatus).toBe('Available');
      expect(result.data.day.deferredCount).toBe(1);
    }
  });

  it('should accept day with Today kind', () => {
    const result = GetForecastDaySuccessSchema.safeParse({
      success: true,
      day: { ...validDay, kind: 'Today', name: 'Today' }
    });
    expect(result.success).toBe(true);
  });

  it('should accept day with zero counts', () => {
    const result = GetForecastDaySuccessSchema.safeParse({
      success: true,
      day: { ...validDay, badgeCount: 0, deferredCount: 0, badgeStatus: 'NoneAvailable' }
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing day field', () => {
    const result = GetForecastDaySuccessSchema.safeParse({
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: false', () => {
    const result = GetForecastDaySuccessSchema.safeParse({
      success: false,
      day: validDay
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid day data', () => {
    const result = GetForecastDaySuccessSchema.safeParse({
      success: true,
      day: { date: '2026-03-20T00:00:00.000Z', name: 'Friday' } // missing fields
    });
    expect(result.success).toBe(false);
  });
});

describe('GetForecastDayErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = GetForecastDayErrorSchema.safeParse({
      success: false,
      error: 'Invalid date format'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response with code', () => {
    const result = GetForecastDayErrorSchema.safeParse({
      success: false,
      error: 'Invalid date',
      code: 'INVALID_DATE'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('INVALID_DATE');
    }
  });

  it('should accept all documented error codes', () => {
    const codes = ['INVALID_DATE', 'NO_WINDOW', 'PERSPECTIVE_SWITCH_FAILED'];
    for (const code of codes) {
      const result = GetForecastDayErrorSchema.safeParse({
        success: false,
        error: 'Error message',
        code
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept error without code (optional)', () => {
    const result = GetForecastDayErrorSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBeUndefined();
    }
  });

  it('should reject missing error message', () => {
    const result = GetForecastDayErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: true', () => {
    const result = GetForecastDayErrorSchema.safeParse({
      success: true,
      error: 'Should not work'
    });
    expect(result.success).toBe(false);
  });
});

describe('GetForecastDayResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = GetForecastDayResponseSchema.safeParse({
      success: true,
      day: {
        date: '2026-03-20T00:00:00.000Z',
        name: 'Friday',
        kind: 'Day',
        badgeCount: 3,
        badgeStatus: 'Available',
        deferredCount: 1
      }
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = GetForecastDayResponseSchema.safeParse({
      success: false,
      error: 'Invalid date'
    });
    expect(result.success).toBe(true);
  });

  it('should discriminate between success and error', () => {
    const successResult = GetForecastDayResponseSchema.parse({
      success: true,
      day: {
        date: '2026-03-20T00:00:00.000Z',
        name: 'Friday',
        kind: 'Day',
        badgeCount: 3,
        badgeStatus: 'Available',
        deferredCount: 1
      }
    });
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.day.name).toBe('Friday');
    }

    const errorResult = GetForecastDayResponseSchema.parse({
      success: false,
      error: 'Invalid date format',
      code: 'INVALID_DATE'
    });
    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toBe('Invalid date format');
    }
  });

  it('should reject success response missing day', () => {
    const result = GetForecastDayResponseSchema.safeParse({
      success: true,
      error: 'Should not work'
    });
    expect(result.success).toBe(false);
  });
});
