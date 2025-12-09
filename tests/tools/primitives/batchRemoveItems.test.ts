import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the removeItem dependency
vi.mock('../../../src/tools/primitives/removeItem.js', () => ({
  removeItem: vi.fn()
}));

import { batchRemoveItems } from '../../../src/tools/primitives/batchRemoveItems.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';

const mockRemoveItem = vi.mocked(removeItem);

describe('batchRemoveItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful batch removal', () => {
    it('should remove multiple tasks successfully', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: true, id: 'task-1', name: 'Task 1' })
        .mockResolvedValueOnce({ success: true, id: 'task-2', name: 'Task 2' });

      const result = await batchRemoveItems([
        { itemType: 'task', id: 'task-1' },
        { itemType: 'task', id: 'task-2' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.success).toBe(true);
      expect(result.results[0]?.id).toBe('task-1');
      expect(result.results[1]?.success).toBe(true);
      expect(result.results[1]?.id).toBe('task-2');
    });

    it('should remove multiple projects successfully', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: true, id: 'project-1', name: 'Project 1' })
        .mockResolvedValueOnce({ success: true, id: 'project-2', name: 'Project 2' });

      const result = await batchRemoveItems([
        { itemType: 'project', id: 'project-1' },
        { itemType: 'project', id: 'project-2' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it('should remove mixed tasks and projects', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: true, id: 'task-1', name: 'Task 1' })
        .mockResolvedValueOnce({ success: true, id: 'project-1', name: 'Project 1' });

      const result = await batchRemoveItems([
        { itemType: 'task', id: 'task-1' },
        { itemType: 'project', id: 'project-1' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it('should remove items by name', async () => {
      mockRemoveItem.mockResolvedValue({ success: true, id: '123', name: 'My Task' });

      const result = await batchRemoveItems([{ itemType: 'task', name: 'My Task' }]);

      expect(result.success).toBe(true);
      expect(mockRemoveItem).toHaveBeenCalledWith({ itemType: 'task', name: 'My Task' });
    });

    it('should remove items by id and name', async () => {
      mockRemoveItem.mockResolvedValue({ success: true, id: 'task-id', name: 'Task Name' });

      const result = await batchRemoveItems([
        { itemType: 'task', id: 'task-id', name: 'Task Name' }
      ]);

      expect(result.success).toBe(true);
    });
  });

  describe('partial failure handling', () => {
    it('should report success if at least one item removed', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: true, id: 'task-1', name: 'Task 1' })
        .mockResolvedValueOnce({ success: false, error: 'Not found' });

      const result = await batchRemoveItems([
        { itemType: 'task', id: 'task-1' },
        { itemType: 'task', id: 'task-2' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results[0]?.success).toBe(true);
      expect(result.results[1]?.success).toBe(false);
    });

    it('should report failure if all items fail', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: false, error: 'Not found 1' })
        .mockResolvedValueOnce({ success: false, error: 'Not found 2' });

      const result = await batchRemoveItems([
        { itemType: 'task', id: 'task-1' },
        { itemType: 'task', id: 'task-2' }
      ]);

      expect(result.success).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle thrown exceptions during item removal', async () => {
      mockRemoveItem.mockRejectedValue(new Error('Removal error'));

      const result = await batchRemoveItems([{ itemType: 'task', id: 'task-1' }]);

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error).toContain('Removal error');
    });

    it('should handle non-Error exceptions', async () => {
      mockRemoveItem.mockRejectedValue('String error');

      const result = await batchRemoveItems([{ itemType: 'task', id: 'task-1' }]);

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error).toContain('Unknown error');
    });

    it('should handle empty items array', async () => {
      const result = await batchRemoveItems([]);

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(0);
    });

    it('should continue processing after individual failures', async () => {
      mockRemoveItem
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockResolvedValueOnce({ success: true, id: 'task-2', name: 'Task 2' })
        .mockRejectedValueOnce(new Error('Error 3'));

      const result = await batchRemoveItems([
        { itemType: 'task', id: 'task-1' },
        { itemType: 'task', id: 'task-2' },
        { itemType: 'task', id: 'task-3' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]?.success).toBe(false);
      expect(result.results[1]?.success).toBe(true);
      expect(result.results[2]?.success).toBe(false);
    });
  });

  describe('result metadata', () => {
    it('should include id and name in successful results', async () => {
      mockRemoveItem.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'My Task Name'
      });

      const result = await batchRemoveItems([{ itemType: 'task', id: 'task-123' }]);

      expect(result.results[0]?.id).toBe('task-123');
      expect(result.results[0]?.name).toBe('My Task Name');
    });

    it('should include error message in failed results', async () => {
      mockRemoveItem.mockResolvedValue({
        success: false,
        error: 'Item not found'
      });

      const result = await batchRemoveItems([{ itemType: 'task', id: 'non-existent' }]);

      expect(result.results[0]?.error).toBe('Item not found');
    });
  });

  describe('sequential processing', () => {
    it('should process items in order', async () => {
      const callOrder: string[] = [];

      mockRemoveItem.mockImplementation(async (params) => {
        callOrder.push(params.id || params.name || 'unknown');
        return { success: true, id: params.id, name: params.name };
      });

      await batchRemoveItems([
        { itemType: 'task', id: 'first' },
        { itemType: 'task', id: 'second' },
        { itemType: 'task', id: 'third' }
      ]);

      expect(callOrder).toEqual(['first', 'second', 'third']);
    });
  });
});
