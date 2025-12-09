import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dumpDatabase primitive
vi.mock('../../../src/tools/dumpDatabase.js', () => ({
  dumpDatabase: vi.fn()
}));

import { handler, schema } from '../../../src/tools/definitions/dumpDatabase.js';
import { dumpDatabase } from '../../../src/tools/dumpDatabase.js';

const mockDumpDatabase = vi.mocked(dumpDatabase);

describe('dumpDatabase definition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockExtra = {} as Parameters<typeof handler>[1];

  describe('schema validation', () => {
    it('should validate empty object (all defaults)', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate with hideCompleted', () => {
      const result = schema.safeParse({ hideCompleted: false });
      expect(result.success).toBe(true);
    });

    it('should validate with hideRecurringDuplicates', () => {
      const result = schema.safeParse({ hideRecurringDuplicates: false });
      expect(result.success).toBe(true);
    });

    it('should validate with both options', () => {
      const result = schema.safeParse({ hideCompleted: true, hideRecurringDuplicates: true });
      expect(result.success).toBe(true);
    });
  });

  describe('handler success cases', () => {
    const emptyDatabase = {
      folders: {},
      projects: {},
      tags: {},
      tasks: []
    };

    it('should return formatted report header', async () => {
      mockDumpDatabase.mockResolvedValue(emptyDatabase);

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('# OMNIFOCUS');
      expect(result.content[0]?.text).toContain('FORMAT LEGEND');
    });

    it('should include format legend', async () => {
      mockDumpDatabase.mockResolvedValue(emptyDatabase);

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('F: Folder');
      expect(result.content[0]?.text).toContain('P: Project');
      expect(result.content[0]?.text).toContain('•: Task');
      expect(result.content[0]?.text).toContain('🚩: Flagged');
    });

    it('should format folders', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {
          'folder-1': {
            id: 'folder-1',
            name: 'Work',
            parentFolderID: null,
            subfolders: [],
            projects: []
          }
        },
        projects: {},
        tags: {},
        tasks: []
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('F: Work');
    });

    it('should format nested folders', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {
          'folder-1': {
            id: 'folder-1',
            name: 'Work',
            parentFolderID: null,
            subfolders: ['folder-2'],
            projects: []
          },
          'folder-2': {
            id: 'folder-2',
            name: 'Projects',
            parentFolderID: 'folder-1',
            subfolders: [],
            projects: []
          }
        },
        projects: {},
        tags: {},
        tasks: []
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('F: Work');
      expect(result.content[0]?.text).toContain('F: Projects');
    });

    it('should format projects', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {
          'folder-1': {
            id: 'folder-1',
            name: 'Work',
            parentFolderID: null,
            subfolders: [],
            projects: ['project-1']
          }
        },
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'My Project',
            status: 'Active',
            folderID: 'folder-1',
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: []
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('P: My Project');
    });

    it('should format flagged projects', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Important Project',
            status: 'Active',
            folderID: null,
            flagged: true,
            dueDate: null
          }
        },
        tags: {},
        tasks: []
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('P: Important Project 🚩');
    });

    it('should format project with due date', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Due Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: '2024-12-25T10:00:00Z'
          }
        },
        tags: {},
        tasks: []
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('[DUE:12/25]');
    });

    it('should format project on hold', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Paused Project',
            status: 'OnHold',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: []
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('[OnHold]');
    });

    it('should format dropped project', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Dropped Project',
            status: 'Dropped',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: []
      });

      const result = await handler({ hideCompleted: false }, mockExtra);

      expect(result.content[0]?.text).toContain('[Dropped]');
    });

    it('should hide completed/dropped projects by default', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Done Project',
            status: 'Done',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: []
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).not.toContain('Done Project');
    });

    it('should format tasks', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'My Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: [
          {
            id: 'task-1',
            name: 'Do something',
            projectId: 'project-1',
            parentId: null,
            completed: false,
            flagged: false,
            taskStatus: 'Available',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: null,
            tagNames: [],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('• Do something');
    });

    it('should format flagged tasks', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: [
          {
            id: 'task-1',
            name: 'Important task',
            projectId: 'project-1',
            parentId: null,
            completed: false,
            flagged: true,
            taskStatus: 'Available',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: null,
            tagNames: [],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('🚩 Important task');
    });

    it('should format task with due date', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: [
          {
            id: 'task-1',
            name: 'Due task',
            projectId: 'project-1',
            parentId: null,
            completed: false,
            flagged: false,
            taskStatus: 'DueSoon',
            dueDate: '2024-12-25T17:00:00Z',
            deferDate: null,
            estimatedMinutes: null,
            tagNames: [],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('[DUE:12/25]');
    });

    it('should format task with defer date', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: [
          {
            id: 'task-1',
            name: 'Deferred task',
            projectId: 'project-1',
            parentId: null,
            completed: false,
            flagged: false,
            taskStatus: 'Blocked',
            dueDate: null,
            deferDate: '2024-12-20T08:00:00Z',
            estimatedMinutes: null,
            tagNames: [],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('[defer:12/20]');
    });

    it('should format task duration in minutes', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: [
          {
            id: 'task-1',
            name: 'Quick task',
            projectId: 'project-1',
            parentId: null,
            completed: false,
            flagged: false,
            taskStatus: 'Available',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: 30,
            tagNames: [],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('(30m)');
    });

    it('should format task duration in hours', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: [
          {
            id: 'task-1',
            name: 'Long task',
            projectId: 'project-1',
            parentId: null,
            completed: false,
            flagged: false,
            taskStatus: 'Available',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: 120,
            tagNames: [],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('(2h)');
    });

    it('should format task tags with abbreviations', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {
          'tag-1': { id: 'tag-1', name: 'Work' },
          'tag-2': { id: 'tag-2', name: 'Personal' }
        },
        tasks: [
          {
            id: 'task-1',
            name: 'Tagged task',
            projectId: 'project-1',
            parentId: null,
            completed: false,
            flagged: false,
            taskStatus: 'Available',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: null,
            tagNames: ['Work', 'Personal'],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('<');
      expect(result.content[0]?.text).toContain('>');
    });

    it('should format task statuses', async () => {
      const statuses = [
        { status: 'Next', expected: '#next' },
        { status: 'Available', expected: '#avail' },
        { status: 'Blocked', expected: '#block' },
        { status: 'DueSoon', expected: '#due' },
        { status: 'Overdue', expected: '#over' },
        { status: 'Completed', expected: '#compl' },
        { status: 'Dropped', expected: '#drop' }
      ];

      for (const { status, expected } of statuses) {
        mockDumpDatabase.mockResolvedValue({
          folders: {},
          projects: {
            'project-1': {
              id: 'project-1',
              name: 'Project',
              status: 'Active',
              folderID: null,
              flagged: false,
              dueDate: null
            }
          },
          tags: {},
          tasks: [
            {
              id: 'task-1',
              name: 'Task',
              projectId: 'project-1',
              parentId: null,
              completed: status === 'Completed',
              flagged: false,
              taskStatus: status,
              dueDate: null,
              deferDate: null,
              estimatedMinutes: null,
              tagNames: [],
              childIds: []
            }
          ]
        });

        const result = await handler({ hideCompleted: false }, mockExtra);
        expect(result.content[0]?.text).toContain(expected);
      }
    });

    it('should format subtasks', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: [
          {
            id: 'task-1',
            name: 'Parent task',
            projectId: 'project-1',
            parentId: null,
            completed: false,
            flagged: false,
            taskStatus: 'Available',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: null,
            tagNames: [],
            childIds: ['task-2']
          },
          {
            id: 'task-2',
            name: 'Child task',
            projectId: 'project-1',
            parentId: 'task-1',
            completed: false,
            flagged: false,
            taskStatus: 'Available',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: null,
            tagNames: [],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('Parent task');
      expect(result.content[0]?.text).toContain('Child task');
    });

    it('should format inbox tasks', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {},
        tags: {},
        tasks: [
          {
            id: 'task-1',
            name: 'Inbox task',
            projectId: null,
            parentId: null,
            completed: false,
            flagged: false,
            taskStatus: 'Available',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: null,
            tagNames: [],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('P: Inbox');
      expect(result.content[0]?.text).toContain('Inbox task');
    });

    it('should hide completed tasks by default', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: [
          {
            id: 'task-1',
            name: 'Completed task',
            projectId: 'project-1',
            parentId: null,
            completed: true,
            flagged: false,
            taskStatus: 'Completed',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: null,
            tagNames: [],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).not.toContain('Completed task');
    });

    it('should show completed tasks when hideCompleted is false', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: [
          {
            id: 'task-1',
            name: 'Completed task',
            projectId: 'project-1',
            parentId: null,
            completed: true,
            flagged: false,
            taskStatus: 'Completed',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: null,
            tagNames: [],
            childIds: []
          }
        ]
      });

      const result = await handler({ hideCompleted: false }, mockExtra);

      expect(result.content[0]?.text).toContain('Completed task');
    });

    it('should handle root projects (not in any folder)', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Root Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {},
        tasks: []
      });

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('P: Root Project');
    });
  });

  describe('tag abbreviation', () => {
    it('should abbreviate tags to minimum unique prefix', async () => {
      mockDumpDatabase.mockResolvedValue({
        folders: {},
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project',
            status: 'Active',
            folderID: null,
            flagged: false,
            dueDate: null
          }
        },
        tags: {
          'tag-1': { id: 'tag-1', name: 'Work' },
          'tag-2': { id: 'tag-2', name: 'Waiting' }
        },
        tasks: [
          {
            id: 'task-1',
            name: 'Task',
            projectId: 'project-1',
            parentId: null,
            completed: false,
            flagged: false,
            taskStatus: 'Available',
            dueDate: null,
            deferDate: null,
            estimatedMinutes: null,
            tagNames: ['Work'],
            childIds: []
          }
        ]
      });

      const result = await handler({}, mockExtra);

      // Should show abbreviated tags in angle brackets
      expect(result.content[0]?.text).toMatch(/<\w+>/);
    });
  });

  describe('handler error cases', () => {
    it('should return error when dump fails', async () => {
      mockDumpDatabase.mockRejectedValue(new Error('Connection failed'));

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('Error generating report');
      expect(result.isError).toBe(true);
    });

    it('should handle generic errors gracefully', async () => {
      mockDumpDatabase.mockRejectedValue('Unknown error');

      const result = await handler({}, mockExtra);

      expect(result.content[0]?.text).toContain('Error generating report');
      expect(result.isError).toBe(true);
    });
  });
});
