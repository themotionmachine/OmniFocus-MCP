import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateSelectForecastDaysScript,
  selectForecastDays
} from '../../../src/tools/primitives/selectForecastDays.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T026: Unit tests for selectForecastDays primitive

describe('selectForecastDays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success with selected dates and warning', async () => {
    const mockResponse = {
      success: true,
      selectedDates: ['2026-03-18T00:00:00.000Z'],
      selectedCount: 1,
      warning:
        'This operation changed the visible Forecast perspective in OmniFocus to show the selected dates. The user may notice the view has changed.'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await selectForecastDays({ dates: ['2026-03-18'] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.selectedDates).toHaveLength(1);
      expect(result.selectedCount).toBe(1);
      expect(result.warning).toContain('Forecast perspective');
    }
  });

  it('should handle multiple dates', async () => {
    const mockResponse = {
      success: true,
      selectedDates: [
        '2026-03-18T00:00:00.000Z',
        '2026-03-19T00:00:00.000Z',
        '2026-03-20T00:00:00.000Z'
      ],
      selectedCount: 3,
      warning: 'UI state changed'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await selectForecastDays({
      dates: ['2026-03-18', '2026-03-19', '2026-03-20']
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.selectedDates).toHaveLength(3);
      expect(result.selectedCount).toBe(3);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = {
      success: false,
      error: 'No OmniFocus window is open',
      code: 'NO_WINDOW'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await selectForecastDays({ dates: ['2026-03-18'] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('No OmniFocus window is open');
      expect(result.code).toBe('NO_WINDOW');
    }
  });

  it('should return INVALID_DATE for unparseable date in array', async () => {
    const result = await selectForecastDays({ dates: ['not-a-date'] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for mixed valid and invalid dates', async () => {
    const result = await selectForecastDays({ dates: ['2026-03-18', 'garbage'] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for month overflow (2026-13-01)', async () => {
    const result = await selectForecastDays({ dates: ['2026-13-01'] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for day overflow (2026-02-30)', async () => {
    const result = await selectForecastDays({ dates: ['2026-02-30'] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should return INVALID_DATE for month zero (2026-00-10)', async () => {
    const result = await selectForecastDays({ dates: ['2026-00-10'] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should call executeOmniJS with generated script', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      selectedDates: ['2026-03-18T00:00:00.000Z'],
      selectedCount: 1,
      warning: 'UI state changed'
    });

    await selectForecastDays({ dates: ['2026-03-18'] });

    expect(executeOmniJS).toHaveBeenCalledTimes(1);
    expect(typeof vi.mocked(executeOmniJS).mock.calls[0][0]).toBe('string');
  });

  it('should handle null result from executeOmniJS', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue(null);

    const result = await selectForecastDays({ dates: ['2026-03-18'] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe('generateSelectForecastDaysScript', () => {
  it('should generate a script string', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should contain IIFE pattern', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(script).toContain('(function()');
    expect(script).toContain('})()');
  });

  it('should contain try-catch for error handling', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(script).toContain('try');
    expect(script).toContain('catch');
  });

  it('should contain Forecast perspective switch', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(script).toContain('Perspective.BuiltIn.Forecast');
  });

  it('should contain NO_WINDOW check', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(script).toContain('NO_WINDOW');
  });

  it('should contain selectForecastDays call', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(script).toContain('selectForecastDays');
  });

  it('should contain forecastDayForDate call', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(script).toContain('forecastDayForDate');
  });

  it('should contain date parameters', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18', '2026-03-19']);
    expect(script).toContain('2026-03-18');
    expect(script).toContain('2026-03-19');
  });

  it('should contain structured error in catch block without hardcoded error code', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(script).toContain('catch (e)');
    expect(script).toContain('success: false');
    expect(script).toContain('e.message || String(e)');
  });

  it('should use JSON.stringify for the result', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(script).toContain('JSON.stringify');
  });

  it('should contain warning text about UI state change', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(script).toContain('Forecast perspective');
    expect(script).toContain('warning');
  });

  it('should NOT contain Timer.once', () => {
    const script = generateSelectForecastDaysScript(['2026-03-18']);
    expect(script).not.toContain('Timer.once');
  });
});
