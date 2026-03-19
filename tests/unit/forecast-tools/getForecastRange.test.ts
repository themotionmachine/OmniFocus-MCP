import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateGetForecastRangeScript,
  getForecastRange
} from '../../../src/tools/primitives/getForecastRange.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T008: Unit tests for getForecastRange primitive

describe('getForecastRange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return forecast days on success', async () => {
    const mockResponse = {
      success: true,
      days: [
        {
          date: '2026-03-18T00:00:00.000Z',
          name: 'Today',
          kind: 'Today',
          badgeCount: 5,
          badgeStatus: 'DueSoon',
          deferredCount: 2
        }
      ],
      totalDays: 1,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-18T00:00:00.000Z'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getForecastRange({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toHaveLength(1);
      expect(result.days[0].name).toBe('Today');
      expect(result.totalDays).toBe(1);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = {
      success: false,
      error: 'No OmniFocus window is open',
      code: 'NO_WINDOW'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getForecastRange({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('No OmniFocus window is open');
      expect(result.code).toBe('NO_WINDOW');
    }
  });

  it('should return INVALID_DATE for unparseable startDate', async () => {
    const result = await getForecastRange({ startDate: 'not-a-date' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
      expect(result.error).toContain('startDate');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for unparseable endDate', async () => {
    const result = await getForecastRange({ endDate: 'garbage' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
      expect(result.error).toContain('endDate');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for startDate month overflow (2026-13-01)', async () => {
    const result = await getForecastRange({ startDate: '2026-13-01' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for startDate day overflow (2026-02-30)', async () => {
    const result = await getForecastRange({ startDate: '2026-02-30' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for startDate month zero (2026-00-10)', async () => {
    const result = await getForecastRange({ startDate: '2026-00-10' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for endDate month overflow (2026-13-01)', async () => {
    const result = await getForecastRange({ endDate: '2026-13-01' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for endDate day overflow (2026-02-30)', async () => {
    const result = await getForecastRange({ endDate: '2026-02-30' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for endDate month zero (2026-00-10)', async () => {
    const result = await getForecastRange({ endDate: '2026-00-10' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_RANGE when startDate is after endDate', async () => {
    const result = await getForecastRange({
      startDate: '2026-03-25',
      endDate: '2026-03-18'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_RANGE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return RANGE_TOO_LARGE when range exceeds 90 days', async () => {
    const result = await getForecastRange({
      startDate: '2026-01-01',
      endDate: '2026-06-01'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('RANGE_TOO_LARGE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should accept exactly 90-day range', async () => {
    const mockResponse = {
      success: true,
      days: [],
      totalDays: 0,
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-03-31T00:00:00.000Z'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    await getForecastRange({
      startDate: '2026-01-01',
      endDate: '2026-03-31'
    });

    expect(executeOmniJS).toHaveBeenCalled();
  });

  it('should call executeOmniJS with generated script', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      days: [],
      totalDays: 0,
      startDate: '2026-03-18T00:00:00.000Z',
      endDate: '2026-03-25T00:00:00.000Z'
    });

    await getForecastRange({ startDate: '2026-03-18', endDate: '2026-03-25' });

    expect(executeOmniJS).toHaveBeenCalledTimes(1);
    expect(typeof vi.mocked(executeOmniJS).mock.calls[0][0]).toBe('string');
  });

  it('should handle null result from executeOmniJS', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue(null);

    const result = await getForecastRange({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe('generateGetForecastRangeScript', () => {
  it('should generate a script string', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should contain IIFE pattern', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('(function()');
    expect(script).toContain('})()');
  });

  it('should contain try-catch for error handling', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('try');
    expect(script).toContain('catch');
  });

  it('should contain Forecast perspective switch', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('Perspective.BuiltIn.Forecast');
  });

  it('should contain NO_WINDOW check', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('NO_WINDOW');
  });

  it('should contain forecastDayForDate call', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('forecastDayForDate');
  });

  it('should contain date parameters', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('2026-03-18');
    expect(script).toContain('2026-03-25');
  });

  it('should contain kindToString helper for all ForecastDay.Kind values', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('kindToString');
    expect(script).toContain('ForecastDay.Kind.Day');
    expect(script).toContain('ForecastDay.Kind.Today');
    expect(script).toContain('ForecastDay.Kind.Past');
    expect(script).toContain('ForecastDay.Kind.FutureMonth');
    expect(script).toContain('ForecastDay.Kind.DistantFuture');
  });

  it('should contain statusToString helper for all ForecastDay.Status values', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('statusToString');
    expect(script).toContain('ForecastDay.Status.Available');
    expect(script).toContain('ForecastDay.Status.DueSoon');
    expect(script).toContain('ForecastDay.Status.NoneAvailable');
    expect(script).toContain('ForecastDay.Status.Overdue');
  });

  it('should contain Calendar date iteration pattern', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('Calendar.current');
    expect(script).toContain('DateComponents');
    expect(script).toContain('dateByAddingDateComponents');
  });

  it('should contain badgeKind() function call (with parentheses)', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('badgeKind()');
  });

  it('should contain structured error in catch block without hardcoded error code', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('catch (e)');
    expect(script).toContain('success: false');
    expect(script).toContain('e.message || String(e)');
  });

  it('should use JSON.stringify for the result', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('JSON.stringify');
  });

  it('should contain startOfDay for midnight normalization', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).toContain('startOfDay');
  });

  it('should NOT contain Timer.once', () => {
    const script = generateGetForecastRangeScript('2026-03-18', '2026-03-25');
    expect(script).not.toContain('Timer.once');
  });
});
