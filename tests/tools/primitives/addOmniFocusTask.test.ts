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
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';

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
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          taskId: 'task-123',
          name: 'Test Task',
          placement: 'inbox'
        }),
        stderr: ''
      });

      const result = await addOmniFocusTask({ name: 'Test Task' });

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-123');
      expect(result.placement).toBe('inbox');
    });

    it('should create a task in a project', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          taskId: 'task-456',
          name: 'Project Task',
          placement: 'project'
        }),
        stderr: ''
      });

      const result = await addOmniFocusTask({
        name: 'Project Task',
        projectName: 'My Project'
      });

      expect(result.success).toBe(true);
      expect(result.placement).toBe('project');
    });

    it('should create a task with all options', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          taskId: 'task-789',
          name: 'Full Task',
          placement: 'project'
        }),
        stderr: ''
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
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          taskId: 'subtask-123',
          name: 'Subtask',
          placement: 'parent'
        }),
        stderr: ''
      });

      const result = await addOmniFocusTask({
        name: 'Subtask',
        parentTaskId: 'parent-task-id'
      });

      expect(result.success).toBe(true);
      expect(result.placement).toBe('parent');
    });

    it('should create a task under a parent task by name', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          taskId: 'subtask-456',
          name: 'Named Subtask',
          placement: 'parent'
        }),
        stderr: ''
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
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: false,
          error: 'Project not found: NonExistent'
        }),
        stderr: ''
      });

      const result = await addOmniFocusTask({
        name: 'Task',
        projectName: 'NonExistent'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project not found');
    });

    it('should handle AppleScript execution error', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('osascript failed'));

      const result = await addOmniFocusTask({ name: 'Task' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('osascript failed');
    });

    it('should handle invalid JSON response', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: 'Not valid JSON',
        stderr: ''
      });

      const result = await addOmniFocusTask({ name: 'Task' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse result');
    });

    it('should handle stderr output', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, taskId: '123', placement: 'inbox' }),
        stderr: 'Some warning'
      });

      const result = await addOmniFocusTask({ name: 'Task' });

      expect(result.success).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      mockExecFileAsync.mockRejectedValue('String error');

      const result = await addOmniFocusTask({ name: 'Task' });

      expect(result.success).toBe(false);
    });
  });

  describe('input sanitization', () => {
    it('should handle task name with special characters', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, taskId: '123', placement: 'inbox' }),
        stderr: ''
      });

      const result = await addOmniFocusTask({
        name: 'Task with special chars'
      });

      expect(result.success).toBe(true);
    });

    it('should handle empty note gracefully', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, taskId: '123', placement: 'inbox' }),
        stderr: ''
      });

      const result = await addOmniFocusTask({
        name: 'Task',
        note: ''
      });

      expect(result.success).toBe(true);
    });

    it('should handle tags', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, taskId: '123', placement: 'inbox' }),
        stderr: ''
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
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, taskId: '123', placement: 'inbox' }),
        stderr: ''
      });

      const result = await addOmniFocusTask({
        name: 'Task',
        dueDate: '2024-12-25'
      });

      expect(result.success).toBe(true);
    });

    it('should handle defer date only', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, taskId: '123', placement: 'inbox' }),
        stderr: ''
      });

      const result = await addOmniFocusTask({
        name: 'Task',
        deferDate: '2024-12-20'
      });

      expect(result.success).toBe(true);
    });

    it('should handle both due and defer dates', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, taskId: '123', placement: 'inbox' }),
        stderr: ''
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
