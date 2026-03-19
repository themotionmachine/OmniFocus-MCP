import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateGetForecastDayScript,
  getForecastDay
} from '../../../src/tools/primitives/getForecastDay.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T017: Unit tests for getForecastDay primitive

describe('getForecastDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return forecast day on success', async () => {
    const mockResponse = {
      success: true,
      day: {
        date: '2026-03-20T00:00:00.000Z',
        name: 'Friday',
        kind: 'Day',
        badgeCount: 3,
        badgeStatus: 'Available',
        deferredCount: 1
      }
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getForecastDay({ date: '2026-03-20' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.day.name).toBe('Friday');
      expect(result.day.kind).toBe('Day');
      expect(result.day.badgeCount).toBe(3);
    }
  });

  it('should use today as default when no date provided', async () => {
    const mockResponse = {
      success: true,
      day: {
        date: '2026-03-18T00:00:00.000Z',
        name: 'Today',
        kind: 'Today',
        badgeCount: 5,
        badgeStatus: 'DueSoon',
        deferredCount: 2
      }
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getForecastDay({});

    expect(executeOmniJS).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = {
      success: false,
      error: 'No OmniFocus window is open',
      code: 'NO_WINDOW'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getForecastDay({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('No OmniFocus window is open');
      expect(result.code).toBe('NO_WINDOW');
    }
  });

  it('should return INVALID_DATE for unparseable date', async () => {
    const result = await getForecastDay({ date: 'not-a-date' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
      expect(result.error).toContain('date');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should call executeOmniJS with generated script', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      day: {
        date: '2026-03-20T00:00:00.000Z',
        name: 'Friday',
        kind: 'Day',
        badgeCount: 0,
        badgeStatus: 'NoneAvailable',
        deferredCount: 0
      }
    });

    await getForecastDay({ date: '2026-03-20' });

    expect(executeOmniJS).toHaveBeenCalledTimes(1);
    expect(typeof vi.mocked(executeOmniJS).mock.calls[0][0]).toBe('string');
  });

  it('should handle null result from executeOmniJS', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue(null);

    const result = await getForecastDay({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe('generateGetForecastDayScript', () => {
  it('should generate a script string', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should contain IIFE pattern', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('(function()');
    expect(script).toContain('})()');
  });

  it('should contain try-catch for error handling', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('try');
    expect(script).toContain('catch');
  });

  it('should contain Forecast perspective switch', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('Perspective.BuiltIn.Forecast');
  });

  it('should contain NO_WINDOW check', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('NO_WINDOW');
  });

  it('should contain forecastDayForDate call', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('forecastDayForDate');
  });

  it('should contain date parameter', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('2026-03-20');
  });

  it('should contain kindToString helper for all ForecastDay.Kind values', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('kindToString');
    expect(script).toContain('ForecastDay.Kind.Day');
    expect(script).toContain('ForecastDay.Kind.Today');
    expect(script).toContain('ForecastDay.Kind.Past');
    expect(script).toContain('ForecastDay.Kind.FutureMonth');
    expect(script).toContain('ForecastDay.Kind.DistantFuture');
  });

  it('should contain statusToString helper for all ForecastDay.Status values', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('statusToString');
    expect(script).toContain('ForecastDay.Status.Available');
    expect(script).toContain('ForecastDay.Status.DueSoon');
    expect(script).toContain('ForecastDay.Status.NoneAvailable');
    expect(script).toContain('ForecastDay.Status.Overdue');
  });

  it('should contain badgeKind() function call (with parentheses)', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('badgeKind()');
  });

  it('should contain PERSPECTIVE_SWITCH_FAILED error code in catch', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('PERSPECTIVE_SWITCH_FAILED');
  });

  it('should use JSON.stringify for the result', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('JSON.stringify');
  });

  it('should contain startOfDay for midnight normalization', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).toContain('startOfDay');
  });

  it('should NOT contain Timer.once', () => {
    const script = generateGetForecastDayScript('2026-03-20');
    expect(script).not.toContain('Timer.once');
  });
});
