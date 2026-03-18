import { describe, expect, it } from 'vitest';
import {
  RemoveNotificationInputSchema,
  RemoveNotificationResponseSchema,
  RemoveNotificationSuccessSchema
} from '../../../src/contracts/notification-tools/remove-notification.js';

// T024: RemoveNotificationInputSchema contract tests
describe('RemoveNotificationInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept taskId + index', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskId: 'task-abc123',
        index: 0
      });
      expect(result.success).toBe(true);
    });

    it('should accept taskName + index', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskName: 'Buy groceries',
        index: 2
      });
      expect(result.success).toBe(true);
    });

    it('should accept both taskId and taskName + index', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskId: 'task-abc123',
        taskName: 'Buy groceries',
        index: 1
      });
      expect(result.success).toBe(true);
    });

    it('should accept index 0 (minimum valid)', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskId: 'task-abc123',
        index: 0
      });
      expect(result.success).toBe(true);
    });

    it('should accept large index values', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskId: 'task-abc123',
        index: 99
      });
      expect(result.success).toBe(true);
    });
  });

  describe('index validation', () => {
    it('should reject negative index', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskId: 'task-abc123',
        index: -1
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer index (float)', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskId: 'task-abc123',
        index: 1.5
      });
      expect(result.success).toBe(false);
    });

    it('should reject string index', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskId: 'task-abc123',
        index: '0'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing index', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskId: 'task-abc123'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('at-least-one identifier required', () => {
    it('should reject empty object', () => {
      const result = RemoveNotificationInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject index only (no task identifier)', () => {
      const result = RemoveNotificationInputSchema.safeParse({ index: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject empty string taskId', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskId: '',
        index: 0
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string taskName', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskName: '',
        index: 0
      });
      expect(result.success).toBe(false);
    });

    it('should reject both taskId and taskName undefined with index', () => {
      const result = RemoveNotificationInputSchema.safeParse({
        taskId: undefined,
        taskName: undefined,
        index: 0
      });
      expect(result.success).toBe(false);
    });
  });
});

// T024: RemoveNotificationSuccessSchema contract tests
describe('RemoveNotificationSuccessSchema', () => {
  const validSuccess = {
    success: true as const,
    taskId: 'task-abc123',
    taskName: 'Buy groceries',
    removedIndex: 0,
    remainingCount: 2
  };

  it('should accept valid success response', () => {
    const result = RemoveNotificationSuccessSchema.safeParse(validSuccess);
    expect(result.success).toBe(true);
  });

  it('should accept removedIndex of 0', () => {
    const result = RemoveNotificationSuccessSchema.safeParse({
      ...validSuccess,
      removedIndex: 0
    });
    expect(result.success).toBe(true);
  });

  it('should accept remainingCount of 0 (removed last notification)', () => {
    const result = RemoveNotificationSuccessSchema.safeParse({
      ...validSuccess,
      remainingCount: 0
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative removedIndex', () => {
    const result = RemoveNotificationSuccessSchema.safeParse({
      ...validSuccess,
      removedIndex: -1
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative remainingCount', () => {
    const result = RemoveNotificationSuccessSchema.safeParse({
      ...validSuccess,
      remainingCount: -1
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer removedIndex', () => {
    const result = RemoveNotificationSuccessSchema.safeParse({
      ...validSuccess,
      removedIndex: 1.5
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer remainingCount', () => {
    const result = RemoveNotificationSuccessSchema.safeParse({
      ...validSuccess,
      remainingCount: 0.5
    });
    expect(result.success).toBe(false);
  });

  it('should require success: true literal', () => {
    const result = RemoveNotificationSuccessSchema.safeParse({
      ...validSuccess,
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should require taskId', () => {
    const { taskId: _, ...rest } = validSuccess;
    const result = RemoveNotificationSuccessSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should require taskName', () => {
    const { taskName: _, ...rest } = validSuccess;
    const result = RemoveNotificationSuccessSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// T024: RemoveNotificationResponseSchema union tests
describe('RemoveNotificationResponseSchema', () => {
  it('should accept success response', () => {
    const result = RemoveNotificationResponseSchema.safeParse({
      success: true,
      taskId: 'task-abc123',
      taskName: 'Buy groceries',
      removedIndex: 0,
      remainingCount: 2
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error', () => {
    const result = RemoveNotificationResponseSchema.safeParse({
      success: false,
      error: "Multiple tasks match name 'Buy groceries'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id-1', 'id-2']
    });
    expect(result.success).toBe(true);
  });

  it('should accept standard error', () => {
    const result = RemoveNotificationResponseSchema.safeParse({
      success: false,
      error: "Task 'task-abc123' not found"
    });
    expect(result.success).toBe(true);
  });
});
