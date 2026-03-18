import { describe, expect, it } from 'vitest';
import {
  SnoozeNotificationErrorSchema,
  SnoozeNotificationInputSchema,
  SnoozeNotificationResponseSchema,
  SnoozeNotificationSuccessSchema
} from '../../../src/contracts/notification-tools/snooze-notification.js';

// T038: Contract tests for snooze-notification schemas

describe('SnoozeNotificationInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept taskId with index and snoozeUntil', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept taskName with index and snoozeUntil', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskName: 'Buy groceries',
        index: 2,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both taskId and taskName (taskId takes precedence)', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        taskName: 'Buy groceries',
        index: 0,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept index of 0 (minimum valid index)', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept large index values', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        index: 99,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept various ISO 8601 datetime formats for snoozeUntil', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: '2026-12-31T23:59:59Z'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('at-least-one identifier required', () => {
    it('should reject empty object (no identifier)', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        index: 0,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject both identifiers undefined', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: undefined,
        taskName: undefined,
        index: 0,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('index validation', () => {
    it('should reject negative index', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        index: -1,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject float index', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        index: 1.5,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-number index', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        index: 'zero',
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing index', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('snoozeUntil validation', () => {
    it('should reject missing snoozeUntil', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        index: 0
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string snoozeUntil', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: 1743494400000
      });
      expect(result.success).toBe(false);
    });

    it('should reject null snoozeUntil', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: null
      });
      expect(result.success).toBe(false);
    });
  });

  describe('identifier string validation', () => {
    it('should reject empty string taskId (.min(1))', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskId: '',
        index: 0,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string taskName (.min(1))', () => {
      const result = SnoozeNotificationInputSchema.safeParse({
        taskName: '',
        index: 0,
        snoozeUntil: '2026-04-01T09:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SnoozeNotificationSuccessSchema', () => {
  const validAbsoluteNotification = {
    index: 0,
    kind: 'Absolute' as const,
    absoluteFireDate: '2026-04-01T09:00:00.000Z',
    initialFireDate: '2026-04-01T09:00:00.000Z',
    nextFireDate: '2026-04-01T09:00:00.000Z',
    isSnoozed: true,
    repeatInterval: null
  };

  describe('valid success responses', () => {
    it('should accept valid success response with Absolute notification', () => {
      const result = SnoozeNotificationSuccessSchema.safeParse({
        success: true,
        taskId: 'task-123',
        taskName: 'Buy groceries',
        notification: validAbsoluteNotification
      });
      expect(result.success).toBe(true);
    });

    it('should accept success with snoozed notification', () => {
      const result = SnoozeNotificationSuccessSchema.safeParse({
        success: true,
        taskId: 'task-456',
        taskName: 'Call mom',
        notification: {
          ...validAbsoluteNotification,
          isSnoozed: true,
          absoluteFireDate: '2026-05-01T10:00:00.000Z'
        }
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing taskId', () => {
      const result = SnoozeNotificationSuccessSchema.safeParse({
        success: true,
        taskName: 'Buy groceries',
        notification: validAbsoluteNotification
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing taskName', () => {
      const result = SnoozeNotificationSuccessSchema.safeParse({
        success: true,
        taskId: 'task-123',
        notification: validAbsoluteNotification
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing notification', () => {
      const result = SnoozeNotificationSuccessSchema.safeParse({
        success: true,
        taskId: 'task-123',
        taskName: 'Buy groceries'
      });
      expect(result.success).toBe(false);
    });

    it('should reject success: false', () => {
      const result = SnoozeNotificationSuccessSchema.safeParse({
        success: false,
        taskId: 'task-123',
        taskName: 'Buy groceries',
        notification: validAbsoluteNotification
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SnoozeNotificationErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept valid error response', () => {
      const result = SnoozeNotificationErrorSchema.safeParse({
        success: false,
        error: 'Task not found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept non-snoozable kind error', () => {
      const result = SnoozeNotificationErrorSchema.safeParse({
        success: false,
        error:
          'Cannot snooze notification at index 0: only Absolute notifications can be snoozed (this notification is DueRelative)'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing error field', () => {
      const result = SnoozeNotificationErrorSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });

    it('should reject success: true', () => {
      const result = SnoozeNotificationErrorSchema.safeParse({
        success: true,
        error: 'Some error'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SnoozeNotificationResponseSchema', () => {
  const validAbsoluteNotification = {
    index: 0,
    kind: 'Absolute' as const,
    absoluteFireDate: '2026-05-01T10:00:00.000Z',
    initialFireDate: '2026-04-01T09:00:00.000Z',
    nextFireDate: '2026-05-01T10:00:00.000Z',
    isSnoozed: true,
    repeatInterval: null
  };

  it('should accept success response', () => {
    const result = SnoozeNotificationResponseSchema.safeParse({
      success: true,
      taskId: 'task-123',
      taskName: 'Buy groceries',
      notification: validAbsoluteNotification
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = SnoozeNotificationResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error response', () => {
    const result = SnoozeNotificationResponseSchema.safeParse({
      success: false,
      error: 'Multiple tasks match name "Task"',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should reject unknown shape', () => {
    const result = SnoozeNotificationResponseSchema.safeParse({
      success: true,
      data: 'something unexpected'
    });
    expect(result.success).toBe(false);
  });
});
