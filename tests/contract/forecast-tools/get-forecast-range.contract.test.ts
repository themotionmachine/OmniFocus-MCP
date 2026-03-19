import { describe, expect, it } from 'vitest';
import {
  GetForecastRangeErrorSchema,
  GetForecastRangeInputSchema,
  GetForecastRangeResponseSchema,
  GetForecastRangeSuccessSchema
} from '../../../src/contracts/forecast-tools/get-forecast-range.js';

// T007: Contract tests for get_forecast_range schemas

describe('GetForecastRangeInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept empty object (all defaults)', () => {
      const result = GetForecastRangeInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept startDate only', () => {
      const result = GetForecastRangeInputSchema.safeParse({ startDate: '2026-03-18' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBe('2026-03-18');
        expect(result.data.endDate).toBeUndefined();
      }
    });

    it('should accept endDate only', () => {
      const result = GetForecastRangeInputSchema.safeParse({ endDate: '2026-03-25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.endDate).toBe('2026-03-25');
        expect(result.data.startDate).toBeUndefined();
      }
    });

    it('should accept both startDate and endDate', () => {
      const result = GetForecastRangeInputSchema.safeParse({
        startDate: '2026-03-18',
        endDate: '2026-03-25'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBe('2026-03-18');
        expect(result.data.endDate).toBe('2026-03-25');
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject non-string startDate', () => {
      const result = GetForecastRangeInputSchema.safeParse({ startDate: 12345 });
      expect(result.success).toBe(false);
    });

    it('should reject non-string endDate', () => {
      const result = GetForecastRangeInputSchema.safeParse({ endDate: true });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetForecastRangeSuccessSchema', () => {
  const validDay = {
    date: '2026-03-18T00:00:00.000Z',
    name: 'Today',
    kind: 'Today',
    badgeCount: 5,
    badgeStatus: 'DueSoon',
    deferredCount: 2
  };

  it('should accept success response with days array', () => {
    const result = GetForecastRangeSuccessSchema.safeParse({
      success: true,
      days: [validDay],
      totalDays: 1,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-18T00:00:00.000Z'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toHaveLength(1);
      expect(result.data.totalDays).toBe(1);
    }
  });

  it('should accept success response with empty days array', () => {
    const result = GetForecastRangeSuccessSchema.safeParse({
      success: true,
      days: [],
      totalDays: 0,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-18T00:00:00.000Z'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toHaveLength(0);
      expect(result.data.totalDays).toBe(0);
    }
  });

  it('should accept success response with multiple days', () => {
    const days = [
      validDay,
      { ...validDay, date: '2026-03-19T00:00:00.000Z', name: 'Thursday', kind: 'Day' }
    ];
    const result = GetForecastRangeSuccessSchema.safeParse({
      success: true,
      days,
      totalDays: 2,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-19T00:00:00.000Z'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toHaveLength(2);
    }
  });

  it('should reject missing totalDays', () => {
    const result = GetForecastRangeSuccessSchema.safeParse({
      success: true,
      days: [],
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-18T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing startDate', () => {
    const result = GetForecastRangeSuccessSchema.safeParse({
      success: true,
      days: [],
      totalDays: 0,
      endDate: '2026-03-18T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing endDate', () => {
    const result = GetForecastRangeSuccessSchema.safeParse({
      success: true,
      days: [],
      totalDays: 0,
      startDate: '2026-03-18T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative totalDays', () => {
    const result = GetForecastRangeSuccessSchema.safeParse({
      success: true,
      days: [],
      totalDays: -1,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-18T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer totalDays', () => {
    const result = GetForecastRangeSuccessSchema.safeParse({
      success: true,
      days: [],
      totalDays: 1.5,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-18T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: false', () => {
    const result = GetForecastRangeSuccessSchema.safeParse({
      success: false,
      days: [],
      totalDays: 0,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-18T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid day in array', () => {
    const result = GetForecastRangeSuccessSchema.safeParse({
      success: true,
      days: [{ date: '2026-03-18T00:00:00.000Z', name: 'Today' }], // Missing fields
      totalDays: 1,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-18T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });
});

describe('GetForecastRangeErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = GetForecastRangeErrorSchema.safeParse({
      success: false,
      error: 'Invalid date format'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response with code', () => {
    const result = GetForecastRangeErrorSchema.safeParse({
      success: false,
      error: 'Start date is after end date',
      code: 'INVALID_RANGE'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('INVALID_RANGE');
    }
  });

  it('should accept all documented error codes', () => {
    const codes = [
      'INVALID_DATE',
      'INVALID_RANGE',
      'RANGE_TOO_LARGE',
      'NO_WINDOW',
      'PERSPECTIVE_SWITCH_FAILED'
    ];
    for (const code of codes) {
      const result = GetForecastRangeErrorSchema.safeParse({
        success: false,
        error: 'Error message',
        code
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept error without code (optional)', () => {
    const result = GetForecastRangeErrorSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBeUndefined();
    }
  });

  it('should reject missing error message', () => {
    const result = GetForecastRangeErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: true', () => {
    const result = GetForecastRangeErrorSchema.safeParse({
      success: true,
      error: 'Should not work'
    });
    expect(result.success).toBe(false);
  });
});

describe('GetForecastRangeResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = GetForecastRangeResponseSchema.safeParse({
      success: true,
      days: [],
      totalDays: 0,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-25T00:00:00.000Z'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = GetForecastRangeResponseSchema.safeParse({
      success: false,
      error: 'Invalid range'
    });
    expect(result.success).toBe(true);
  });

  it('should discriminate between success and error', () => {
    const successResult = GetForecastRangeResponseSchema.parse({
      success: true,
      days: [
        {
          date: '2026-03-18T00:00:00.000Z',
          name: 'Today',
          kind: 'Today',
          badgeCount: 3,
          badgeStatus: 'Available',
          deferredCount: 1
        }
      ],
      totalDays: 1,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-18T00:00:00.000Z'
    });
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.days).toHaveLength(1);
    }

    const errorResult = GetForecastRangeResponseSchema.parse({
      success: false,
      error: 'Start date is after end date',
      code: 'INVALID_RANGE'
    });
    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toBe('Start date is after end date');
    }
  });

  it('should reject success response missing required fields', () => {
    const result = GetForecastRangeResponseSchema.safeParse({
      success: true,
      error: 'Should not work'
    });
    expect(result.success).toBe(false);
  });
});
