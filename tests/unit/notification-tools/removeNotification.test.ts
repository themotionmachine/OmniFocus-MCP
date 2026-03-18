import { beforeEach, describe, expect, it, vi } from 'vitest';
import { removeNotification } from '../../../src/tools/primitives/removeNotification.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

const mockedExecuteOmniJS = vi.mocked(executeOmniJS);

describe('removeNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful removal', () => {
    it('should return removedIndex and remainingCount on success (by taskId)', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-abc123',
        taskName: 'Buy groceries',
        removedIndex: 0,
        remainingCount: 1
      });

      const result = await removeNotification({ taskId: 'task-abc123', index: 0 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.taskId).toBe('task-abc123');
        expect(result.taskName).toBe('Buy groceries');
        expect(result.removedIndex).toBe(0);
        expect(result.remainingCount).toBe(1);
      }
    });

    it('should return remainingCount of 0 when last notification removed', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-abc123',
        taskName: 'Buy groceries',
        removedIndex: 0,
        remainingCount: 0
      });

      const result = await removeNotification({ taskId: 'task-abc123', index: 0 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.remainingCount).toBe(0);
      }
    });

    it('should resolve task by taskName when taskId not provided', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-xyz',
        taskName: 'Buy groceries',
        removedIndex: 1,
        remainingCount: 2
      });

      const result = await removeNotification({ taskName: 'Buy groceries', index: 1 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.removedIndex).toBe(1);
      }
    });

    it('should pass index correctly to OmniJS script', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-abc123',
        taskName: 'My Task',
        removedIndex: 3,
        remainingCount: 0
      });

      await removeNotification({ taskId: 'task-abc123', index: 3 });

      const scriptArg = mockedExecuteOmniJS.mock.calls[0][0] as string;
      expect(scriptArg).toContain('3');
    });
  });

  describe('error cases', () => {
    it('should return error when index out of bounds', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: false,
        error:
          'Notification index 5 is out of bounds (task has 3 notifications, valid range: 0 to 2)'
      });

      const result = await removeNotification({ taskId: 'task-abc123', index: 5 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('out of bounds');
        expect(result.error).toContain('valid range');
      }
    });

    it('should return error when task has no notifications', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'Task has no notifications to remove'
      });

      const result = await removeNotification({ taskId: 'task-abc123', index: 0 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('no notifications to remove');
      }
    });

    it('should return task not found error', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: false,
        error: "Task 'nonexistent-id' not found"
      });

      const result = await removeNotification({ taskId: 'nonexistent-id', index: 0 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should return disambiguation error when name matches multiple tasks', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: false,
        error: "Multiple tasks match name 'Buy groceries'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id-1', 'id-2', 'id-3']
      });

      const result = await removeNotification({ taskName: 'Buy groceries', index: 0 });

      expect(result.success).toBe(false);
      if (!result.success && 'code' in result) {
        expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.matchingIds).toHaveLength(3);
      }
    });

    it('should return task not found when name matches no tasks', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: false,
        error: "Task 'Unknown Task' not found"
      });

      const result = await removeNotification({ taskName: 'Unknown Task', index: 0 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('script generation', () => {
    it('should escape special characters in taskId', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'id"1',
        taskName: 'Task',
        removedIndex: 0,
        remainingCount: 0
      });

      await removeNotification({ taskId: 'id"1', index: 0 });

      const scriptArg = mockedExecuteOmniJS.mock.calls[0][0] as string;
      expect(scriptArg).toContain('\\"');
    });

    it('should escape special characters in taskName', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-1',
        taskName: 'Task "A"',
        removedIndex: 0,
        remainingCount: 0
      });

      await removeNotification({ taskName: 'Task "A"', index: 0 });

      const scriptArg = mockedExecuteOmniJS.mock.calls[0][0] as string;
      expect(scriptArg).toContain('\\"');
    });

    it('should call executeOmniJS exactly once', async () => {
      mockedExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-1',
        taskName: 'Task',
        removedIndex: 0,
        remainingCount: 0
      });

      await removeNotification({ taskId: 'task-1', index: 0 });

      expect(mockedExecuteOmniJS).toHaveBeenCalledTimes(1);
    });
  });
});
