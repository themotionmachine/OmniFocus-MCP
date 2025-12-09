import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted() so the mock is available during vi.mock() hoisting
const { mockExecFileAsync } = vi.hoisted(() => ({
  mockExecFileAsync: vi.fn()
}));

vi.mock('node:util', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:util')>();
  return {
    ...original,
    promisify: vi.fn(() => mockExecFileAsync)
  };
});

// Mock secureTempFile
vi.mock('../../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/mock_script.applescript',
    cleanup: vi.fn()
  }))
}));

// Import after mocking
import { editItem } from '../../../src/tools/primitives/editItem.js';

describe('editItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful edits', () => {
    it('should edit a task by ID', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Updated Task',
          changedProperties: 'name'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newName: 'Updated Task'
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('task-123');
      expect(result.changedProperties).toBe('name');
    });

    it('should edit a task by name', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-456',
          name: 'My Task',
          changedProperties: 'note'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        name: 'My Task',
        newNote: 'Updated note'
      });

      expect(result.success).toBe(true);
    });

    it('should edit a project by ID', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'project-123',
          name: 'My Project',
          changedProperties: 'name'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'project',
        id: 'project-123',
        newName: 'Renamed Project'
      });

      expect(result.success).toBe(true);
    });

    it('should edit multiple properties at once', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Task',
          changedProperties: 'name, note, flagged'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newName: 'New Name',
        newNote: 'New Note',
        newFlagged: true
      });

      expect(result.success).toBe(true);
      expect(result.changedProperties).toContain('name');
      expect(result.changedProperties).toContain('note');
      expect(result.changedProperties).toContain('flagged');
    });
  });

  describe('task status changes', () => {
    it('should mark task as completed', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Task',
          changedProperties: 'status (completed)'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newStatus: 'completed'
      });

      expect(result.success).toBe(true);
      expect(result.changedProperties).toContain('completed');
    });

    it('should mark task as dropped', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Task',
          changedProperties: 'status (dropped)'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newStatus: 'dropped'
      });

      expect(result.success).toBe(true);
    });

    it('should mark task as incomplete', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Task',
          changedProperties: 'status (incomplete)'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newStatus: 'incomplete'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('project status changes', () => {
    it('should set project status to active', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'project-123',
          name: 'Project',
          changedProperties: 'status'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'project',
        id: 'project-123',
        newProjectStatus: 'active'
      });

      expect(result.success).toBe(true);
    });

    it('should set project status to onHold', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'project-123',
          name: 'Project',
          changedProperties: 'status'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'project',
        id: 'project-123',
        newProjectStatus: 'onHold'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('date handling', () => {
    it('should update due date', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Task',
          changedProperties: 'due date'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newDueDate: '2024-12-25T17:00:00Z'
      });

      expect(result.success).toBe(true);
    });

    it('should clear due date with empty string', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Task',
          changedProperties: 'due date'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newDueDate: ''
      });

      expect(result.success).toBe(true);
    });

    it('should update defer date', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Task',
          changedProperties: 'defer date'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newDeferDate: '2024-12-20T08:00:00Z'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('tag operations', () => {
    it('should add tags to task', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Task',
          changedProperties: 'tags (added)'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        addTags: ['Tag1', 'Tag2']
      });

      expect(result.success).toBe(true);
    });

    it('should remove tags from task', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Task',
          changedProperties: 'tags (removed)'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        removeTags: ['OldTag']
      });

      expect(result.success).toBe(true);
    });

    it('should replace all tags', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Task',
          changedProperties: 'tags (replaced)'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        replaceTags: ['NewTag1', 'NewTag2']
      });

      expect(result.success).toBe(true);
    });
  });

  describe('project-specific options', () => {
    it('should update sequential setting', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'project-123',
          name: 'Project',
          changedProperties: 'sequential'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'project',
        id: 'project-123',
        newSequential: true
      });

      expect(result.success).toBe(true);
    });

    it('should move project to new folder', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'project-123',
          name: 'Project',
          changedProperties: 'folder'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'project',
        id: 'project-123',
        newFolderName: 'New Folder'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle item not found', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: false,
          error: 'Item not found'
        }),
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'non-existent'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should handle AppleScript execution error', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('osascript failed'));

      const result = await editItem({
        itemType: 'task',
        id: 'task-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('osascript failed');
    });

    it('should handle invalid JSON response', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: 'Not valid JSON',
        stderr: ''
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse result');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecFileAsync.mockRejectedValue('String error');

      const result = await editItem({
        itemType: 'task',
        id: 'task-123'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('input validation', () => {
    it('should return error when neither id nor name provided', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: false,
          error: 'Either id or name must be provided'
        }),
        stderr: ''
      });

      const result = await editItem({ itemType: 'task' });

      expect(result.success).toBe(false);
    });
  });
});
