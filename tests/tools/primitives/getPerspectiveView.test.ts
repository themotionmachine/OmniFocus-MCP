import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

import { getPerspectiveView } from '../../../src/tools/primitives/getPerspectiveView.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('getPerspectiveView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockItems = [
    {
      id: 'task-1',
      name: 'Task 1',
      flagged: true,
      dueDate: '2024-12-25T17:00:00Z',
      taskStatus: 'Available',
      projectName: 'Project A',
      tagNames: ['Work', 'Important']
    },
    {
      id: 'task-2',
      name: 'Task 2',
      flagged: false,
      dueDate: null,
      taskStatus: 'Available',
      projectName: 'Project B',
      tagNames: []
    },
    {
      id: 'task-3',
      name: 'Task 3',
      flagged: false,
      completed: true,
      completionDate: '2024-12-20T10:00:00Z',
      taskStatus: 'Completed',
      projectName: 'Project A',
      tagNames: ['Personal']
    }
  ];

  describe('successful view retrieval', () => {
    it('should get perspective view successfully', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Inbox',
        items: mockItems
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(3);
    });

    it('should get perspective view with matching perspective name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Forecast',
        items: mockItems
      });

      const result = await getPerspectiveView({ perspectiveName: 'Forecast' });

      expect(result.success).toBe(true);
    });

    it('should warn when current perspective differs from requested', async () => {
      const warnSpy = vi.spyOn(console, 'warn');

      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Projects',
        items: mockItems
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Current perspective is "Projects"')
      );
    });
  });

  describe('limit handling', () => {
    it('should limit results to specified count', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Inbox',
        items: mockItems
      });

      const result = await getPerspectiveView({
        perspectiveName: 'Inbox',
        limit: 2
      });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
    });

    it('should use default limit of 100', async () => {
      const manyItems = Array.from({ length: 150 }, (_, i) => ({
        id: `task-${i}`,
        name: `Task ${i}`
      }));

      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Inbox',
        items: manyItems
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(100);
    });

    it('should return all items when less than limit', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Inbox',
        items: mockItems
      });

      const result = await getPerspectiveView({
        perspectiveName: 'Inbox',
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(3);
    });
  });

  describe('field filtering', () => {
    it('should return only specified fields', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Inbox',
        items: mockItems
      });

      const result = await getPerspectiveView({
        perspectiveName: 'Inbox',
        fields: ['id', 'name']
      });

      expect(result.success).toBe(true);
      result.items?.forEach((item) => {
        expect(Object.keys(item)).toEqual(['id', 'name']);
      });
    });

    it('should handle fields that do not exist on item', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Inbox',
        items: [{ id: 'task-1', name: 'Task 1' }]
      });

      const result = await getPerspectiveView({
        perspectiveName: 'Inbox',
        fields: ['id', 'nonExistentField']
      });

      expect(result.success).toBe(true);
      expect(result.items?.[0]).toEqual({ id: 'task-1' });
    });

    it('should return all fields when fields array is empty', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Inbox',
        items: mockItems
      });

      const result = await getPerspectiveView({
        perspectiveName: 'Inbox',
        fields: []
      });

      expect(result.success).toBe(true);
      expect(result.items?.[0]).toEqual(mockItems[0]);
    });
  });

  describe('error handling', () => {
    it('should handle script errors', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        error: 'Failed to get perspective view'
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get perspective view');
    });

    it('should handle execution exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('Connection failed'));

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should handle missing items array', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Inbox'
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(true);
      expect(result.items).toEqual([]);
    });
  });

  describe('combined options', () => {
    it('should apply both limit and field filtering', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'Inbox',
        items: mockItems
      });

      const result = await getPerspectiveView({
        perspectiveName: 'Inbox',
        limit: 2,
        fields: ['id', 'name']
      });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      result.items?.forEach((item) => {
        expect(Object.keys(item)).toEqual(['id', 'name']);
      });
    });
  });

  describe('case-insensitive perspective matching', () => {
    it('should match perspective name case-insensitively', async () => {
      const warnSpy = vi.spyOn(console, 'warn');

      mockExecuteOmniFocusScript.mockResolvedValue({
        perspectiveName: 'INBOX',
        items: mockItems
      });

      const result = await getPerspectiveView({ perspectiveName: 'inbox' });

      expect(result.success).toBe(true);
      // Should not warn since case-insensitive match
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
