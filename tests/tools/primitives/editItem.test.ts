import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

vi.mock('../../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/mock_script.js',
    cleanup: vi.fn()
  }))
}));

import { editItem } from '../../../src/tools/primitives/editItem.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

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
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Updated Task',
        changedProperties: 'name'
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newName: 'Updated Task'
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('task-123');
      expect(result.changedProperties).toBe('name');
      expect(mockExecuteOmniFocusScript).toHaveBeenCalledTimes(1);
    });

    it('should edit a task by name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-456',
        name: 'My Task',
        changedProperties: 'note'
      });

      const result = await editItem({
        itemType: 'task',
        name: 'My Task',
        newNote: 'Updated note'
      });

      expect(result.success).toBe(true);
    });

    it('should edit a project by ID', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'My Project',
        changedProperties: 'name'
      });

      const result = await editItem({
        itemType: 'project',
        id: 'project-123',
        newName: 'Renamed Project'
      });

      expect(result.success).toBe(true);
    });

    it('should edit multiple properties at once', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'name, note, flagged'
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
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'status (completed)'
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
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'status (dropped)'
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newStatus: 'dropped'
      });

      expect(result.success).toBe(true);
    });

    it('should mark task as incomplete', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'status (incomplete)'
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
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Project',
        changedProperties: 'status'
      });

      const result = await editItem({
        itemType: 'project',
        id: 'project-123',
        newProjectStatus: 'active'
      });

      expect(result.success).toBe(true);
    });

    it('should set project status to onHold', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Project',
        changedProperties: 'status'
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
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'due date'
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newDueDate: '2024-12-25T17:00:00Z'
      });

      expect(result.success).toBe(true);
    });

    it('should clear due date with empty string', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'due date'
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        newDueDate: ''
      });

      expect(result.success).toBe(true);
    });

    it('should update defer date', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'defer date'
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
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'tags (added)'
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        addTags: ['Tag1', 'Tag2']
      });

      expect(result.success).toBe(true);
    });

    it('should remove tags from task', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'tags (removed)'
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123',
        removeTags: ['OldTag']
      });

      expect(result.success).toBe(true);
    });

    it('should replace all tags', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'tags (replaced)'
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
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Project',
        changedProperties: 'sequential'
      });

      const result = await editItem({
        itemType: 'project',
        id: 'project-123',
        newSequential: true
      });

      expect(result.success).toBe(true);
    });

    it('should move project to new folder', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Project',
        changedProperties: 'folder'
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
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: 'Item not found'
      });

      const result = await editItem({
        itemType: 'task',
        id: 'non-existent'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await editItem({
        itemType: 'task',
        id: 'task-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('OmniFocus script execution failed');
    });

    it('should handle script error response', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: 'Script error occurred'
      });

      const result = await editItem({
        itemType: 'task',
        id: 'task-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Script error occurred');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await editItem({
        itemType: 'task',
        id: 'task-123'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('input validation', () => {
    it('should return error when neither id nor name provided', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: 'Either id or name must be provided'
      });

      const result = await editItem({ itemType: 'task' });

      expect(result.success).toBe(false);
    });
  });
});
