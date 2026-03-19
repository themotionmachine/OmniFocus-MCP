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
import { SelectForecastDaysInputSchema } from '../../../src/contracts/forecast-tools/select-forecast-days.js';
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

  // US1-AS3: Start date only — should default endDate to startDate + 7 days (inclusive = 8 days)
  it('should default to 7 days from startDate when only startDate is provided', async () => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];

    const result = await getForecastRange({ startDate });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalDays).toBe(8); // Inclusive: startDate + 7 days = 8 total days
      expect(result.days).toHaveLength(8);
    }
  });

  // US1-AS4: Today kind in range — the entry for today must have kind "Today"
  it('should mark today with kind "Today" and other days with kind "Day" or similar', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startDate = yesterday.toISOString().split('T')[0];
    const endDate = tomorrow.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const result = await getForecastRange({ startDate, endDate });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days).toHaveLength(3);
      const todayEntry = result.days.find((d) => d.date.startsWith(todayStr));
      expect(todayEntry).toBeDefined();
      if (todayEntry) {
        expect(todayEntry.kind).toBe('Today');
      }
      // Other days should not be "Today"
      const otherDays = result.days.filter((d) => !d.date.startsWith(todayStr));
      for (const day of otherDays) {
        expect(day.kind).not.toBe('Today');
      }
    }
  });

  // US1-AS5: Past date range — past days should still be queryable and return results
  it('should return results for a range entirely in the past', async () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = threeDaysAgo.toISOString().split('T')[0];

    const result = await getForecastRange({ startDate, endDate });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.days.length).toBeGreaterThan(0);
      expect(result.totalDays).toBe(result.days.length);
      // Past days should have kind "Past" or similar classification
      for (const day of result.days) {
        expect(['Day', 'Today', 'Past', 'FutureMonth', 'DistantFuture']).toContain(day.kind);
      }
    }
  });

  // US1-AS6: Empty days — days with zero items must still appear with badgeCount 0 and deferredCount 0
  it('should include days with zero items (badgeCount: 0, deferredCount: 0)', async () => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 6);
    const endDateStr = endDate.toISOString().split('T')[0];

    const result = await getForecastRange({ startDate, endDate: endDateStr });

    expect(result.success).toBe(true);
    if (result.success) {
      // All 7 days must be present — none should be omitted even if empty
      expect(result.days).toHaveLength(7);
      for (const day of result.days) {
        expect(day.badgeCount).toBeGreaterThanOrEqual(0);
        expect(day.deferredCount).toBeGreaterThanOrEqual(0);
        // Every day must be present in the array regardless of item count
        expect(day.date).toBeDefined();
      }
    }
  });

  // US2-AS3: Overdue badge status invariant — if badgeStatus is "Overdue" then badgeCount > 0
  it('should have badgeCount > 0 whenever badgeStatus is "Overdue"', async () => {
    const result = await getForecastDay({});

    expect(result.success).toBe(true);
    if (result.success) {
      if (result.day.badgeStatus === 'Overdue') {
        expect(result.day.badgeCount).toBeGreaterThan(0);
      }
      // Verify badge status is always a valid value
      expect(['Available', 'DueSoon', 'NoneAvailable', 'Overdue']).toContain(
        result.day.badgeStatus
      );
    }
  });

  // US3-AS5: Far future navigation — navigate to a date 60 days in the future (no artificial range limit)
  it('should navigate to a date 60 days in the future without error', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    const dateStr = futureDate.toISOString().split('T')[0];

    const result = await selectForecastDays({ dates: [dateStr] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.selectedDates).toHaveLength(1);
      expect(result.selectedCount).toBe(1);
      expect(result.warning).toBeDefined();
    }
  });

  // Edge case: Empty dates list — Zod schema validation should reject an empty array
  it('should fail schema validation when dates array is empty', () => {
    const parseResult = SelectForecastDaysInputSchema.safeParse({ dates: [] });

    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      // Zod .min(1) produces a "too_small" issue
      expect(parseResult.error.issues.length).toBeGreaterThan(0);
    }
  });

  // Edge case: Range too large — getForecastRange with range > 90 days should return RANGE_TOO_LARGE
  it('should return RANGE_TOO_LARGE error when range exceeds 90 days', async () => {
    const startDate = '2026-01-01';
    const endDate = '2026-04-15'; // 104 days later

    const result = await getForecastRange({ startDate, endDate });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('RANGE_TOO_LARGE');
      expect(result.error).toBeDefined();
    }
  });

  // Edge case: get_forecast_day invalid date — should return INVALID_DATE
  it('should return INVALID_DATE error for a non-date string in getForecastDay', async () => {
    const result = await getForecastDay({ date: 'not-a-date' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
      expect(result.error).toBeDefined();
    }
  });

  // Edge case: select_forecast_days invalid date — should return INVALID_DATE
  it('should return INVALID_DATE error for an invalid date string in selectForecastDays', async () => {
    const result = await selectForecastDays({ dates: ['invalid'] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DATE');
      expect(result.error).toBeDefined();
    }
  });
});
