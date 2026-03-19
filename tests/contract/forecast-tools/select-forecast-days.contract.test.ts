import { describe, expect, it } from 'vitest';
import {
  SelectForecastDaysErrorSchema,
  SelectForecastDaysInputSchema,
  SelectForecastDaysResponseSchema,
  SelectForecastDaysSuccessSchema
} from '../../../src/contracts/forecast-tools/select-forecast-days.js';

// T025: Contract tests for select_forecast_days schemas

describe('SelectForecastDaysInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept single date', () => {
      const result = SelectForecastDaysInputSchema.safeParse({
        dates: ['2026-03-18']
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dates).toHaveLength(1);
      }
    });

    it('should accept multiple dates', () => {
      const result = SelectForecastDaysInputSchema.safeParse({
        dates: ['2026-03-18', '2026-03-19', '2026-03-20']
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dates).toHaveLength(3);
      }
    });

    it('should accept exactly 90 dates (max boundary)', () => {
      const dates = Array.from({ length: 90 }, (_, i) => {
        const d = new Date(2026, 0, 1 + i);
        return d.toISOString().split('T')[0];
      });
      const result = SelectForecastDaysInputSchema.safeParse({ dates });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dates).toHaveLength(90);
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty dates array', () => {
      const result = SelectForecastDaysInputSchema.safeParse({ dates: [] });
      expect(result.success).toBe(false);
    });

    it('should reject more than 90 dates', () => {
      const dates = Array.from({ length: 91 }, (_, i) => {
        const d = new Date(2026, 0, 1 + i);
        return d.toISOString().split('T')[0];
      });
      const result = SelectForecastDaysInputSchema.safeParse({ dates });
      expect(result.success).toBe(false);
    });

    it('should reject missing dates field', () => {
      const result = SelectForecastDaysInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string date in array', () => {
      const result = SelectForecastDaysInputSchema.safeParse({ dates: [12345] });
      expect(result.success).toBe(false);
    });

    it('should reject non-array dates', () => {
      const result = SelectForecastDaysInputSchema.safeParse({ dates: '2026-03-18' });
      expect(result.success).toBe(false);
    });
  });
});

describe('SelectForecastDaysSuccessSchema', () => {
  it('should accept success response with warning', () => {
    const result = SelectForecastDaysSuccessSchema.safeParse({
      success: true,
      selectedDates: ['2026-03-18T00:00:00.000Z'],
      selectedCount: 1,
      warning:
        'This operation changed the visible Forecast perspective in OmniFocus to show the selected dates. The user may notice the view has changed.'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.selectedDates).toHaveLength(1);
      expect(result.data.selectedCount).toBe(1);
      expect(result.data.warning).toBeTruthy();
    }
  });

  it('should accept success response with multiple dates', () => {
    const result = SelectForecastDaysSuccessSchema.safeParse({
      success: true,
      selectedDates: [
        '2026-03-18T00:00:00.000Z',
        '2026-03-19T00:00:00.000Z',
        '2026-03-20T00:00:00.000Z'
      ],
      selectedCount: 3,
      warning: 'UI state changed'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.selectedDates).toHaveLength(3);
      expect(result.data.selectedCount).toBe(3);
    }
  });

  it('should reject missing warning field', () => {
    const result = SelectForecastDaysSuccessSchema.safeParse({
      success: true,
      selectedDates: ['2026-03-18T00:00:00.000Z'],
      selectedCount: 1
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing selectedCount', () => {
    const result = SelectForecastDaysSuccessSchema.safeParse({
      success: true,
      selectedDates: ['2026-03-18T00:00:00.000Z'],
      warning: 'UI state changed'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing selectedDates', () => {
    const result = SelectForecastDaysSuccessSchema.safeParse({
      success: true,
      selectedCount: 1,
      warning: 'UI state changed'
    });
    expect(result.success).toBe(false);
  });

  it('should reject selectedCount less than 1', () => {
    const result = SelectForecastDaysSuccessSchema.safeParse({
      success: true,
      selectedDates: [],
      selectedCount: 0,
      warning: 'UI state changed'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: false', () => {
    const result = SelectForecastDaysSuccessSchema.safeParse({
      success: false,
      selectedDates: ['2026-03-18T00:00:00.000Z'],
      selectedCount: 1,
      warning: 'UI state changed'
    });
    expect(result.success).toBe(false);
  });
});

describe('SelectForecastDaysErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = SelectForecastDaysErrorSchema.safeParse({
      success: false,
      error: 'Invalid date'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response with code', () => {
    const result = SelectForecastDaysErrorSchema.safeParse({
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
    const codes = ['INVALID_DATE', 'NO_WINDOW', 'PERSPECTIVE_SWITCH_FAILED', 'EMPTY_DATES'];
    for (const code of codes) {
      const result = SelectForecastDaysErrorSchema.safeParse({
        success: false,
        error: 'Error message',
        code
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept error without code (optional)', () => {
    const result = SelectForecastDaysErrorSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBeUndefined();
    }
  });

  it('should reject missing error message', () => {
    const result = SelectForecastDaysErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: true', () => {
    const result = SelectForecastDaysErrorSchema.safeParse({
      success: true,
      error: 'Should not work'
    });
    expect(result.success).toBe(false);
  });
});

describe('SelectForecastDaysResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = SelectForecastDaysResponseSchema.safeParse({
      success: true,
      selectedDates: ['2026-03-18T00:00:00.000Z'],
      selectedCount: 1,
      warning: 'UI state changed'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = SelectForecastDaysResponseSchema.safeParse({
      success: false,
      error: 'No window'
    });
    expect(result.success).toBe(true);
  });

  it('should discriminate between success and error', () => {
    const successResult = SelectForecastDaysResponseSchema.parse({
      success: true,
      selectedDates: ['2026-03-18T00:00:00.000Z', '2026-03-19T00:00:00.000Z'],
      selectedCount: 2,
      warning:
        'This operation changed the visible Forecast perspective in OmniFocus to show the selected dates. The user may notice the view has changed.'
    });
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.selectedDates).toHaveLength(2);
      expect(successResult.warning).toContain('Forecast perspective');
    }

    const errorResult = SelectForecastDaysResponseSchema.parse({
      success: false,
      error: 'Invalid date format',
      code: 'INVALID_DATE'
    });
    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toBe('Invalid date format');
    }
  });

  it('should reject success response missing warning', () => {
    const result = SelectForecastDaysResponseSchema.safeParse({
      success: true,
      selectedDates: ['2026-03-18T00:00:00.000Z'],
      selectedCount: 1
    });
    expect(result.success).toBe(false);
  });
});
