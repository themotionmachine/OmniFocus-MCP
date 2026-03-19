/**
 * Integration tests for the Forecast Tools round-trip workflow.
 *
 * These tests require OmniFocus to be running on the test machine.
 * They verify the complete tool chain: get range -> get day -> select days.
 *
 * NOTE: Integration tests are skipped by default (describe.skip).
 * Remove `.skip` to run with a live OmniFocus instance.
 */
import { describe, expect, it } from 'vitest';
import { getForecastDay } from '../../../src/tools/primitives/getForecastDay.js';
import { getForecastRange } from '../../../src/tools/primitives/getForecastRange.js';
import { selectForecastDays } from '../../../src/tools/primitives/selectForecastDays.js';

// Integration tests require a running OmniFocus instance
// Use describe.skip for CI, remove .skip for local integration testing
describe.skip('Forecast Workflow Integration Tests (requires OmniFocus)', () => {
  // SC-001: Weekly forecast overview
  it('should retrieve a weekly forecast overview with default parameters', async () => {
    const result = await getForecastRange({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days.length).toBeGreaterThan(0);
      expect(result.totalDays).toBe(result.days.length);
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();

      // Verify each day has all required fields
      for (const day of result.days) {
        expect(day.date).toBeDefined();
        expect(day.name).toBeDefined();
        expect(['Day', 'Today', 'Past', 'FutureMonth', 'DistantFuture']).toContain(day.kind);
        expect(day.badgeCount).toBeGreaterThanOrEqual(0);
        expect(['Available', 'DueSoon', 'NoneAvailable', 'Overdue']).toContain(day.badgeStatus);
        expect(day.deferredCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // SC-001: Custom date range
  it('should retrieve forecast for a custom date range', async () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const startDate = today.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];

    const result = await getForecastRange({ startDate, endDate });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalDays).toBe(8); // Inclusive: 7 days + 1
      expect(result.days).toHaveLength(8);
    }
  });

  // SC-002: Single date detailed query
  it('should retrieve detailed forecast for today', async () => {
    const result = await getForecastDay({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.day.date).toBeDefined();
      expect(result.day.name).toBeDefined();
      expect(result.day.kind).toBe('Today');
      expect(result.day.badgeCount).toBeGreaterThanOrEqual(0);
      expect(result.day.deferredCount).toBeGreaterThanOrEqual(0);
    }
  });

  // SC-002: Specific future date
  it('should retrieve forecast for a specific future date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const dateStr = futureDate.toISOString().split('T')[0];

    const result = await getForecastDay({ date: dateStr });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.day.date).toBeDefined();
      expect(['Day', 'FutureMonth', 'DistantFuture']).toContain(result.day.kind);
    }
  });

  // SC-003: Navigate Forecast perspective
  it('should navigate Forecast perspective to a single date', async () => {
    const today = new Date().toISOString().split('T')[0];
    const result = await selectForecastDays({ dates: [today] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.selectedDates).toHaveLength(1);
      expect(result.selectedCount).toBe(1);
      expect(result.warning).toContain('Forecast perspective');
    }
  });

  // SC-003: Navigate to multiple dates
  it('should navigate Forecast perspective to multiple dates', async () => {
    const today = new Date();
    const dates = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const result = await selectForecastDays({ dates });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.selectedDates).toHaveLength(3);
      expect(result.selectedCount).toBe(3);
      expect(result.warning).toBeDefined();
    }
  });

  // SC-006: Warning always present on select
  it('should always include warning field in select response', async () => {
    const today = new Date().toISOString().split('T')[0];
    const result = await selectForecastDays({ dates: [today] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.warning).toBeTruthy();
      expect(typeof result.warning).toBe('string');
      expect(result.warning.length).toBeGreaterThan(0);
    }
  });

  // SC-005: Invalid date error handling
  it('should return clear error for invalid startDate', async () => {
    const result = await getForecastRange({ startDate: 'not-a-date' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
      expect(result.error).toBeDefined();
    }
  });

  // SC-005: Range validation
  it('should return error when start is after end', async () => {
    const result = await getForecastRange({
      startDate: '2026-03-25',
      endDate: '2026-03-18'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_RANGE');
    }
  });

  // SC-004: Range query consistency with single-day query
  it('should return consistent data between range and single-day queries', async () => {
    const today = new Date().toISOString().split('T')[0];

    const rangeResult = await getForecastRange({ startDate: today, endDate: today });
    const dayResult = await getForecastDay({ date: today });

    expect(rangeResult.success).toBe(true);
    expect(dayResult.success).toBe(true);

    if (rangeResult.success && dayResult.success) {
      expect(rangeResult.days).toHaveLength(1);
      expect(rangeResult.days[0].name).toBe(dayResult.day.name);
      expect(rangeResult.days[0].kind).toBe(dayResult.day.kind);
      expect(rangeResult.days[0].badgeCount).toBe(dayResult.day.badgeCount);
      expect(rangeResult.days[0].deferredCount).toBe(dayResult.day.deferredCount);
    }
  });
});
