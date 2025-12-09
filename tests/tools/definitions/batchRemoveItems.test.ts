import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the primitive
vi.mock('../../../src/tools/primitives/batchRemoveItems.js', () => ({
  batchRemoveItems: vi.fn()
}));

import { handler, schema } from '../../../src/tools/definitions/batchRemoveItems.js';
import { batchRemoveItems } from '../../../src/tools/primitives/batchRemoveItems.js';

const mockBatchRemoveItems = vi.mocked(batchRemoveItems);

describe('batchRemoveItems definition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockExtra = {} as Parameters<typeof handler>[1];

  describe('schema validation', () => {
    it('should validate items array with id', () => {
      const result = schema.safeParse({
        items: [{ id: 'task-123', itemType: 'task' }]
      });
      expect(result.success).toBe(true);
    });

    it('should validate items array with name', () => {
      const result = schema.safeParse({
        items: [{ name: 'My Task', itemType: 'task' }]
      });
      expect(result.success).toBe(true);
    });

    it('should validate mixed items array', () => {
      const result = schema.safeParse({
        items: [
          { id: 'task-1', itemType: 'task' },
          { name: 'Project 1', itemType: 'project' }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid itemType', () => {
      const result = schema.safeParse({
        items: [{ id: 'id-123', itemType: 'folder' }]
      });
      expect(result.success).toBe(false);
    });
  });

  describe('handler success cases', () => {
    it('should return success summary for all removed items', async () => {
      mockBatchRemoveItems.mockResolvedValue({
        success: true,
        results: [
          { success: true, id: 'task-1', name: 'Task 1' },
          { success: true, id: 'task-2', name: 'Task 2' }
        ]
      });

      const result = await handler(
        {
          items: [
            { id: 'task-1', itemType: 'task' },
            { id: 'task-2', itemType: 'task' }
          ]
        },
        mockExtra
      );

      expect(result.content[0]?.text).toContain('Successfully removed 2');
    });

    it('should return partial success message', async () => {
      mockBatchRemoveItems.mockResolvedValue({
        success: true,
        results: [
          { success: true, id: 'task-1', name: 'Task 1' },
          { success: false, error: 'Not found' }
        ]
      });

      const result = await handler(
        {
          items: [
            { id: 'task-1', itemType: 'task' },
            { id: 'task-2', itemType: 'task' }
          ]
        },
        mockExtra
      );

      expect(result.content[0]?.text).toContain('1');
      expect(result.content[0]?.text).toContain('Failed');
    });
  });

  describe('handler error cases', () => {
    it('should return error when item has neither id nor name', async () => {
      const result = await handler({ items: [{ itemType: 'task' }] }, mockExtra);

      expect(result.content[0]?.text).toContain('id or name');
      expect(result.isError).toBe(true);
    });

    it('should return error when batch operation fails', async () => {
      mockBatchRemoveItems.mockResolvedValue({
        success: false,
        results: [],
        error: 'Batch operation failed'
      });

      const result = await handler({ items: [{ id: 'task-1', itemType: 'task' }] }, mockExtra);

      expect(result.content[0]?.text).toContain('Failed');
      expect(result.isError).toBe(true);
    });

    it('should handle thrown exceptions', async () => {
      mockBatchRemoveItems.mockRejectedValue(new Error('Connection error'));

      const result = await handler({ items: [{ id: 'task-1', itemType: 'task' }] }, mockExtra);

      expect(result.content[0]?.text).toContain('Error');
      expect(result.isError).toBe(true);
    });
  });
});
