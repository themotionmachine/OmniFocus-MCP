import { describe, expect, it } from 'vitest';
import {
  SetCommonRepetitionErrorSchema,
  SetCommonRepetitionInputSchema,
  SetCommonRepetitionResponseSchema,
  SetCommonRepetitionSuccessSchema
} from '../../../src/contracts/repetition-tools/set-common-repetition.js';

describe('SetCommonRepetitionInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept id and preset: daily', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'daily'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('task-abc');
        expect(result.data.preset).toBe('daily');
      }
    });

    it('should accept preset: weekdays', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'weekdays'
      });
      expect(result.success).toBe(true);
    });

    it('should accept preset: weekly', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'weekly'
      });
      expect(result.success).toBe(true);
    });

    it('should accept preset: biweekly', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'biweekly'
      });
      expect(result.success).toBe(true);
    });

    it('should accept preset: monthly', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'monthly'
      });
      expect(result.success).toBe(true);
    });

    it('should accept preset: monthly_last_day', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'monthly_last_day'
      });
      expect(result.success).toBe(true);
    });

    it('should accept preset: quarterly', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'quarterly'
      });
      expect(result.success).toBe(true);
    });

    it('should accept preset: yearly', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'yearly'
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional days array with valid DayAbbreviation values', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'weekly',
        days: ['MO', 'WE', 'FR']
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.days).toEqual(['MO', 'WE', 'FR']);
      }
    });

    it('should accept all 7 DayAbbreviation values in days array', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'weekly',
        days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
      });
      expect(result.success).toBe(true);
    });

    it('should accept single day in days array', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'weekly',
        days: ['TU']
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional dayOfMonth integer 1', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'monthly',
        dayOfMonth: 1
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dayOfMonth).toBe(1);
      }
    });

    it('should accept optional dayOfMonth integer 15', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'monthly',
        dayOfMonth: 15
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional dayOfMonth integer 31', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'monthly',
        dayOfMonth: 31
      });
      expect(result.success).toBe(true);
    });

    it('should accept input with no optional fields (defaults absent)', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'daily'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.days).toBeUndefined();
        expect(result.data.dayOfMonth).toBeUndefined();
      }
    });

    it('should accept empty days array', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'weekly',
        days: []
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid preset name', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'fortnightly'
      });
      expect(result.success).toBe(false);
    });

    it('should reject preset: hourly (not in enum)', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'hourly'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty preset string', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing preset', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string id', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: '',
        preset: 'daily'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        preset: 'daily'
      });
      expect(result.success).toBe(false);
    });

    it('should reject dayOfMonth: 0 (below minimum)', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'monthly',
        dayOfMonth: 0
      });
      expect(result.success).toBe(false);
    });

    it('should reject dayOfMonth: 32 (above maximum)', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'monthly',
        dayOfMonth: 32
      });
      expect(result.success).toBe(false);
    });

    it('should reject dayOfMonth: -1 (negative)', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'monthly',
        dayOfMonth: -1
      });
      expect(result.success).toBe(false);
    });

    it('should reject dayOfMonth: 15.5 (non-integer)', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'monthly',
        dayOfMonth: 15.5
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid day abbreviation in days array', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'weekly',
        days: ['MO', 'MONDAY']
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-array days field', () => {
      const result = SetCommonRepetitionInputSchema.safeParse({
        id: 'task-abc',
        preset: 'weekly',
        days: 'MO'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetCommonRepetitionSuccessSchema', () => {
  describe('valid inputs', () => {
    it('should accept success response with id, name, and ruleString', () => {
      const result = SetCommonRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-abc',
        name: 'Weekly Review',
        ruleString: 'FREQ=WEEKLY'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.id).toBe('task-abc');
        expect(result.data.name).toBe('Weekly Review');
        expect(result.data.ruleString).toBe('FREQ=WEEKLY');
      }
    });

    it('should accept success response with complex ruleString', () => {
      const result = SetCommonRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-xyz',
        name: 'Daily Standup',
        ruleString: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject success: false', () => {
      const result = SetCommonRepetitionSuccessSchema.safeParse({
        success: false,
        id: 'task-abc',
        name: 'Task',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = SetCommonRepetitionSuccessSchema.safeParse({
        success: true,
        name: 'Task',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = SetCommonRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-abc',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing ruleString', () => {
      const result = SetCommonRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-abc',
        name: 'Task'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetCommonRepetitionErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = SetCommonRepetitionErrorSchema.safeParse({
      success: false,
      error: "Task 'abc123' not found"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe("Task 'abc123' not found");
    }
  });

  it('should reject error response without error message', () => {
    const result = SetCommonRepetitionErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response with success: true', () => {
    const result = SetCommonRepetitionErrorSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-string error message', () => {
    const result = SetCommonRepetitionErrorSchema.safeParse({
      success: false,
      error: 404
    });
    expect(result.success).toBe(false);
  });
});

describe('SetCommonRepetitionResponseSchema (discriminated union on success)', () => {
  it('should accept success response', () => {
    const result = SetCommonRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-abc',
      name: 'Weekly Review',
      ruleString: 'FREQ=WEEKLY'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = SetCommonRepetitionResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should reject response missing required fields', () => {
    const result = SetCommonRepetitionResponseSchema.safeParse({
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response missing error field', () => {
    const result = SetCommonRepetitionResponseSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('success: true routes to success schema', () => {
    const result = SetCommonRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Task',
      ruleString: 'FREQ=DAILY'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
    }
  });

  it('success: false routes to error schema', () => {
    const result = SetCommonRepetitionResponseSchema.safeParse({
      success: false,
      error: 'Not found'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
    }
  });

  it('discriminated union parses both branches correctly in round-trip', () => {
    const successResult = SetCommonRepetitionResponseSchema.parse({
      success: true,
      id: 'task-1',
      name: 'Monthly Sync',
      ruleString: 'FREQ=MONTHLY'
    });
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.ruleString).toBe('FREQ=MONTHLY');
    }

    const errorResult = SetCommonRepetitionResponseSchema.parse({
      success: false,
      error: 'Task not found'
    });
    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toBe('Task not found');
    }
  });
});
