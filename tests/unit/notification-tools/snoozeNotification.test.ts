import { beforeEach, describe, expect, it, vi } from 'vitest';
import { snoozeNotification } from '../../../src/tools/primitives/snoozeNotification.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T039: Unit tests for snoozeNotification primitive

describe('snoozeNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validAbsoluteNotification = {
    index: 0,
    kind: 'Absolute',
    absoluteFireDate: '2026-05-01T10:00:00.000Z',
    initialFireDate: '2026-04-01T09:00:00.000Z',
    nextFireDate: '2026-05-01T10:00:00.000Z',
    isSnoozed: true,
    repeatInterval: null
  };

  describe('successful snooze', () => {
    it('should snooze an Absolute notification by taskId', async () => {
      const mockResponse = {
        success: true,
        taskId: 'task-123',
        taskName: 'Buy groceries',
        notification: validAbsoluteNotification
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await snoozeNotification({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: '2026-05-01T10:00:00.000Z'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.taskId).toBe('task-123');
        expect(result.taskName).toBe('Buy groceries');
        expect(result.notification.kind).toBe('Absolute');
        expect(result.notification.isSnoozed).toBe(true);
      }
    });

    it('should snooze an Absolute notification by taskName', async () => {
      const mockResponse = {
        success: true,
        taskId: 'task-456',
        taskName: 'Buy groceries',
        notification: validAbsoluteNotification
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await snoozeNotification({
        taskName: 'Buy groceries',
        index: 0,
        snoozeUntil: '2026-05-01T10:00:00.000Z'
      });

      expect(result.success).toBe(true);
    });

    it('should re-snooze an already-snoozed Absolute notification', async () => {
      const mockResponse = {
        success: true,
        taskId: 'task-123',
        taskName: 'Buy groceries',
        notification: {
          ...validAbsoluteNotification,
          absoluteFireDate: '2026-06-01T10:00:00.000Z',
          isSnoozed: true
        }
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await snoozeNotification({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: '2026-06-01T10:00:00.000Z'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.notification.isSnoozed).toBe(true);
      }
    });

    it('should call executeOmniJS once per invocation', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task-123',
        taskName: 'Buy groceries',
        notification: validAbsoluteNotification
      });

      await snoozeNotification({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: '2026-05-01T10:00:00.000Z'
      });

      expect(executeOmniJS).toHaveBeenCalledTimes(1);
    });
  });

  describe('error cases — non-Absolute kind', () => {
    it('should return error when notification is DueRelative kind', async () => {
      const mockResponse = {
        success: false,
        error:
          'Cannot snooze notification at index 0: only Absolute notifications can be snoozed (this notification is DueRelative)'
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await snoozeNotification({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: '2026-05-01T10:00:00.000Z'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('only Absolute notifications can be snoozed');
        expect(result.error).toContain('DueRelative');
      }
    });

    it('should return error when notification is DeferRelative kind', async () => {
      const mockResponse = {
        success: false,
        error:
          'Cannot snooze notification at index 1: only Absolute notifications can be snoozed (this notification is DeferRelative)'
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await snoozeNotification({
        taskId: 'task-123',
        index: 1,
        snoozeUntil: '2026-05-01T10:00:00.000Z'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('DeferRelative');
      }
    });
  });

  describe('error cases — task resolution', () => {
    it('should return error when task not found by ID', async () => {
      const mockResponse = {
        success: false,
        error: "Task 'nonexistent-id' not found"
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await snoozeNotification({
        taskId: 'nonexistent-id',
        index: 0,
        snoozeUntil: '2026-05-01T10:00:00.000Z'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should return disambiguation error for multiple name matches', async () => {
      const mockResponse = {
        success: false,
        error: "Multiple tasks match name 'Buy groceries'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['task-1', 'task-2']
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await snoozeNotification({
        taskName: 'Buy groceries',
        index: 0,
        snoozeUntil: '2026-05-01T10:00:00.000Z'
      });

      expect(result.success).toBe(false);
      if (!result.success && 'code' in result) {
        expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.matchingIds).toHaveLength(2);
      }
    });

    it('should return error when task has no notifications', async () => {
      const mockResponse = {
        success: false,
        error: "Task 'task-123' has no notifications"
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await snoozeNotification({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: '2026-05-01T10:00:00.000Z'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('no notifications');
      }
    });

    it('should return error when index is out of bounds', async () => {
      const mockResponse = {
        success: false,
        error: 'Notification index 5 out of bounds: task has 2 notification(s)'
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await snoozeNotification({
        taskId: 'task-123',
        index: 5,
        snoozeUntil: '2026-05-01T10:00:00.000Z'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('out of bounds');
      }
    });
  });

  describe('error cases — invalid snoozeUntil date', () => {
    it('should return error before calling OmniJS for invalid date string', async () => {
      const result = await snoozeNotification({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: 'not-a-date'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid snoozeUntil date');
      }
      // Should NOT have called OmniJS since validation failed on TypeScript side
      expect(executeOmniJS).not.toHaveBeenCalled();
    });

    it('should return error for empty snoozeUntil string', async () => {
      const result = await snoozeNotification({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: ''
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid snoozeUntil date');
      }
      expect(executeOmniJS).not.toHaveBeenCalled();
    });

    it('should also handle invalid date returned from OmniJS script', async () => {
      const mockResponse = {
        success: false,
        error: "Invalid snoozeUntil date: 'banana'"
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await snoozeNotification({
        taskId: 'task-123',
        index: 0,
        snoozeUntil: '2026-05-01T10:00:00.000Z'
      });

      expect(result.success).toBe(false);
    });
  });
});
