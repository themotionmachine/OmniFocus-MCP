import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the primitive
vi.mock('../../../src/tools/primitives/getPerspectiveView.js', () => ({
  getPerspectiveView: vi.fn()
}));

import { handler, schema } from '../../../src/tools/definitions/getPerspectiveView.js';
import { getPerspectiveView } from '../../../src/tools/primitives/getPerspectiveView.js';

const mockGetPerspectiveView = vi.mocked(getPerspectiveView);

describe('getPerspectiveView definition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockExtra = {} as Parameters<typeof handler>[1];

  describe('schema validation', () => {
    it('should require perspectiveName', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should validate with perspectiveName only', () => {
      const result = schema.safeParse({ perspectiveName: 'Inbox' });
      expect(result.success).toBe(true);
    });

    it('should validate with limit', () => {
      const result = schema.safeParse({ perspectiveName: 'Inbox', limit: 50 });
      expect(result.success).toBe(true);
    });

    it('should validate with includeMetadata', () => {
      const result = schema.safeParse({ perspectiveName: 'Inbox', includeMetadata: false });
      expect(result.success).toBe(true);
    });

    it('should validate with fields array', () => {
      const result = schema.safeParse({
        perspectiveName: 'Inbox',
        fields: ['id', 'name', 'dueDate']
      });
      expect(result.success).toBe(true);
    });

    it('should validate with all options', () => {
      const result = schema.safeParse({
        perspectiveName: 'Flagged',
        limit: 100,
        includeMetadata: true,
        fields: ['id', 'name']
      });
      expect(result.success).toBe(true);
    });
  });

  describe('handler success cases', () => {
    it('should return formatted perspective view with items', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [
          {
            id: 'task-1',
            name: 'Test Task',
            flagged: true,
            completed: false,
            projectName: 'My Project',
            dueDate: '2024-12-25T10:00:00Z'
          },
          {
            id: 'task-2',
            name: 'Another Task',
            flagged: false,
            completed: false
          }
        ]
      });

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).toContain('Inbox Perspective');
      expect(result.content[0]?.text).toContain('2 items');
      expect(result.content[0]?.text).toContain('Test Task');
      expect(result.content[0]?.text).toContain('🚩');
      expect(result.content[0]?.text).toContain('My Project');
    });

    it('should handle empty perspective', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: []
      });

      const result = await handler({ perspectiveName: 'Empty' }, mockExtra);

      expect(result.content[0]?.text).toContain('0 items');
      expect(result.content[0]?.text).toContain('No items visible');
    });

    it('should format completed tasks with checkbox', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [{ id: 'task-1', name: 'Completed Task', completed: true, flagged: false }]
      });

      const result = await handler({ perspectiveName: 'Completed' }, mockExtra);

      expect(result.content[0]?.text).toContain('☑');
    });

    it('should format uncompleted tasks with empty checkbox', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [{ id: 'task-1', name: 'Active Task', completed: false, flagged: false }]
      });

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).toContain('☐');
    });

    it('should format defer date', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [
          {
            id: 'task-1',
            name: 'Deferred Task',
            deferDate: '2024-12-20T08:00:00Z',
            flagged: false,
            completed: false
          }
        ]
      });

      const result = await handler({ perspectiveName: 'Forecast' }, mockExtra);

      expect(result.content[0]?.text).toContain('[defer:');
    });

    it('should format time estimates', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [
          {
            id: 'task-1',
            name: 'Short Task',
            estimatedMinutes: 30,
            flagged: false,
            completed: false
          }
        ]
      });

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).toContain('30m');
    });

    it('should format hours for longer estimates', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [
          {
            id: 'task-1',
            name: 'Long Task',
            estimatedMinutes: 90,
            flagged: false,
            completed: false
          }
        ]
      });

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).toContain('1h30m');
    });

    it('should format tags', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [
          {
            id: 'task-1',
            name: 'Tagged Task',
            tagNames: ['Work', 'Urgent'],
            flagged: false,
            completed: false
          }
        ]
      });

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).toContain('<Work,Urgent>');
    });

    it('should format task status', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [
          {
            id: 'task-1',
            name: 'Blocked Task',
            taskStatus: 'Blocked',
            flagged: false,
            completed: false
          }
        ]
      });

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).toContain('#blocked');
    });

    it('should not show status for Available items', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [
          {
            id: 'task-1',
            name: 'Available Task',
            taskStatus: 'Available',
            flagged: false,
            completed: false
          }
        ]
      });

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).not.toContain('#available');
    });

    it('should include note preview', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [
          {
            id: 'task-1',
            name: 'Task with Note',
            note: 'This is a short note',
            flagged: false,
            completed: false
          }
        ]
      });

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).toContain('This is a short note');
      expect(result.content[0]?.text).toContain('└─');
    });

    it('should truncate long notes', async () => {
      const longNote = 'A'.repeat(100);
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [
          {
            id: 'task-1',
            name: 'Task with Long Note',
            note: longNote,
            flagged: false,
            completed: false
          }
        ]
      });

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).toContain('...');
    });

    it('should show warning when limit reached', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: Array(100)
          .fill(null)
          .map((_, i) => ({
            id: `task-${i}`,
            name: `Task ${i}`,
            flagged: false,
            completed: false
          }))
      });

      const result = await handler({ perspectiveName: 'Inbox', limit: 100 }, mockExtra);

      expect(result.content[0]?.text).toContain('⚠️ Results limited to 100 items');
    });

    it('should handle items without names', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: true,
        items: [{ id: 'task-1', flagged: false, completed: false }]
      });

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).toContain('Unnamed');
    });
  });

  describe('handler error cases', () => {
    it('should return error when primitive fails', async () => {
      mockGetPerspectiveView.mockResolvedValue({
        success: false,
        error: 'Perspective not found'
      });

      const result = await handler({ perspectiveName: 'NonExistent' }, mockExtra);

      expect(result.content[0]?.text).toContain('Failed to get perspective view');
      expect(result.content[0]?.text).toContain('Perspective not found');
      expect(result.isError).toBe(true);
    });

    it('should handle thrown exceptions', async () => {
      mockGetPerspectiveView.mockRejectedValue(new Error('Connection error'));

      const result = await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(result.content[0]?.text).toContain('Error getting perspective view');
      expect(result.content[0]?.text).toContain('Connection error');
      expect(result.isError).toBe(true);
    });
  });

  describe('parameter passing', () => {
    it('should pass parameters correctly to primitive', async () => {
      mockGetPerspectiveView.mockResolvedValue({ success: true, items: [] });

      await handler(
        {
          perspectiveName: 'Flagged',
          limit: 50,
          includeMetadata: false,
          fields: ['id', 'name']
        },
        mockExtra
      );

      expect(mockGetPerspectiveView).toHaveBeenCalledWith({
        perspectiveName: 'Flagged',
        limit: 50,
        includeMetadata: false,
        fields: ['id', 'name']
      });
    });

    it('should apply defaults for missing parameters', async () => {
      mockGetPerspectiveView.mockResolvedValue({ success: true, items: [] });

      await handler({ perspectiveName: 'Inbox' }, mockExtra);

      expect(mockGetPerspectiveView).toHaveBeenCalledWith({
        perspectiveName: 'Inbox',
        limit: 100,
        includeMetadata: true,
        fields: undefined
      });
    });
  });
});
