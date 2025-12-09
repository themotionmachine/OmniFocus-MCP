import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the primitive
vi.mock('../../../src/tools/primitives/batchAddItems.js', () => ({
  batchAddItems: vi.fn()
}));

import { handler, schema } from '../../../src/tools/definitions/batchAddItems.js';
import { batchAddItems } from '../../../src/tools/primitives/batchAddItems.js';

const mockBatchAddItems = vi.mocked(batchAddItems);

describe('batchAddItems definition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockExtra = {} as Parameters<typeof handler>[1];

  describe('schema validation', () => {
    it('should validate minimal items array', () => {
      const result = schema.safeParse({
        items: [{ type: 'task', name: 'Test Task' }]
      });
      expect(result.success).toBe(true);
    });

    it('should validate mixed items array', () => {
      const result = schema.safeParse({
        items: [
          { type: 'task', name: 'Task 1', projectName: 'Project' },
          { type: 'project', name: 'Project 1', folderName: 'Work' }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should validate items with hierarchy', () => {
      const result = schema.safeParse({
        items: [
          { type: 'task', name: 'Parent', tempId: 'parent' },
          { type: 'task', name: 'Child', parentTempId: 'parent' }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty items array', () => {
      // Schema allows empty arrays; the primitive handles this case
      const result = schema.safeParse({ items: [] });
      expect(result.success).toBe(true);
    });

    it('should reject missing items', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid item type', () => {
      const result = schema.safeParse({
        items: [{ type: 'invalid', name: 'Test' }]
      });
      expect(result.success).toBe(false);
    });
  });

  describe('handler success cases', () => {
    it('should return success summary for all successful items', async () => {
      mockBatchAddItems.mockResolvedValue({
        success: true,
        results: [
          { success: true, id: 'task-1' },
          { success: true, id: 'task-2' }
        ]
      });

      const result = await handler(
        {
          items: [
            { type: 'task', name: 'Task 1' },
            { type: 'task', name: 'Task 2' }
          ]
        },
        mockExtra
      );

      expect(result.content[0]?.text).toContain('Successfully added 2');
    });

    it('should return partial success message', async () => {
      mockBatchAddItems.mockResolvedValue({
        success: true,
        results: [
          { success: true, id: 'task-1' },
          { success: false, error: 'Failed' }
        ]
      });

      const result = await handler(
        {
          items: [
            { type: 'task', name: 'Task 1' },
            { type: 'task', name: 'Task 2' }
          ]
        },
        mockExtra
      );

      expect(result.content[0]?.text).toContain('1');
      expect(result.content[0]?.text).toContain('Failed');
    });
  });

  describe('handler error cases', () => {
    it('should return error when batch operation fails completely', async () => {
      mockBatchAddItems.mockResolvedValue({
        success: false,
        results: [],
        error: 'Batch operation failed'
      });

      const result = await handler({ items: [{ type: 'task', name: 'Task' }] }, mockExtra);

      expect(result.content[0]?.text).toContain('Failed');
      expect(result.isError).toBe(true);
    });

    it('should handle thrown exceptions', async () => {
      mockBatchAddItems.mockRejectedValue(new Error('Connection error'));

      const result = await handler({ items: [{ type: 'task', name: 'Task' }] }, mockExtra);

      expect(result.content[0]?.text).toContain('Error');
      expect(result.isError).toBe(true);
    });
  });
});
