import { describe, expect, it } from 'vitest';
import {
  AddStandardNotificationsErrorSchema,
  AddStandardNotificationsInputSchema,
  AddStandardNotificationsResponseSchema,
  AddStandardNotificationsSuccessSchema
} from '../../../src/contracts/notification-tools/add-standard-notifications.js';

// T031: Contract tests for add_standard_notifications schemas

describe('AddStandardNotificationsInputSchema', () => {
  describe('preset field validation', () => {
    it('should accept day_before preset with taskId', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: 'task123',
        preset: 'day_before'
      });
      expect(result.success).toBe(true);
    });

    it('should accept hour_before preset with taskId', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: 'task123',
        preset: 'hour_before'
      });
      expect(result.success).toBe(true);
    });

    it('should accept 15_minutes preset with taskId', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: 'task123',
        preset: '15_minutes'
      });
      expect(result.success).toBe(true);
    });

    it('should accept week_before preset with taskId', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: 'task123',
        preset: 'week_before'
      });
      expect(result.success).toBe(true);
    });

    it('should accept standard preset with taskId', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: 'task123',
        preset: 'standard'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid preset value', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: 'task123',
        preset: 'two_days_before'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing preset', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: 'task123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string preset', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: 'task123',
        preset: ''
      });
      expect(result.success).toBe(false);
    });
  });

  describe('task identifier validation', () => {
    it('should accept taskId only', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: 'task123',
        preset: 'day_before'
      });
      expect(result.success).toBe(true);
    });

    it('should accept taskName only', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskName: 'My Task',
        preset: 'day_before'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both taskId and taskName', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: 'task123',
        taskName: 'My Task',
        preset: 'day_before'
      });
      expect(result.success).toBe(true);
    });

    it('should reject when neither taskId nor taskName provided', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        preset: 'day_before'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty taskId', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskId: '',
        preset: 'day_before'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty taskName', () => {
      const result = AddStandardNotificationsInputSchema.safeParse({
        taskName: '',
        preset: 'day_before'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('AddStandardNotificationsSuccessSchema', () => {
  const validRelativeNotification = {
    index: 0,
    kind: 'DueRelative' as const,
    initialFireDate: '2026-03-16T10:00:00.000Z',
    nextFireDate: '2026-03-16T10:00:00.000Z',
    isSnoozed: false,
    repeatInterval: null,
    relativeFireOffset: -86400
  };

  it('should accept valid success with one notification (day_before)', () => {
    const result = AddStandardNotificationsSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      addedCount: 1,
      notifications: [validRelativeNotification]
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid success with two notifications (standard)', () => {
    const result = AddStandardNotificationsSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      addedCount: 2,
      notifications: [
        validRelativeNotification,
        { ...validRelativeNotification, index: 1, relativeFireOffset: -3600 }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid success with zero addedCount and empty notifications', () => {
    const result = AddStandardNotificationsSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      addedCount: 0,
      notifications: []
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing taskId', () => {
    const result = AddStandardNotificationsSuccessSchema.safeParse({
      success: true,
      taskName: 'My Task',
      addedCount: 1,
      notifications: [validRelativeNotification]
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing taskName', () => {
    const result = AddStandardNotificationsSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      addedCount: 1,
      notifications: [validRelativeNotification]
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing addedCount', () => {
    const result = AddStandardNotificationsSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      notifications: [validRelativeNotification]
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer addedCount', () => {
    const result = AddStandardNotificationsSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      addedCount: 1.5,
      notifications: [validRelativeNotification]
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative addedCount', () => {
    const result = AddStandardNotificationsSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      addedCount: -1,
      notifications: [validRelativeNotification]
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing notifications array', () => {
    const result = AddStandardNotificationsSuccessSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      addedCount: 1
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: false', () => {
    const result = AddStandardNotificationsSuccessSchema.safeParse({
      success: false,
      taskId: 'task123',
      taskName: 'My Task',
      addedCount: 1,
      notifications: [validRelativeNotification]
    });
    expect(result.success).toBe(false);
  });
});

describe('AddStandardNotificationsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = AddStandardNotificationsErrorSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success: true', () => {
    const result = AddStandardNotificationsErrorSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing error field', () => {
    const result = AddStandardNotificationsErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('AddStandardNotificationsResponseSchema', () => {
  const validNotification = {
    index: 0,
    kind: 'DueRelative' as const,
    initialFireDate: '2026-03-16T10:00:00.000Z',
    nextFireDate: '2026-03-16T10:00:00.000Z',
    isSnoozed: false,
    repeatInterval: null,
    relativeFireOffset: -86400
  };

  it('should accept success response', () => {
    const result = AddStandardNotificationsResponseSchema.safeParse({
      success: true,
      taskId: 'task123',
      taskName: 'My Task',
      addedCount: 1,
      notifications: [validNotification]
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = AddStandardNotificationsResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error response', () => {
    const result = AddStandardNotificationsResponseSchema.safeParse({
      success: false,
      error: "Multiple tasks match name 'My Task'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should reject response with no matching schema', () => {
    const result = AddStandardNotificationsResponseSchema.safeParse({
      success: true,
      data: 'some data'
    });
    expect(result.success).toBe(false);
  });
});
