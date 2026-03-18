import { describe, expect, it } from 'vitest';
import {
  AddNotificationErrorSchema,
  AddNotificationInputSchema,
  AddNotificationResponseSchema,
  AddNotificationSuccessSchema
} from '../../../src/contracts/notification-tools/add-notification.js';

// T017: Contract tests for add_notification schemas

describe('AddNotificationInputSchema', () => {
  describe('absolute type', () => {
    it('should accept absolute with taskId and dateTime', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'absolute',
        taskId: 'task123',
        dateTime: '2026-03-17T10:00:00Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept absolute with taskName and dateTime', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'absolute',
        taskName: 'My Task',
        dateTime: '2026-03-17T10:00:00Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept absolute with both taskId and taskName', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'absolute',
        taskId: 'task123',
        taskName: 'My Task',
        dateTime: '2026-03-17T10:00:00Z'
      });
      expect(result.success).toBe(true);
    });

    it('should reject absolute without dateTime', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'absolute',
        taskId: 'task123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject absolute with empty dateTime', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'absolute',
        taskId: 'task123',
        dateTime: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject absolute without any task identifier', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'absolute',
        dateTime: '2026-03-17T10:00:00Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject absolute with empty taskId and no taskName', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'absolute',
        taskId: '',
        dateTime: '2026-03-17T10:00:00Z'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('relative type', () => {
    it('should accept relative with taskId and offsetSeconds', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'relative',
        taskId: 'task123',
        offsetSeconds: -3600
      });
      expect(result.success).toBe(true);
    });

    it('should accept relative with taskName and offsetSeconds', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'relative',
        taskName: 'My Task',
        offsetSeconds: 0
      });
      expect(result.success).toBe(true);
    });

    it('should accept relative with positive offsetSeconds', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'relative',
        taskId: 'task123',
        offsetSeconds: 3600
      });
      expect(result.success).toBe(true);
    });

    it('should reject relative without offsetSeconds', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'relative',
        taskId: 'task123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject relative without any task identifier', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'relative',
        offsetSeconds: -3600
      });
      expect(result.success).toBe(false);
    });

    it('should reject relative with Infinity offsetSeconds', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'relative',
        taskId: 'task123',
        offsetSeconds: Infinity
      });
      expect(result.success).toBe(false);
    });

    it('should reject relative with -Infinity offsetSeconds', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'relative',
        taskId: 'task123',
        offsetSeconds: -Infinity
      });
      expect(result.success).toBe(false);
    });

    it('should reject relative with NaN offsetSeconds', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'relative',
        taskId: 'task123',
        offsetSeconds: NaN
      });
      expect(result.success).toBe(false);
    });

    it('should reject relative with non-number offsetSeconds', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'relative',
        taskId: 'task123',
        offsetSeconds: 'one hour'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('type field validation', () => {
    it('should reject missing type field', () => {
      const result = AddNotificationInputSchema.safeParse({
        taskId: 'task123',
        dateTime: '2026-03-17T10:00:00Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject unknown type value', () => {
      const result = AddNotificationInputSchema.safeParse({
        type: 'calendar',
        taskId: 'task123',
        dateTime: '2026-03-17T10:00:00Z'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('AddNotificationSuccessSchema', () => {
  const validAbsoluteNotification = {
    index: 0,
    kind: 'Absolute' as const,
    initialFireDate: '2026-03-17T10:00:00.000Z',
    nextFireDate: '2026-03-17T10:00:00.000Z',
    isSnoozed: false,
    repeatInterval: null,
    absoluteFireDate: '2026-03-17T10:00:00.000Z'
  };

  const validRelativeNotification = {
    index: 0,
    kind: 'DueRelative' as const,
    initialFireDate: '2026-03-17T09:00:00.000Z',
    nextFireDate: '2026-03-17T09:00:00.000Z',
    isSnoozed: false,
    repeatInterval: null,
    relativeFireOffset: -3600
  };

  it('should accept valid success with absolute notification', () => {
    const result = AddNotificationSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      notification: validAbsoluteNotification
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid success with relative notification', () => {
    const result = AddNotificationSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      notification: validRelativeNotification
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing taskId', () => {
    const result = AddNotificationSuccessSchema.safeParse({
      success: true,
      taskName: 'My Task',
      notification: validAbsoluteNotification
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing taskName', () => {
    const result = AddNotificationSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      notification: validAbsoluteNotification
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing notification', () => {
    const result = AddNotificationSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: false', () => {
    const result = AddNotificationSuccessSchema.safeParse({
      success: false,
      taskId: 'task123',
      taskName: 'My Task',
      notification: validAbsoluteNotification
    });
    expect(result.success).toBe(false);
  });
});

describe('AddNotificationErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = AddNotificationErrorSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success: true', () => {
    const result = AddNotificationErrorSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing error field', () => {
    const result = AddNotificationErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('AddNotificationResponseSchema', () => {
  it('should accept success response', () => {
    const result = AddNotificationResponseSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      notification: {
        index: 0,
        kind: 'Absolute',
        initialFireDate: '2026-03-17T10:00:00.000Z',
        nextFireDate: '2026-03-17T10:00:00.000Z',
        isSnoozed: false,
        repeatInterval: null,
        absoluteFireDate: '2026-03-17T10:00:00.000Z'
      }
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = AddNotificationResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error response', () => {
    const result = AddNotificationResponseSchema.safeParse({
      success: false,
      error: "Multiple tasks match name 'My Task'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should reject response with no matching schema', () => {
    const result = AddNotificationResponseSchema.safeParse({
      success: true,
      data: 'some data'
    });
    expect(result.success).toBe(false);
  });
});
