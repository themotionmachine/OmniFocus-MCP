import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addNotification } from '../../../src/tools/primitives/addNotification.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T018: Unit tests for addNotification primitive

describe('addNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const absoluteNotificationResult = {
    index: 0,
    kind: 'Absolute',
    initialFireDate: '2026-03-17T10:00:00.000Z',
    nextFireDate: '2026-03-17T10:00:00.000Z',
    isSnoozed: false,
    repeatInterval: null,
    absoluteFireDate: '2026-03-17T10:00:00.000Z'
  };

  const relativeNotificationResult = {
    index: 0,
    kind: 'DueRelative',
    initialFireDate: '2026-03-17T09:00:00.000Z',
    nextFireDate: '2026-03-17T09:00:00.000Z',
    isSnoozed: false,
    repeatInterval: null,
    relativeFireOffset: -3600
  };

  describe('absolute notifications', () => {
    it('should add absolute notification by taskId', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Test Task',
        notification: absoluteNotificationResult
      });

      const result = await addNotification({
        type: 'absolute',
        taskId: 'task123',
        dateTime: '2026-03-17T10:00:00Z'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.taskId).toBe('task123');
        expect(result.taskName).toBe('Test Task');
        expect(result.notification.kind).toBe('Absolute');
      }
      expect(executeOmniJS).toHaveBeenCalledOnce();
    });

    it('should add absolute notification by taskName', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task456',
        taskName: 'Named Task',
        notification: absoluteNotificationResult
      });

      const result = await addNotification({
        type: 'absolute',
        taskName: 'Named Task',
        dateTime: '2026-03-17T10:00:00Z'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.taskName).toBe('Named Task');
      }
    });

    it('should return error for invalid dateTime (pre-script validation)', async () => {
      const result = await addNotification({
        type: 'absolute',
        taskId: 'task123',
        dateTime: 'not-a-date'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid dateTime');
      }
      // executeOmniJS should NOT be called for invalid dates
      expect(executeOmniJS).not.toHaveBeenCalled();
    });

    it('should return error for empty string dateTime', async () => {
      const result = await addNotification({
        type: 'absolute',
        taskId: 'task123',
        dateTime: 'not-a-valid-iso-date-at-all'
      });

      expect(result.success).toBe(false);
      expect(executeOmniJS).not.toHaveBeenCalled();
    });
  });

  describe('relative notifications', () => {
    it('should add relative notification by taskId', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Test Task',
        notification: relativeNotificationResult
      });

      const result = await addNotification({
        type: 'relative',
        taskId: 'task123',
        offsetSeconds: -3600
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.notification.kind).toBe('DueRelative');
      }
      expect(executeOmniJS).toHaveBeenCalledOnce();
    });

    it('should add relative notification with positive offset', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Test Task',
        notification: {
          ...relativeNotificationResult,
          relativeFireOffset: 3600
        }
      });

      const result = await addNotification({
        type: 'relative',
        taskId: 'task123',
        offsetSeconds: 3600
      });

      expect(result.success).toBe(true);
    });

    it('should return error when task has no effectiveDueDate for relative', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Task 'task123' has no due date; cannot add relative notification"
      });

      const result = await addNotification({
        type: 'relative',
        taskId: 'task123',
        offsetSeconds: -3600
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('no due date');
      }
    });
  });

  describe('task resolution errors', () => {
    it('should return error when task not found by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Task 'nonexistent' not found"
      });

      const result = await addNotification({
        type: 'absolute',
        taskId: 'nonexistent',
        dateTime: '2026-03-17T10:00:00Z'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should return disambiguation error for multiple name matches', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Multiple tasks match name 'My Task'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['task1', 'task2']
      });

      const result = await addNotification({
        type: 'absolute',
        taskName: 'My Task',
        dateTime: '2026-03-17T10:00:00Z'
      });

      expect(result.success).toBe(false);
      if (!result.success && 'code' in result) {
        expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.matchingIds).toHaveLength(2);
      }
    });

    it('should return error when task not found by name', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Task 'Nonexistent Task' not found"
      });

      const result = await addNotification({
        type: 'relative',
        taskName: 'Nonexistent Task',
        offsetSeconds: -3600
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('script generation', () => {
    it('should call executeOmniJS with a non-empty script', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Test Task',
        notification: absoluteNotificationResult
      });

      await addNotification({
        type: 'absolute',
        taskId: 'task123',
        dateTime: '2026-03-17T10:00:00Z'
      });

      expect(executeOmniJS).toHaveBeenCalledWith(expect.stringContaining('function'));
    });

    it('should escape special characters in taskId', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task"123',
        taskName: 'Test Task',
        notification: absoluteNotificationResult
      });

      await addNotification({
        type: 'absolute',
        taskId: 'task"123',
        dateTime: '2026-03-17T10:00:00Z'
      });

      const scriptArg = vi.mocked(executeOmniJS).mock.calls[0][0];
      // The escaped quote should appear in the script, not a raw quote
      expect(scriptArg).not.toContain('task"123');
    });
  });
});
