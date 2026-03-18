import { describe, expect, it } from 'vitest';
import {
  SetRepetitionErrorSchema,
  SetRepetitionInputSchema,
  SetRepetitionResponseSchema,
  SetRepetitionSuccessSchema
} from '../../../src/contracts/repetition-tools/set-repetition.js';

describe('SetRepetitionInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid id and ruleString', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: 'task-abc123',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('task-abc123');
        expect(result.data.ruleString).toBe('FREQ=DAILY');
      }
    });

    it('should accept a project id with a complex ICS rule string', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: 'proj-xyz-789',
        ruleString: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
      });
      expect(result.success).toBe(true);
    });

    it('should accept a single character id and minimal ruleString', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: 'x',
        ruleString: 'F'
      });
      expect(result.success).toBe(true);
    });

    it('should accept a monthly repeat rule', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: 'task-monthly',
        ruleString: 'FREQ=MONTHLY;BYMONTHDAY=15'
      });
      expect(result.success).toBe(true);
    });

    it('should accept a yearly rule', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: 'task-yearly',
        ruleString: 'FREQ=YEARLY'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty string id', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: '',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string ruleString', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: 'task-abc',
        ruleString: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject both empty strings', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: '',
        ruleString: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = SetRepetitionInputSchema.safeParse({
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing ruleString', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: 'task-abc'
      });
      expect(result.success).toBe(false);
    });

    it('should reject null id', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: null,
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject null ruleString', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: 'task-abc',
        ruleString: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const result = SetRepetitionInputSchema.safeParse({
        id: 123,
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty input object', () => {
      const result = SetRepetitionInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe('SetRepetitionSuccessSchema', () => {
  describe('valid inputs', () => {
    it('should accept a valid success response', () => {
      const result = SetRepetitionSuccessSchema.safeParse({
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

    it('should accept a simple daily rule success response', () => {
      const result = SetRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-daily',
        name: 'Daily Standup',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(true);
    });

    it('should accept a project success response', () => {
      const result = SetRepetitionSuccessSchema.safeParse({
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
      const result = SetRepetitionSuccessSchema.safeParse({
        success: false,
        id: 'task-abc',
        name: 'Task',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = SetRepetitionSuccessSchema.safeParse({
        success: true,
        name: 'Task',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = SetRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-abc',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing ruleString', () => {
      const result = SetRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-abc',
        name: 'Task'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing success field', () => {
      const result = SetRepetitionSuccessSchema.safeParse({
        id: 'task-abc',
        name: 'Task',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetRepetitionErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = SetRepetitionErrorSchema.safeParse({
      success: false,
      error: "Task 'abc123' not found"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe("Task 'abc123' not found");
    }
  });

  it('should accept OmniJS error message', () => {
    const result = SetRepetitionErrorSchema.safeParse({
      success: false,
      error: 'Invalid ICS recurrence string'
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = SetRepetitionErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response with success: true', () => {
    const result = SetRepetitionErrorSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-string error message', () => {
    const result = SetRepetitionErrorSchema.safeParse({
      success: false,
      error: 404
    });
    expect(result.success).toBe(false);
  });
});

describe('SetRepetitionResponseSchema (discriminated union on success)', () => {
  it('should accept a valid success response', () => {
    const result = SetRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Weekly standup',
      ruleString: 'FREQ=WEEKLY;BYDAY=MO'
    });
    expect(result.success).toBe(true);
  });

  it('should accept a valid error response', () => {
    const result = SetRepetitionResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response missing ruleString', () => {
    const result = SetRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Task'
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response missing error field', () => {
    const result = SetRepetitionResponseSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('discriminates: success true routes to SetRepetitionSuccessSchema', () => {
    const result = SetRepetitionResponseSchema.safeParse({
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

  it('discriminates: success false routes to SetRepetitionErrorSchema', () => {
    const result = SetRepetitionResponseSchema.safeParse({
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
    const result = SetRepetitionResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
