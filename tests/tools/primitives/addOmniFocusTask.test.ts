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

import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('addOmniFocusTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful task creation', () => {
    it('should create a task in inbox successfully', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: 'task-123',
        name: 'Test Task',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({ name: 'Test Task' });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-123');
      expect(result.placement).toBe('inbox');
      expect(mockExecuteOmniFocusScript).toHaveBeenCalledTimes(1);
    });

    it('should create a task in a project', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: 'task-456',
        name: 'Project Task',
        placement: 'project'
      });

      const result = await addOmniFocusTask({
        name: 'Project Task',
        projectName: 'My Project'
      });

      expect(result.success).toBe(true);
      expect(result.placement).toBe('project');
    });

    it('should create a task with all options', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: 'task-789',
        name: 'Full Task',
        placement: 'project'
      });

      const result = await addOmniFocusTask({
        name: 'Full Task',
        note: 'This is a note',
        dueDate: '2024-12-25T10:00:00Z',
        deferDate: '2024-12-20T08:00:00Z',
        flagged: true,
        estimatedMinutes: 30,
        tags: ['Work', 'Important'],
        projectName: 'My Project'
      });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-789');
    });

    it('should create a task under a parent task by ID', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: 'subtask-123',
        name: 'Subtask',
        placement: 'parent'
      });

      const result = await addOmniFocusTask({
        name: 'Subtask',
        parentTaskId: 'parent-task-id'
      });

      expect(result.success).toBe(true);
      expect(result.placement).toBe('parent');
    });

    it('should create a task under a parent task by name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: 'subtask-456',
        name: 'Named Subtask',
        placement: 'parent'
      });

      const result = await addOmniFocusTask({
        name: 'Named Subtask',
        parentTaskName: 'Parent Task Name'
      });

      expect(result.success).toBe(true);
      expect(result.placement).toBe('parent');
    });
  });

  describe('error handling', () => {
    it('should handle project not found error', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: 'Project not found: NonExistent'
      });

      const result = await addOmniFocusTask({
        name: 'Task',
        projectName: 'NonExistent'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project not found');
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await addOmniFocusTask({ name: 'Task' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('OmniFocus script execution failed');
    });

    it('should handle script error response', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: 'Script error occurred'
      });

      const result = await addOmniFocusTask({ name: 'Task' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Script error occurred');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await addOmniFocusTask({ name: 'Task' });

      expect(result.success).toBe(false);
    });
  });

  describe('input sanitization', () => {
    it('should handle task name with special characters', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: '123',
        name: 'Task with special chars',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({
        name: 'Task with special chars'
      });

      expect(result.success).toBe(true);
    });

    it('should handle empty note gracefully', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: '123',
        name: 'Task',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({
        name: 'Task',
        note: ''
      });

      expect(result.success).toBe(true);
    });

    it('should handle tags', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: '123',
        name: 'Task',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({
        name: 'Task',
        tags: ['Tag1', 'Tag2']
      });

      expect(result.success).toBe(true);
    });
  });

  describe('date handling', () => {
    it('should handle due date only', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: '123',
        name: 'Task',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({
        name: 'Task',
        dueDate: '2024-12-25'
      });

      expect(result.success).toBe(true);
    });

    it('should handle defer date only', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: '123',
        name: 'Task',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({
        name: 'Task',
        deferDate: '2024-12-20'
      });

      expect(result.success).toBe(true);
    });

    it('should handle both due and defer dates', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        taskId: '123',
        name: 'Task',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({
        name: 'Task',
        dueDate: '2024-12-25T17:00:00Z',
        deferDate: '2024-12-20T08:00:00Z'
      });

      expect(result.success).toBe(true);
    });
  });
});
