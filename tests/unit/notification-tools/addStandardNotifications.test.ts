import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addStandardNotifications } from '../../../src/tools/primitives/addStandardNotifications.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T032: Unit tests for addStandardNotifications primitive

describe('addStandardNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeRelativeNotif = (index: number, offset: number) => ({
    index,
    kind: 'DueRelative',
    initialFireDate: '2026-03-16T10:00:00.000Z',
    nextFireDate: '2026-03-16T10:00:00.000Z',
    isSnoozed: false,
    repeatInterval: null,
    relativeFireOffset: offset
  });

  describe('preset: day_before', () => {
    it('should add 1 notification with offset -86400', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Test Task',
        addedCount: 1,
        notifications: [makeRelativeNotif(0, -86400)]
      });

      const result = await addStandardNotifications({
        taskId: 'task123',
        preset: 'day_before'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.addedCount).toBe(1);
        expect(result.notifications).toHaveLength(1);
        expect(result.notifications[0].relativeFireOffset).toBe(-86400);
      }
      expect(executeOmniJS).toHaveBeenCalledOnce();
      const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
      expect(script).toContain('-86400');
    });
  });

  describe('preset: hour_before', () => {
    it('should add 1 notification with offset -3600', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Test Task',
        addedCount: 1,
        notifications: [makeRelativeNotif(0, -3600)]
      });

      const result = await addStandardNotifications({
        taskId: 'task123',
        preset: 'hour_before'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.addedCount).toBe(1);
        expect(result.notifications[0].relativeFireOffset).toBe(-3600);
      }
      const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
      expect(script).toContain('-3600');
    });
  });

  describe('preset: 15_minutes', () => {
    it('should add 1 notification with offset -900', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Test Task',
        addedCount: 1,
        notifications: [makeRelativeNotif(0, -900)]
      });

      const result = await addStandardNotifications({
        taskId: 'task123',
        preset: '15_minutes'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.addedCount).toBe(1);
        expect(result.notifications[0].relativeFireOffset).toBe(-900);
      }
      const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
      expect(script).toContain('-900');
    });
  });

  describe('preset: week_before', () => {
    it('should add 1 notification with offset -604800', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Test Task',
        addedCount: 1,
        notifications: [makeRelativeNotif(0, -604800)]
      });

      const result = await addStandardNotifications({
        taskId: 'task123',
        preset: 'week_before'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.addedCount).toBe(1);
        expect(result.notifications[0].relativeFireOffset).toBe(-604800);
      }
      const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
      expect(script).toContain('-604800');
    });
  });

  describe('preset: standard', () => {
    it('should add 2 notifications with offsets -86400 and -3600', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Test Task',
        addedCount: 2,
        notifications: [makeRelativeNotif(0, -86400), makeRelativeNotif(1, -3600)]
      });

      const result = await addStandardNotifications({
        taskId: 'task123',
        preset: 'standard'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.addedCount).toBe(2);
        expect(result.notifications).toHaveLength(2);
        expect(result.notifications[0].relativeFireOffset).toBe(-86400);
        expect(result.notifications[1].relativeFireOffset).toBe(-3600);
      }
      const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
      expect(script).toContain('-86400');
      expect(script).toContain('-3600');
    });
  });

  describe('no effectiveDueDate', () => {
    it('should return error when task has no effectiveDueDate', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Task 'task123' has no due date; cannot add relative notifications"
      });

      const result = await addStandardNotifications({
        taskId: 'task123',
        preset: 'day_before'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('no due date');
      }
    });
  });

  describe('additive behavior', () => {
    it('should preserve existing notifications when adding new ones', async () => {
      // The primitive is additive — it does not remove existing notifications
      // The OmniJS script records beforeCount and adds from there
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Test Task',
        addedCount: 1,
        // Existing notification at index 0, new one at index 1
        notifications: [makeRelativeNotif(1, -86400)]
      });

      const result = await addStandardNotifications({
        taskId: 'task123',
        preset: 'day_before'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // Only the added notification is returned
        expect(result.addedCount).toBe(1);
        expect(result.notifications[0].index).toBe(1);
      }
    });
  });

  describe('task resolution errors', () => {
    it('should return error when task not found by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: "Task 'nonexistent' not found"
      });

      const result = await addStandardNotifications({
        taskId: 'nonexistent',
        preset: 'day_before'
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

      const result = await addStandardNotifications({
        taskName: 'My Task',
        preset: 'standard'
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

      const result = await addStandardNotifications({
        taskName: 'Nonexistent Task',
        preset: 'hour_before'
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
        addedCount: 1,
        notifications: [makeRelativeNotif(0, -86400)]
      });

      await addStandardNotifications({
        taskId: 'task123',
        preset: 'day_before'
      });

      expect(executeOmniJS).toHaveBeenCalledWith(expect.stringContaining('function'));
    });

    it('should escape special characters in taskId', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task"123',
        taskName: 'Test Task',
        addedCount: 1,
        notifications: [makeRelativeNotif(0, -86400)]
      });

      await addStandardNotifications({
        taskId: 'task"123',
        preset: 'day_before'
      });

      const scriptArg = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
      expect(scriptArg).not.toContain('task"123');
    });

    it('should escape special characters in taskName', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        taskId: 'task123',
        taskName: 'Task "with" quotes',
        addedCount: 1,
        notifications: [makeRelativeNotif(0, -86400)]
      });

      await addStandardNotifications({
        taskName: 'Task "with" quotes',
        preset: 'day_before'
      });

      const scriptArg = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
      expect(scriptArg).not.toContain('"with"');
    });
  });
});
