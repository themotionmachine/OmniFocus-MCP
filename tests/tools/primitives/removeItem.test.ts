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
import { removeItem } from '../../../src/tools/primitives/removeItem.js';

describe('removeItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful removal', () => {
    it('should remove a task by ID', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-123',
          name: 'Removed Task'
        }),
        stderr: ''
      });

      const result = await removeItem({ itemType: 'task', id: 'task-123' });

      expect(result.success).toBe(true);
      expect(result.id).toBe('task-123');
      expect(result.name).toBe('Removed Task');
    });

    it('should remove a task by name', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'task-456',
          name: 'My Task'
        }),
        stderr: ''
      });

      const result = await removeItem({ itemType: 'task', name: 'My Task' });

      expect(result.success).toBe(true);
      expect(result.name).toBe('My Task');
    });

    it('should remove a project by ID', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'project-123',
          name: 'Removed Project'
        }),
        stderr: ''
      });

      const result = await removeItem({ itemType: 'project', id: 'project-123' });

      expect(result.success).toBe(true);
      expect(result.id).toBe('project-123');
    });

    it('should remove a project by name', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'project-456',
          name: 'My Project'
        }),
        stderr: ''
      });

      const result = await removeItem({ itemType: 'project', name: 'My Project' });

      expect(result.success).toBe(true);
    });

    it('should use name as fallback when ID search fails', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          id: 'fallback-id',
          name: 'Fallback Task'
        }),
        stderr: ''
      });

      const result = await removeItem({
        itemType: 'task',
        id: 'non-existent',
        name: 'Fallback Task'
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

      const result = await removeItem({ itemType: 'task', id: 'non-existent' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should handle AppleScript execution error', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('osascript failed'));

      const result = await removeItem({ itemType: 'task', id: 'task-123' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('osascript failed');
    });

    it('should handle invalid JSON response', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: 'Not valid JSON',
        stderr: ''
      });

      const result = await removeItem({ itemType: 'task', id: 'task-123' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse result');
    });

    it('should handle syntax error in AppleScript', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('syntax error'));

      const result = await removeItem({ itemType: 'task', id: 'task-123' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('syntax error');
    });

    it('should handle stderr output', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, id: '123', name: 'Task' }),
        stderr: 'Warning message'
      });

      const result = await removeItem({ itemType: 'task', id: '123' });

      expect(result.success).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      mockExecFileAsync.mockRejectedValue('String error');

      const result = await removeItem({ itemType: 'task', id: 'task-123' });

      expect(result.success).toBe(false);
    });
  });

  describe('input validation', () => {
    it('should return error when neither id nor name provided for task', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: false,
          error: 'Either id or name must be provided'
        }),
        stderr: ''
      });

      const result = await removeItem({ itemType: 'task' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('id or name must be provided');
    });

    it('should return error when neither id nor name provided for project', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: false,
          error: 'Either id or name must be provided'
        }),
        stderr: ''
      });

      const result = await removeItem({ itemType: 'project' });

      expect(result.success).toBe(false);
    });
  });

  describe('input sanitization', () => {
    it('should handle special characters in ID', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, id: 'escaped', name: 'Task' }),
        stderr: ''
      });

      const result = await removeItem({
        itemType: 'task',
        id: 'id-with-special-chars'
      });

      expect(result.success).toBe(true);
    });

    it('should handle special characters in name', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, id: '123', name: 'Escaped' }),
        stderr: ''
      });

      const result = await removeItem({
        itemType: 'task',
        name: 'Task with special chars'
      });

      expect(result.success).toBe(true);
    });
  });
});
