import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the primitive
vi.mock('../../../src/tools/primitives/queryOmnifocus.js', () => ({
  queryOmnifocus: vi.fn()
}));

import { handler, schema } from '../../../src/tools/definitions/queryOmnifocus.js';
import { queryOmnifocus } from '../../../src/tools/primitives/queryOmnifocus.js';

const mockQueryOmnifocus = vi.mocked(queryOmnifocus);

describe('queryOmnifocus definition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockExtra = {} as Parameters<typeof handler>[1];

  describe('schema validation', () => {
    it('should require entity', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should validate tasks entity', () => {
      const result = schema.safeParse({ entity: 'tasks' });
      expect(result.success).toBe(true);
    });

    it('should validate projects entity', () => {
      const result = schema.safeParse({ entity: 'projects' });
      expect(result.success).toBe(true);
    });

    it('should validate folders entity', () => {
      const result = schema.safeParse({ entity: 'folders' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid entity', () => {
      const result = schema.safeParse({ entity: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should validate filters', () => {
      const result = schema.safeParse({
        entity: 'tasks',
        filters: {
          projectName: 'My Project',
          tags: ['Work'],
          status: ['Available'],
          flagged: true,
          dueWithin: 7,
          hasNote: true
        }
      });
      expect(result.success).toBe(true);
    });

    it('should validate sorting options', () => {
      const result = schema.safeParse({
        entity: 'tasks',
        sortBy: 'dueDate',
        sortOrder: 'desc'
      });
      expect(result.success).toBe(true);
    });

    it('should validate summary option', () => {
      const result = schema.safeParse({
        entity: 'tasks',
        summary: true
      });
      expect(result.success).toBe(true);
    });

    it('should validate all options combined', () => {
      const result = schema.safeParse({
        entity: 'tasks',
        filters: { flagged: true },
        fields: ['id', 'name', 'dueDate'],
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc',
        includeCompleted: true,
        summary: false
      });
      expect(result.success).toBe(true);
    });
  });

  describe('handler success cases - tasks', () => {
    it('should return formatted task results', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 2,
        items: [
          {
            id: 'task-1',
            name: 'Task One',
            flagged: true,
            projectName: 'Project A',
            dueDate: '2024-12-25T10:00:00Z',
            taskStatus: 'Available'
          },
          {
            id: 'task-2',
            name: 'Task Two',
            flagged: false,
            tagNames: ['Work', 'Urgent'],
            estimatedMinutes: 45
          }
        ]
      });

      const result = await handler({ entity: 'tasks' }, mockExtra);

      expect(result.content[0]?.text).toContain('Query Results: 2 tasks');
      expect(result.content[0]?.text).toContain('Task One');
      expect(result.content[0]?.text).toContain('🚩');
      expect(result.content[0]?.text).toContain('Project A');
      expect(result.content[0]?.text).toContain('<Work,Urgent>');
    });

    it('should return summary count when requested', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 42,
        items: []
      });

      const result = await handler({ entity: 'tasks', summary: true }, mockExtra);

      expect(result.content[0]?.text).toContain('Found 42 tasks matching your criteria');
    });

    it('should format creation and modification dates', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 1,
        items: [
          {
            id: 'task-1',
            name: 'Task',
            creationDate: '2024-01-15T10:00:00Z',
            modificationDate: '2024-12-01T14:30:00Z',
            completionDate: '2024-12-10T09:00:00Z'
          }
        ]
      });

      const result = await handler({ entity: 'tasks' }, mockExtra);

      expect(result.content[0]?.text).toContain('[created:');
      expect(result.content[0]?.text).toContain('[modified:');
      expect(result.content[0]?.text).toContain('[completed:');
    });

    it('should format defer date', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 1,
        items: [
          {
            id: 'task-1',
            name: 'Deferred Task',
            deferDate: '2024-12-20T08:00:00Z'
          }
        ]
      });

      const result = await handler({ entity: 'tasks' }, mockExtra);

      expect(result.content[0]?.text).toContain('[defer:');
    });

    it('should format time estimate in minutes', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 1,
        items: [{ id: 'task-1', name: 'Task', estimatedMinutes: 45 }]
      });

      const result = await handler({ entity: 'tasks' }, mockExtra);

      expect(result.content[0]?.text).toContain('(45m)');
    });

    it('should format time estimate in hours', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 1,
        items: [{ id: 'task-1', name: 'Task', estimatedMinutes: 120 }]
      });

      const result = await handler({ entity: 'tasks' }, mockExtra);

      expect(result.content[0]?.text).toContain('(2h)');
    });

    it('should show limit warning when applicable', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 50,
        items: Array(50)
          .fill(null)
          .map((_, i) => ({ id: `task-${i}`, name: `Task ${i}` }))
      });

      const result = await handler({ entity: 'tasks', limit: 50 }, mockExtra);

      expect(result.content[0]?.text).toContain('⚠️ Results limited to 50 items');
    });

    it('should handle empty results', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 0,
        items: []
      });

      const result = await handler({ entity: 'tasks' }, mockExtra);

      expect(result.content[0]?.text).toContain('No tasks found');
    });
  });

  describe('handler success cases - projects', () => {
    it('should return formatted project results', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 2,
        items: [
          {
            id: 'project-1',
            name: 'Project One',
            status: 'Active',
            folderName: 'Work',
            taskCount: 5,
            flagged: true
          },
          {
            id: 'project-2',
            name: 'Project Two',
            status: 'OnHold',
            dueDate: '2024-12-31T10:00:00Z'
          }
        ]
      });

      const result = await handler({ entity: 'projects' }, mockExtra);

      expect(result.content[0]?.text).toContain('Query Results: 2 projects');
      expect(result.content[0]?.text).toContain('P: 🚩 Project One');
      expect(result.content[0]?.text).toContain('📁 Work');
      expect(result.content[0]?.text).toContain('(5 tasks)');
      expect(result.content[0]?.text).toContain('[OnHold]');
    });

    it('should not show status for Active projects', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 1,
        items: [{ id: 'project-1', name: 'Active Project', status: 'Active' }]
      });

      const result = await handler({ entity: 'projects' }, mockExtra);

      expect(result.content[0]?.text).not.toContain('[Active]');
    });
  });

  describe('handler success cases - folders', () => {
    it('should return formatted folder results', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 2,
        items: [
          { id: 'folder-1', name: 'Work', projectCount: 10, path: '/Work' },
          { id: 'folder-2', name: 'Personal', projectCount: 3 }
        ]
      });

      const result = await handler({ entity: 'folders' }, mockExtra);

      expect(result.content[0]?.text).toContain('Query Results: 2 folders');
      expect(result.content[0]?.text).toContain('F: Work');
      expect(result.content[0]?.text).toContain('(10 projects)');
      expect(result.content[0]?.text).toContain('📍 /Work');
    });
  });

  describe('filter display', () => {
    it('should display applied filters', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 1,
        items: [{ id: 'task-1', name: 'Task' }]
      });

      const result = await handler(
        {
          entity: 'tasks',
          filters: {
            projectName: 'My Project',
            tags: ['Work', 'Urgent'],
            status: ['Available', 'Next'],
            flagged: true,
            dueWithin: 7,
            deferredUntil: 3,
            hasNote: true
          }
        },
        mockExtra
      );

      expect(result.content[0]?.text).toContain('Filters applied');
      expect(result.content[0]?.text).toContain('project: "My Project"');
      expect(result.content[0]?.text).toContain('tags: [Work, Urgent]');
      expect(result.content[0]?.text).toContain('status: [Available, Next]');
      expect(result.content[0]?.text).toContain('flagged: true');
      expect(result.content[0]?.text).toContain('due within 7 days');
      expect(result.content[0]?.text).toContain('deferred becoming available within 3 days');
      expect(result.content[0]?.text).toContain('has note: true');
    });

    it('should display projectId filter', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 1,
        items: [{ id: 'task-1', name: 'Task' }]
      });

      const result = await handler(
        {
          entity: 'tasks',
          filters: { projectId: 'proj-123' }
        },
        mockExtra
      );

      expect(result.content[0]?.text).toContain('projectId: "proj-123"');
    });

    it('should display folderId filter', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: true,
        count: 1,
        items: [{ id: 'project-1', name: 'Project' }]
      });

      const result = await handler(
        {
          entity: 'projects',
          filters: { folderId: 'folder-123' }
        },
        mockExtra
      );

      expect(result.content[0]?.text).toContain('folderId: "folder-123"');
    });
  });

  describe('handler error cases', () => {
    it('should return error when query fails', async () => {
      mockQueryOmnifocus.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await handler({ entity: 'tasks' }, mockExtra);

      expect(result.content[0]?.text).toContain('Query failed');
      expect(result.content[0]?.text).toContain('Database connection failed');
      expect(result.isError).toBe(true);
    });

    it('should handle thrown exceptions', async () => {
      mockQueryOmnifocus.mockRejectedValue(new Error('Unexpected error'));

      const result = await handler({ entity: 'tasks' }, mockExtra);

      expect(result.content[0]?.text).toContain('Error executing query');
      expect(result.content[0]?.text).toContain('Unexpected error');
      expect(result.isError).toBe(true);
    });
  });

  describe('parameter passing', () => {
    it('should pass all parameters to primitive', async () => {
      mockQueryOmnifocus.mockResolvedValue({ success: true, count: 0, items: [] });

      await handler(
        {
          entity: 'tasks',
          filters: { flagged: true },
          fields: ['id', 'name'],
          limit: 25,
          sortBy: 'dueDate',
          sortOrder: 'desc',
          includeCompleted: true,
          summary: false
        },
        mockExtra
      );

      expect(mockQueryOmnifocus).toHaveBeenCalledWith({
        entity: 'tasks',
        filters: { flagged: true },
        fields: ['id', 'name'],
        limit: 25,
        sortBy: 'dueDate',
        sortOrder: 'desc',
        includeCompleted: true,
        summary: false
      });
    });
  });
});
