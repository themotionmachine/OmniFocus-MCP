import { describe, expect, it } from 'vitest';
import {
  ListNotificationsErrorSchema,
  ListNotificationsInputSchema,
  ListNotificationsResponseSchema,
  ListNotificationsSuccessSchema
} from '../../../src/contracts/notification-tools/list-notifications.js';
import { DisambiguationErrorSchema } from '../../../src/contracts/task-tools/shared/disambiguation.js';

// T010: Contract tests for list-notifications schemas

describe('ListNotificationsInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept taskId only', () => {
      const result = ListNotificationsInputSchema.safeParse({ taskId: 'task123' });
      expect(result.success).toBe(true);
    });

    it('should accept taskName only', () => {
      const result = ListNotificationsInputSchema.safeParse({ taskName: 'My Task' });
      expect(result.success).toBe(true);
    });

    it('should accept both taskId and taskName', () => {
      const result = ListNotificationsInputSchema.safeParse({
        taskId: 'task123',
        taskName: 'My Task'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty object (neither taskId nor taskName)', () => {
      const result = ListNotificationsInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject undefined taskId and taskName', () => {
      const result = ListNotificationsInputSchema.safeParse({
        taskId: undefined,
        taskName: undefined
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string taskId', () => {
      const result = ListNotificationsInputSchema.safeParse({ taskId: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty string taskName', () => {
      const result = ListNotificationsInputSchema.safeParse({ taskName: '' });
      expect(result.success).toBe(false);
    });

    it('should reject non-string taskId', () => {
      const result = ListNotificationsInputSchema.safeParse({ taskId: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject non-string taskName', () => {
      const result = ListNotificationsInputSchema.safeParse({ taskName: 123 });
      expect(result.success).toBe(false);
    });
  });
});

describe('ListNotificationsSuccessSchema', () => {
  const baseSuccess = {
    success: true as const,
    taskId: 'task123',
    taskName: 'My Task',
    count: 0,
    notifications: []
  };

  describe('valid success responses', () => {
    it('should accept response with no notifications', () => {
      const result = ListNotificationsSuccessSchema.safeParse(baseSuccess);
      expect(result.success).toBe(true);
    });

    it('should accept response with Absolute notification', () => {
      const result = ListNotificationsSuccessSchema.safeParse({
        ...baseSuccess,
        count: 1,
        notifications: [
          {
            index: 0,
            kind: 'Absolute',
            absoluteFireDate: '2024-12-01T10:00:00.000Z',
            initialFireDate: '2024-12-01T10:00:00.000Z',
            nextFireDate: '2024-12-01T10:00:00.000Z',
            isSnoozed: false,
            repeatInterval: null
          }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept response with DueRelative notification', () => {
      const result = ListNotificationsSuccessSchema.safeParse({
        ...baseSuccess,
        count: 1,
        notifications: [
          {
            index: 0,
            kind: 'DueRelative',
            relativeFireOffset: -3600,
            initialFireDate: '2024-12-01T09:00:00.000Z',
            nextFireDate: null,
            isSnoozed: false,
            repeatInterval: null
          }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept response with DeferRelative notification', () => {
      const result = ListNotificationsSuccessSchema.safeParse({
        ...baseSuccess,
        count: 1,
        notifications: [
          {
            index: 0,
            kind: 'DeferRelative',
            relativeFireOffset: 0,
            initialFireDate: '2024-11-30T08:00:00.000Z',
            nextFireDate: '2024-11-30T08:00:00.000Z',
            isSnoozed: true,
            repeatInterval: 86400
          }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept response with Unknown notification', () => {
      const result = ListNotificationsSuccessSchema.safeParse({
        ...baseSuccess,
        count: 1,
        notifications: [
          {
            index: 0,
            kind: 'Unknown',
            initialFireDate: '2024-12-01T10:00:00.000Z',
            nextFireDate: null,
            isSnoozed: false,
            repeatInterval: null
          }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept response with mixed notification kinds', () => {
      const result = ListNotificationsSuccessSchema.safeParse({
        ...baseSuccess,
        count: 2,
        notifications: [
          {
            index: 0,
            kind: 'Absolute',
            absoluteFireDate: '2024-12-01T10:00:00.000Z',
            initialFireDate: '2024-12-01T10:00:00.000Z',
            nextFireDate: '2024-12-01T10:00:00.000Z',
            isSnoozed: false,
            repeatInterval: null
          },
          {
            index: 1,
            kind: 'DueRelative',
            relativeFireOffset: -7200,
            initialFireDate: '2024-12-01T08:00:00.000Z',
            nextFireDate: null,
            isSnoozed: false,
            repeatInterval: null
          }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept count of 0 with empty array', () => {
      const result = ListNotificationsSuccessSchema.safeParse({ ...baseSuccess, count: 0 });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid success responses', () => {
    it('should reject missing success field', () => {
      const result = ListNotificationsSuccessSchema.safeParse({
        taskId: 'task123',
        taskName: 'My Task',
        count: 0,
        notifications: []
      });
      expect(result.success).toBe(false);
    });

    it('should reject success: false', () => {
      const result = ListNotificationsSuccessSchema.safeParse({ ...baseSuccess, success: false });
      expect(result.success).toBe(false);
    });

    it('should reject missing taskId', () => {
      const { taskId: _taskId, ...rest } = baseSuccess;
      const result = ListNotificationsSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject missing taskName', () => {
      const { taskName: _taskName, ...rest } = baseSuccess;
      const result = ListNotificationsSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject negative count', () => {
      const result = ListNotificationsSuccessSchema.safeParse({ ...baseSuccess, count: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer count', () => {
      const result = ListNotificationsSuccessSchema.safeParse({ ...baseSuccess, count: 1.5 });
      expect(result.success).toBe(false);
    });

    it('should reject missing notifications array', () => {
      const { notifications: _n, ...rest } = baseSuccess;
      const result = ListNotificationsSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });
});

describe('ListNotificationsErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept valid error response', () => {
      const result = ListNotificationsErrorSchema.safeParse({
        success: false,
        error: 'Task not found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept error with empty message', () => {
      const result = ListNotificationsErrorSchema.safeParse({
        success: false,
        error: ''
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid error responses', () => {
    it('should reject success: true', () => {
      const result = ListNotificationsErrorSchema.safeParse({
        success: true,
        error: 'Task not found'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing error field', () => {
      const result = ListNotificationsErrorSchema.safeParse({ success: false });
      expect(result.success).toBe(false);
    });

    it('should reject non-string error', () => {
      const result = ListNotificationsErrorSchema.safeParse({ success: false, error: 123 });
      expect(result.success).toBe(false);
    });
  });
});

describe('DisambiguationErrorSchema for list_notifications', () => {
  it('should accept disambiguation error with 2 matching IDs', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: "Multiple tasks match name 'My Task'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task1', 'task2']
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error with 3+ matching IDs', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: "Multiple tasks match name 'My Task'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task1', 'task2', 'task3']
    });
    expect(result.success).toBe(true);
  });

  it('should reject disambiguation with only 1 matching ID', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: 'Disambiguation',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task1']
    });
    expect(result.success).toBe(false);
  });
});

describe('ListNotificationsResponseSchema', () => {
  it('should accept success response', () => {
    const result = ListNotificationsResponseSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      count: 0,
      notifications: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = ListNotificationsResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error response', () => {
    const result = ListNotificationsResponseSchema.safeParse({
      success: false,
      error: "Multiple tasks match name 'My Task'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task1', 'task2']
    });
    expect(result.success).toBe(true);
  });

  it('should reject unknown shape', () => {
    const result = ListNotificationsResponseSchema.safeParse({
      success: true,
      data: 'unexpected'
    });
    expect(result.success).toBe(false);
  });
});
