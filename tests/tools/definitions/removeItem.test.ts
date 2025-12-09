import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the primitive
vi.mock('../../../src/tools/primitives/removeItem.js', () => ({
  removeItem: vi.fn()
}));

import { handler, schema } from '../../../src/tools/definitions/removeItem.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';

const mockRemoveItem = vi.mocked(removeItem);

describe('removeItem definition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockExtra = {} as Parameters<typeof handler>[1];

  describe('schema validation', () => {
    it('should validate with id and itemType', () => {
      const result = schema.safeParse({ id: 'task-123', itemType: 'task' });
      expect(result.success).toBe(true);
    });

    it('should validate with name and itemType', () => {
      const result = schema.safeParse({ name: 'My Task', itemType: 'task' });
      expect(result.success).toBe(true);
    });

    it('should validate project itemType', () => {
      const result = schema.safeParse({ id: 'proj-123', itemType: 'project' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid itemType', () => {
      const result = schema.safeParse({ id: 'id-123', itemType: 'folder' });
      expect(result.success).toBe(false);
    });

    it('should reject missing itemType', () => {
      const result = schema.safeParse({ id: 'id-123' });
      expect(result.success).toBe(false);
    });
  });

  describe('handler success cases', () => {
    it('should return success message for removed task', async () => {
      mockRemoveItem.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Test Task'
      });

      const result = await handler({ id: 'task-123', itemType: 'task' }, mockExtra);

      expect(result.content[0]?.text).toContain('Task');
      expect(result.content[0]?.text).toContain('Test Task');
      expect(result.content[0]?.text).toContain('removed successfully');
    });

    it('should return success message for removed project', async () => {
      mockRemoveItem.mockResolvedValue({
        success: true,
        id: 'proj-123',
        name: 'Test Project'
      });

      const result = await handler({ id: 'proj-123', itemType: 'project' }, mockExtra);

      expect(result.content[0]?.text).toContain('Project');
      expect(result.content[0]?.text).toContain('Test Project');
    });
  });

  describe('handler error cases', () => {
    it('should return error when neither id nor name provided', async () => {
      const result = await handler({ itemType: 'task' }, mockExtra);

      expect(result.content[0]?.text).toContain('id or name must be provided');
      expect(result.isError).toBe(true);
    });

    it('should return error for item not found', async () => {
      mockRemoveItem.mockResolvedValue({
        success: false,
        error: 'Item not found'
      });

      const result = await handler({ id: 'non-existent', itemType: 'task' }, mockExtra);

      expect(result.content[0]?.text).toContain('not found');
      expect(result.isError).toBe(true);
    });

    it('should return error with custom error message', async () => {
      mockRemoveItem.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await handler({ id: 'task-123', itemType: 'task' }, mockExtra);

      expect(result.content[0]?.text).toContain('Database error');
      expect(result.isError).toBe(true);
    });

    it('should handle thrown exceptions', async () => {
      mockRemoveItem.mockRejectedValue(new Error('Connection error'));

      const result = await handler({ id: 'task-123', itemType: 'task' }, mockExtra);

      expect(result.content[0]?.text).toContain('Error');
      expect(result.isError).toBe(true);
    });
  });
});
