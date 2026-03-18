import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listNotifications } from '../../../src/tools/primitives/listNotifications.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T011: Unit tests for listNotifications primitive

describe('listNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('task lookup by ID', () => {
    it('should return notifications when task found by ID', async () => {
      const mockResponse = {
        success: true,
        taskId: 'task123',
        taskName: 'My Task',
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
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listNotifications({ taskId: 'task123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.taskId).toBe('task123');
        expect(result.taskName).toBe('My Task');
        expect(result.count).toBe(1);
        expect(result.notifications).toHaveLength(1);
        expect(result.notifications[0].kind).toBe('Absolute');
      }
    });

    it('should return empty notifications when task has no notifications', async () => {
      const mockResponse = {
        success: true,
        taskId: 'task456',
        taskName: 'Empty Task',
        count: 0,
        notifications: []
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listNotifications({ taskId: 'task456' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.count).toBe(0);
        expect(result.notifications).toHaveLength(0);
      }
    });
  });

  describe('task lookup by name', () => {
    it('should return notifications when task found by name', async () => {
      const mockResponse = {
        success: true,
        taskId: 'task789',
        taskName: 'Named Task',
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
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listNotifications({ taskName: 'Named Task' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.taskId).toBe('task789');
        expect(result.notifications[0].kind).toBe('DueRelative');
      }
    });
  });

  describe('mixed notification kinds', () => {
    it('should return mixed kinds: Absolute has absoluteFireDate, DueRelative has relativeFireOffset', async () => {
      const mockResponse = {
        success: true,
        taskId: 'task123',
        taskName: 'Mixed Notifications Task',
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
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listNotifications({ taskId: 'task123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.count).toBe(2);
        const abs = result.notifications[0];
        const rel = result.notifications[1];

        expect(abs.kind).toBe('Absolute');
        if (abs.kind === 'Absolute') {
          expect(abs.absoluteFireDate).toBe('2024-12-01T10:00:00.000Z');
        }

        expect(rel.kind).toBe('DueRelative');
        if (rel.kind === 'DueRelative' || rel.kind === 'DeferRelative') {
          expect(rel.relativeFireOffset).toBe(-7200);
        }
      }
    });

    it('should handle DeferRelative notification', async () => {
      const mockResponse = {
        success: true,
        taskId: 'task123',
        taskName: 'Defer Task',
        count: 1,
        notifications: [
          {
            index: 0,
            kind: 'DeferRelative',
            relativeFireOffset: 0,
            initialFireDate: '2024-11-30T08:00:00.000Z',
            nextFireDate: '2024-11-30T08:00:00.000Z',
            isSnoozed: false,
            repeatInterval: null
          }
        ]
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listNotifications({ taskId: 'task123' });

      expect(result.success).toBe(true);
      if (result.success) {
        const notif = result.notifications[0];
        expect(notif.kind).toBe('DeferRelative');
      }
    });
  });

  describe('error cases', () => {
    it('should return not found error when task ID does not exist', async () => {
      const mockResponse = {
        success: false,
        error: "Task 'nonexistent' not found"
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listNotifications({ taskId: 'nonexistent' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should return not found error when task name does not exist', async () => {
      const mockResponse = {
        success: false,
        error: "Task 'No Such Task' not found"
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listNotifications({ taskName: 'No Such Task' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('FR-045: disambiguation', () => {
    it('should return disambiguation error when multiple tasks match name', async () => {
      const mockResponse = {
        success: false,
        error: "Multiple tasks match name 'My Task'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['task1', 'task2', 'task3']
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listNotifications({ taskName: 'My Task' });

      expect(result.success).toBe(false);
      if (!result.success && 'code' in result) {
        expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.matchingIds).toHaveLength(3);
        expect(result.matchingIds).toContain('task1');
      }
    });

    it('should return disambiguation error with exactly 2 candidates', async () => {
      const mockResponse = {
        success: false,
        error: "Multiple tasks match name 'Review'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['taskA', 'taskB']
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listNotifications({ taskName: 'Review' });

      expect(result.success).toBe(false);
      if (!result.success && 'code' in result) {
        expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.matchingIds).toHaveLength(2);
      }
    });
  });

  describe('script generation', () => {
    it('should call executeOmniJS exactly once', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Task',
        count: 0,
        notifications: []
      });

      await listNotifications({ taskId: 'task123' });

      expect(executeOmniJS).toHaveBeenCalledTimes(1);
    });

    it('should pass a non-empty script string to executeOmniJS', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Task',
        count: 0,
        notifications: []
      });

      await listNotifications({ taskId: 'task123' });

      const [scriptArg] = vi.mocked(executeOmniJS).mock.calls[0];
      expect(typeof scriptArg).toBe('string');
      expect(scriptArg.length).toBeGreaterThan(0);
    });
  });
});
