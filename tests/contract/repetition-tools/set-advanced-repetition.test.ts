import { describe, expect, it } from 'vitest';
import {
  SetAdvancedRepetitionErrorSchema,
  SetAdvancedRepetitionInputSchema,
  SetAdvancedRepetitionResponseSchema,
  SetAdvancedRepetitionSuccessSchema
} from '../../../src/contracts/repetition-tools/set-advanced-repetition.js';

describe('SetAdvancedRepetitionInputSchema', () => {
  describe('valid inputs — minimal', () => {
    it('should accept minimal input with only id', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({ id: 'task-abc123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('task-abc123');
        expect(result.data.ruleString).toBeUndefined();
        expect(result.data.scheduleType).toBeUndefined();
        expect(result.data.anchorDateKey).toBeUndefined();
        expect(result.data.catchUpAutomatically).toBeUndefined();
      }
    });

    it('should accept single character id', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({ id: 'x' });
      expect(result.success).toBe(true);
    });
  });

  describe('valid inputs — full', () => {
    it('should accept full input with all fields', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-abc123',
        ruleString: 'FREQ=WEEKLY;BYDAY=MO',
        scheduleType: 'Regularly',
        anchorDateKey: 'DueDate',
        catchUpAutomatically: true
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('task-abc123');
        expect(result.data.ruleString).toBe('FREQ=WEEKLY;BYDAY=MO');
        expect(result.data.scheduleType).toBe('Regularly');
        expect(result.data.anchorDateKey).toBe('DueDate');
        expect(result.data.catchUpAutomatically).toBe(true);
      }
    });

    it('should accept project id with all optional fields', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'proj-xyz-789',
        ruleString: 'FREQ=MONTHLY',
        scheduleType: 'FromCompletion',
        anchorDateKey: 'DeferDate',
        catchUpAutomatically: false
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ruleString validation', () => {
    it('should accept ruleString when present', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ruleString).toBe('FREQ=DAILY');
      }
    });

    it('should accept when ruleString is omitted', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({ id: 'task-1' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ruleString).toBeUndefined();
      }
    });

    it('should reject empty string ruleString', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        ruleString: ''
      });
      expect(result.success).toBe(false);
    });
  });

  describe('scheduleType validation', () => {
    it('should accept scheduleType "Regularly"', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        scheduleType: 'Regularly'
      });
      expect(result.success).toBe(true);
    });

    it('should accept scheduleType "FromCompletion"', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        scheduleType: 'FromCompletion'
      });
      expect(result.success).toBe(true);
    });

    it('should accept scheduleType "None"', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        scheduleType: 'None'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid scheduleType', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        scheduleType: 'Daily'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string scheduleType', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        scheduleType: ''
      });
      expect(result.success).toBe(false);
    });

    it('should accept when scheduleType is omitted', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({ id: 'task-1' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scheduleType).toBeUndefined();
      }
    });
  });

  describe('anchorDateKey validation', () => {
    it('should accept anchorDateKey "DueDate"', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        anchorDateKey: 'DueDate'
      });
      expect(result.success).toBe(true);
    });

    it('should accept anchorDateKey "DeferDate"', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        anchorDateKey: 'DeferDate'
      });
      expect(result.success).toBe(true);
    });

    it('should accept anchorDateKey "PlannedDate"', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        anchorDateKey: 'PlannedDate'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid anchorDateKey', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        anchorDateKey: 'StartDate'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string anchorDateKey', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        anchorDateKey: ''
      });
      expect(result.success).toBe(false);
    });

    it('should accept when anchorDateKey is omitted', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({ id: 'task-1' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.anchorDateKey).toBeUndefined();
      }
    });
  });

  describe('catchUpAutomatically validation', () => {
    it('should accept catchUpAutomatically: true', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        catchUpAutomatically: true
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catchUpAutomatically).toBe(true);
      }
    });

    it('should accept catchUpAutomatically: false', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        catchUpAutomatically: false
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catchUpAutomatically).toBe(false);
      }
    });

    it('should accept when catchUpAutomatically is omitted', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({ id: 'task-1' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catchUpAutomatically).toBeUndefined();
      }
    });

    it('should reject non-boolean catchUpAutomatically', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({
        id: 'task-1',
        catchUpAutomatically: 'yes'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('id validation', () => {
    it('should reject empty string id', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject null id', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({ id: null });
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const result = SetAdvancedRepetitionInputSchema.safeParse({ id: 123 });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetAdvancedRepetitionSuccessSchema', () => {
  describe('valid inputs', () => {
    it('should accept a valid success response', () => {
      const result = SetAdvancedRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-abc123',
        name: 'Weekly Report',
        ruleString: 'FREQ=WEEKLY;BYDAY=MO'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.id).toBe('task-abc123');
        expect(result.data.name).toBe('Weekly Report');
        expect(result.data.ruleString).toBe('FREQ=WEEKLY;BYDAY=MO');
      }
    });

    it('should accept a daily rule success response', () => {
      const result = SetAdvancedRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-daily',
        name: 'Daily Standup',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(true);
    });

    it('should accept a project success response', () => {
      const result = SetAdvancedRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'proj-111',
        name: 'Monthly Review',
        ruleString: 'FREQ=MONTHLY'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject success: false', () => {
      const result = SetAdvancedRepetitionSuccessSchema.safeParse({
        success: false,
        id: 'task-abc',
        name: 'Task',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = SetAdvancedRepetitionSuccessSchema.safeParse({
        success: true,
        name: 'Task',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = SetAdvancedRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-abc',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing ruleString', () => {
      const result = SetAdvancedRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-abc',
        name: 'Task'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing success field', () => {
      const result = SetAdvancedRepetitionSuccessSchema.safeParse({
        id: 'task-abc',
        name: 'Task',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetAdvancedRepetitionErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = SetAdvancedRepetitionErrorSchema.safeParse({
      success: false,
      error: "Task 'abc123' not found"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe("Task 'abc123' not found");
    }
  });

  it('should accept version gate error message', () => {
    const result = SetAdvancedRepetitionErrorSchema.safeParse({
      success: false,
      error: 'set_advanced_repetition requires OmniFocus 4.7 or later (current: 4.1)'
    });
    expect(result.success).toBe(true);
  });

  it('should accept OmniJS constructor error message', () => {
    const result = SetAdvancedRepetitionErrorSchema.safeParse({
      success: false,
      error: 'Invalid repetition parameters: scheduleType not compatible with anchorDateKey'
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = SetAdvancedRepetitionErrorSchema.safeParse({ success: false });
    expect(result.success).toBe(false);
  });

  it('should reject error response with success: true', () => {
    const result = SetAdvancedRepetitionErrorSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-string error message', () => {
    const result = SetAdvancedRepetitionErrorSchema.safeParse({
      success: false,
      error: 404
    });
    expect(result.success).toBe(false);
  });
});

describe('SetAdvancedRepetitionResponseSchema (discriminated union on success)', () => {
  it('should accept a valid success response', () => {
    const result = SetAdvancedRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Weekly standup',
      ruleString: 'FREQ=WEEKLY;BYDAY=MO'
    });
    expect(result.success).toBe(true);
  });

  it('should accept a valid error response', () => {
    const result = SetAdvancedRepetitionResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response missing ruleString', () => {
    const result = SetAdvancedRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Task'
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response missing error field', () => {
    const result = SetAdvancedRepetitionResponseSchema.safeParse({ success: false });
    expect(result.success).toBe(false);
  });

  it('discriminates: success true routes to SetAdvancedRepetitionSuccessSchema', () => {
    const result = SetAdvancedRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Task',
      ruleString: 'FREQ=DAILY'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
      if (result.data.success) {
        expect(result.data.ruleString).toBe('FREQ=DAILY');
      }
    }
  });

  it('discriminates: success false routes to SetAdvancedRepetitionErrorSchema', () => {
    const result = SetAdvancedRepetitionResponseSchema.safeParse({
      success: false,
      error: 'Not found'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      if (!result.data.success) {
        expect(result.data.error).toBe('Not found');
      }
    }
  });

  it('should reject an empty object', () => {
    const result = SetAdvancedRepetitionResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
