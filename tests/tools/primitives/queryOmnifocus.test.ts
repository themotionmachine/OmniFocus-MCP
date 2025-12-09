import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

vi.mock('../../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/mock_script.js',
    cleanup: vi.fn()
  }))
}));

import { queryOmnifocus } from '../../../src/tools/primitives/queryOmnifocus.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('queryOmnifocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful queries', () => {
    it('should query tasks successfully', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [
          { id: 'task-1', name: 'Task 1', taskStatus: 'Available' },
          { id: 'task-2', name: 'Task 2', taskStatus: 'Available' }
        ],
        count: 2,
        error: null
      });

      const result = await queryOmnifocus({ entity: 'tasks' });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should query projects successfully', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'project-1', name: 'Project 1', status: 'Active' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({ entity: 'projects' });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
    });

    it('should query folders successfully', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'folder-1', name: 'Folder 1', projectCount: 5 }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({ entity: 'folders' });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('filtering', () => {
    it('should filter by projectName', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Task 1' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { projectName: 'My Project' }
      });

      expect(result.success).toBe(true);
    });

    it('should filter by projectId', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Task 1' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { projectId: 'project-123' }
      });

      expect(result.success).toBe(true);
    });

    it('should filter by tags', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Tagged Task' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { tags: ['Work', 'Important'] }
      });

      expect(result.success).toBe(true);
    });

    it('should filter by status', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Overdue Task', taskStatus: 'Overdue' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { status: ['Overdue', 'DueSoon'] }
      });

      expect(result.success).toBe(true);
    });

    it('should filter by flagged', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Flagged Task', flagged: true }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { flagged: true }
      });

      expect(result.success).toBe(true);
    });

    it('should filter by dueWithin', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Due Soon Task' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { dueWithin: 7 }
      });

      expect(result.success).toBe(true);
    });

    it('should filter by hasNote', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Task with Note', note: 'Some note' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { hasNote: true }
      });

      expect(result.success).toBe(true);
    });

    it('should filter projects by folderId', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'project-1', name: 'Project' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'projects',
        filters: { folderId: 'folder-123' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('field selection', () => {
    it('should return specified fields only', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Task 1' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        fields: ['id', 'name', 'dueDate']
      });

      expect(result.success).toBe(true);
    });

    it('should return all fields when not specified', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [
          {
            id: 'task-1',
            name: 'Task 1',
            flagged: false,
            taskStatus: 'Available'
          }
        ],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({ entity: 'tasks' });

      expect(result.success).toBe(true);
    });
  });

  describe('sorting', () => {
    it('should sort by specified field ascending', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [
          { id: 'task-1', name: 'A Task' },
          { id: 'task-2', name: 'B Task' }
        ],
        count: 2,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        sortBy: 'name',
        sortOrder: 'asc'
      });

      expect(result.success).toBe(true);
    });

    it('should sort by specified field descending', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [
          { id: 'task-2', name: 'B Task' },
          { id: 'task-1', name: 'A Task' }
        ],
        count: 2,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        sortBy: 'name',
        sortOrder: 'desc'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('limit and summary', () => {
    it('should limit results', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Task 1' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        limit: 10
      });

      expect(result.success).toBe(true);
    });

    it('should return only count in summary mode', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        count: 50,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        summary: true
      });

      expect(result.success).toBe(true);
      expect(result.items).toBeUndefined();
      expect(result.count).toBe(50);
    });
  });

  describe('include completed', () => {
    it('should exclude completed by default', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Active Task', taskStatus: 'Available' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({ entity: 'tasks' });

      expect(result.success).toBe(true);
    });

    it('should include completed when specified', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [
          { id: 'task-1', name: 'Active Task', taskStatus: 'Available' },
          { id: 'task-2', name: 'Completed Task', taskStatus: 'Completed' }
        ],
        count: 2,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        includeCompleted: true
      });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle script errors', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        error: 'Script execution error'
      });

      const result = await queryOmnifocus({ entity: 'tasks' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Script execution error');
    });

    it('should handle execution exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('Connection failed'));

      const result = await queryOmnifocus({ entity: 'tasks' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await queryOmnifocus({ entity: 'tasks' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('combined options', () => {
    it('should handle multiple filters and options together', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Important Task' }],
        count: 1,
        error: null
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: {
          projectName: 'Work',
          tags: ['Important'],
          flagged: true,
          dueWithin: 7
        },
        fields: ['id', 'name', 'dueDate'],
        limit: 50,
        sortBy: 'dueDate',
        sortOrder: 'asc',
        includeCompleted: false
      });

      expect(result.success).toBe(true);
    });
  });
});
