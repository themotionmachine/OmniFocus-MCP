import { describe, expect, it } from 'vitest';
import {
  ClearRepetitionErrorSchema,
  ClearRepetitionInputSchema,
  ClearRepetitionResponseSchema,
  ClearRepetitionSuccessSchema
} from '../../../src/contracts/repetition-tools/clear-repetition.js';

describe('ClearRepetitionInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept a non-empty id string', () => {
      const result = ClearRepetitionInputSchema.safeParse({ id: 'task-abc123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('task-abc123');
      }
    });

    it('should accept a single character id', () => {
      const result = ClearRepetitionInputSchema.safeParse({ id: 'x' });
      expect(result.success).toBe(true);
    });

    it('should accept a project id', () => {
      const result = ClearRepetitionInputSchema.safeParse({ id: 'proj-xyz-789' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty string id', () => {
      const result = ClearRepetitionInputSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = ClearRepetitionInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const result = ClearRepetitionInputSchema.safeParse({ id: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject null id', () => {
      const result = ClearRepetitionInputSchema.safeParse({ id: null });
      expect(result.success).toBe(false);
    });
  });
});

describe('ClearRepetitionSuccessSchema', () => {
  describe('valid inputs', () => {
    it('should accept success response with id and name', () => {
      const result = ClearRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-abc123',
        name: 'Weekly team meeting'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.id).toBe('task-abc123');
        expect(result.data.name).toBe('Weekly team meeting');
      }
    });

    it('should accept success with project id', () => {
      const result = ClearRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'proj-456',
        name: 'Quarterly Review'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs: no ruleString field expected', () => {
    it('should accept response without ruleString (ruleString not part of schema)', () => {
      const result = ClearRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-1',
        name: 'Task'
      });
      expect(result.success).toBe(true);
    });

    it('should strip unexpected ruleString field (Zod strips extra fields)', () => {
      const result = ClearRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-1',
        name: 'Task',
        ruleString: 'FREQ=DAILY'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // ruleString should not be present in the parsed output
        expect('ruleString' in result.data).toBe(false);
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject success: false', () => {
      const result = ClearRepetitionSuccessSchema.safeParse({
        success: false,
        id: 'task-1',
        name: 'Task'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = ClearRepetitionSuccessSchema.safeParse({
        success: true,
        name: 'Task'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = ClearRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-1'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const result = ClearRepetitionSuccessSchema.safeParse({
        success: true,
        id: 42,
        name: 'Task'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string name', () => {
      const result = ClearRepetitionSuccessSchema.safeParse({
        success: true,
        id: 'task-1',
        name: null
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('ClearRepetitionErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = ClearRepetitionErrorSchema.safeParse({
      success: false,
      error: "Task 'abc123' not found"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe("Task 'abc123' not found");
    }
  });

  it('should accept generic OmniJS error message', () => {
    const result = ClearRepetitionErrorSchema.safeParse({
      success: false,
      error: 'Script execution failed'
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = ClearRepetitionErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response with success: true', () => {
    const result = ClearRepetitionErrorSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-string error message', () => {
    const result = ClearRepetitionErrorSchema.safeParse({
      success: false,
      error: 404
    });
    expect(result.success).toBe(false);
  });
});

describe('ClearRepetitionResponseSchema (discriminated union on success)', () => {
  it('should accept success response', () => {
    const result = ClearRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-1',
      name: 'Weekly standup'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = ClearRepetitionResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should reject response missing required fields', () => {
    const result = ClearRepetitionResponseSchema.safeParse({
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response missing error field', () => {
    const result = ClearRepetitionResponseSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should route success: true to success schema', () => {
    const result = ClearRepetitionResponseSchema.safeParse({
      success: true,
      id: 'task-abc',
      name: 'My Task'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
    }
  });

  it('should route success: false to error schema', () => {
    const result = ClearRepetitionResponseSchema.safeParse({
      success: false,
      error: 'Not found'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
    }
  });

  it('should parse complete success round-trip', () => {
    const parsed = ClearRepetitionResponseSchema.parse({
      success: true,
      id: 'task-round-trip',
      name: 'Round Trip Task'
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.id).toBe('task-round-trip');
      expect(parsed.name).toBe('Round Trip Task');
    }
  });

  it('should parse complete error round-trip', () => {
    const parsed = ClearRepetitionResponseSchema.parse({
      success: false,
      error: 'Task not found'
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error).toBe('Task not found');
    }
  });
});
