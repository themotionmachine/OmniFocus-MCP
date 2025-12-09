import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the primitive
vi.mock('../../../src/tools/primitives/editItem.js', () => ({
  editItem: vi.fn()
}));

import { handler, schema } from '../../../src/tools/definitions/editItem.js';
import { editItem } from '../../../src/tools/primitives/editItem.js';

const mockEditItem = vi.mocked(editItem);

describe('editItem definition', () => {
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

    it('should validate with all task fields', () => {
      const result = schema.safeParse({
        id: 'task-123',
        itemType: 'task',
        newName: 'New Name',
        newNote: 'New Note',
        newDueDate: '2024-12-25',
        newDeferDate: '2024-12-20',
        newFlagged: true,
        newEstimatedMinutes: 30,
        newStatus: 'completed',
        addTags: ['Tag1'],
        removeTags: ['Tag2'],
        replaceTags: ['Tag3']
      });
      expect(result.success).toBe(true);
    });

    it('should validate with project fields', () => {
      const result = schema.safeParse({
        id: 'proj-123',
        itemType: 'project',
        newSequential: true,
        newFolderName: 'New Folder',
        newProjectStatus: 'onHold'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid itemType', () => {
      const result = schema.safeParse({ id: 'id-123', itemType: 'folder' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid newStatus', () => {
      const result = schema.safeParse({
        id: 'task-123',
        itemType: 'task',
        newStatus: 'invalid'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('handler success cases', () => {
    it('should return success message for updated task', async () => {
      mockEditItem.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Test Task',
        changedProperties: 'name, note'
      });

      const result = await handler(
        { id: 'task-123', itemType: 'task', newName: 'New Name' },
        mockExtra
      );

      expect(result.content[0]?.text).toContain('Task');
      expect(result.content[0]?.text).toContain('Test Task');
      expect(result.content[0]?.text).toContain('updated successfully');
      expect(result.content[0]?.text).toContain('name, note');
    });

    it('should return success message for updated project', async () => {
      mockEditItem.mockResolvedValue({
        success: true,
        id: 'proj-123',
        name: 'Test Project',
        changedProperties: 'status'
      });

      const result = await handler(
        { id: 'proj-123', itemType: 'project', newProjectStatus: 'active' },
        mockExtra
      );

      expect(result.content[0]?.text).toContain('Project');
      expect(result.content[0]?.text).toContain('Test Project');
    });

    it('should return success without changedProperties', async () => {
      mockEditItem.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Test Task'
      });

      const result = await handler({ id: 'task-123', itemType: 'task' }, mockExtra);

      expect(result.content[0]?.text).toContain('updated successfully');
    });
  });

  describe('handler error cases', () => {
    it('should return error when neither id nor name provided', async () => {
      const result = await handler({ itemType: 'task' }, mockExtra);

      expect(result.content[0]?.text).toContain('id or name must be provided');
      expect(result.isError).toBe(true);
    });

    it('should return error for item not found', async () => {
      mockEditItem.mockResolvedValue({
        success: false,
        error: 'Item not found'
      });

      const result = await handler({ id: 'non-existent', itemType: 'task' }, mockExtra);

      expect(result.content[0]?.text).toContain('not found');
      expect(result.isError).toBe(true);
    });

    it('should return error with custom error message', async () => {
      mockEditItem.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await handler({ id: 'task-123', itemType: 'task' }, mockExtra);

      expect(result.content[0]?.text).toContain('Database error');
      expect(result.isError).toBe(true);
    });

    it('should handle thrown exceptions', async () => {
      mockEditItem.mockRejectedValue(new Error('Connection error'));

      const result = await handler({ id: 'task-123', itemType: 'task' }, mockExtra);

      expect(result.content[0]?.text).toContain('Error');
      expect(result.isError).toBe(true);
    });
  });
});
