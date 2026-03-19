import { describe, expect, it } from 'vitest';
import {
  ForecastDayKindSchema,
  ForecastDayOutputSchema,
  ForecastDayStatusSchema
} from '../../../src/contracts/forecast-tools/shared/index.js';

// T004: Contract tests for shared forecast schemas

describe('ForecastDayKindSchema', () => {
  it('should accept all 5 valid kind values', () => {
    const validKinds = ['Day', 'Today', 'Past', 'FutureMonth', 'DistantFuture'];
    for (const kind of validKinds) {
      const result = ForecastDayKindSchema.safeParse(kind);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid kind values', () => {
    const invalidKinds = ['day', 'TODAY', 'past', 'future', 'Unknown', '', 123, null];
    for (const kind of invalidKinds) {
      const result = ForecastDayKindSchema.safeParse(kind);
      expect(result.success).toBe(false);
    }
  });

  it('should have exactly 5 enum values', () => {
    expect(ForecastDayKindSchema.options).toHaveLength(5);
  });
});

describe('ForecastDayStatusSchema', () => {
  it('should accept all 4 valid status values', () => {
    const validStatuses = ['Available', 'DueSoon', 'NoneAvailable', 'Overdue'];
    for (const status of validStatuses) {
      const result = ForecastDayStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid status values', () => {
    const invalidStatuses = ['available', 'DUE_SOON', 'none', 'overdue', '', 0, null];
    for (const status of invalidStatuses) {
      const result = ForecastDayStatusSchema.safeParse(status);
      expect(result.success).toBe(false);
    }
  });

  it('should have exactly 4 enum values', () => {
    expect(ForecastDayStatusSchema.options).toHaveLength(4);
  });
});

describe('ForecastDayOutputSchema', () => {
  const validDay = {
    date: '2026-03-18T00:00:00.000Z',
    name: 'Today',
    kind: 'Today',
    badgeCount: 5,
    badgeStatus: 'DueSoon',
    deferredCount: 2
  };

  it('should accept a valid complete forecast day', () => {
    const result = ForecastDayOutputSchema.safeParse(validDay);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBe('2026-03-18T00:00:00.000Z');
      expect(result.data.name).toBe('Today');
      expect(result.data.kind).toBe('Today');
      expect(result.data.badgeCount).toBe(5);
      expect(result.data.badgeStatus).toBe('DueSoon');
      expect(result.data.deferredCount).toBe(2);
    }
  });

  it('should accept a day with zero counts', () => {
    const result = ForecastDayOutputSchema.safeParse({
      ...validDay,
      badgeCount: 0,
      deferredCount: 0,
      badgeStatus: 'NoneAvailable'
    });
    expect(result.success).toBe(true);
  });

  it('should accept all valid kind values in the day output', () => {
    const kinds = ['Day', 'Today', 'Past', 'FutureMonth', 'DistantFuture'];
    for (const kind of kinds) {
      const result = ForecastDayOutputSchema.safeParse({ ...validDay, kind });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid badgeStatus values in the day output', () => {
    const statuses = ['Available', 'DueSoon', 'NoneAvailable', 'Overdue'];
    for (const badgeStatus of statuses) {
      const result = ForecastDayOutputSchema.safeParse({ ...validDay, badgeStatus });
      expect(result.success).toBe(true);
    }
  });

  it('should reject missing required fields', () => {
    const requiredFields = ['date', 'name', 'kind', 'badgeCount', 'badgeStatus', 'deferredCount'];
    for (const field of requiredFields) {
      const incomplete = { ...validDay };
      delete (incomplete as Record<string, unknown>)[field];
      const result = ForecastDayOutputSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    }
  });

  it('should reject invalid kind value in day output', () => {
    const result = ForecastDayOutputSchema.safeParse({ ...validDay, kind: 'InvalidKind' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid badgeStatus value in day output', () => {
    const result = ForecastDayOutputSchema.safeParse({ ...validDay, badgeStatus: 'Invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject negative badgeCount', () => {
    const result = ForecastDayOutputSchema.safeParse({ ...validDay, badgeCount: -1 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer badgeCount', () => {
    const result = ForecastDayOutputSchema.safeParse({ ...validDay, badgeCount: 1.5 });
    expect(result.success).toBe(false);
  });

  it('should reject negative deferredCount', () => {
    const result = ForecastDayOutputSchema.safeParse({ ...validDay, deferredCount: -1 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer deferredCount', () => {
    const result = ForecastDayOutputSchema.safeParse({ ...validDay, deferredCount: 2.5 });
    expect(result.success).toBe(false);
  });

  it('should reject non-string date', () => {
    const result = ForecastDayOutputSchema.safeParse({ ...validDay, date: 12345 });
    expect(result.success).toBe(false);
  });

  it('should reject non-string name', () => {
    const result = ForecastDayOutputSchema.safeParse({ ...validDay, name: 42 });
    expect(result.success).toBe(false);
  });
});
