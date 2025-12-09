import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

import { dumpDatabase } from '../../src/tools/dumpDatabase.js';
import { executeOmniFocusScript } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('dumpDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('successful dump', () => {
    it('should return complete database with all entities', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        exportDate: '2024-12-25T00:00:00Z',
        tasks: [
          {
            id: 'task-1',
            name: 'Task 1',
            note: 'Task note',
            taskStatus: 'Available',
            flagged: true,
            dueDate: '2024-12-31T17:00:00Z',
            deferDate: null,
            effectiveDueDate: '2024-12-31T17:00:00Z',
            effectiveDeferDate: null,
            estimatedMinutes: 30,
            completedByChildren: false,
            sequential: false,
            tags: ['tag-1'],
            projectID: 'project-1',
            parentTaskID: null,
            children: [],
            inInbox: false
          }
        ],
        projects: {
          'project-1': {
            id: 'project-1',
            name: 'Project 1',
            status: 'Active',
            folderID: 'folder-1',
            sequential: false,
            effectiveDueDate: null,
            effectiveDeferDate: null,
            dueDate: null,
            deferDate: null,
            completedByChildren: false,
            containsSingletonActions: false,
            note: 'Project note',
            tasks: ['task-1']
          }
        },
        folders: {
          'folder-1': {
            id: 'folder-1',
            name: 'Folder 1',
            parentFolderID: null,
            status: 'Active',
            projects: ['project-1'],
            subfolders: []
          }
        },
        tags: {
          'tag-1': {
            id: 'tag-1',
            name: 'Tag 1',
            parentTagID: null,
            active: true,
            allowsNextAction: true,
            tasks: ['task-1']
          }
        }
      });

      const resultPromise = dumpDatabase();
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result.exportDate).toBe('2024-12-25T00:00:00Z');
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]?.id).toBe('task-1');
      expect(result.tasks[0]?.tagNames).toContain('Tag 1');
      expect(Object.keys(result.projects)).toHaveLength(1);
      expect(Object.keys(result.folders)).toHaveLength(1);
      expect(Object.keys(result.tags)).toHaveLength(1);
    });

    it('should return empty database when no data returned', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue(null);

      const resultPromise = dumpDatabase();
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result.tasks).toEqual([]);
      expect(result.projects).toEqual({});
      expect(result.folders).toEqual({});
      expect(result.tags).toEqual({});
    });

    it('should handle missing tag lookups gracefully', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        exportDate: '2024-12-25T00:00:00Z',
        tasks: [
          {
            id: 'task-1',
            name: 'Task 1',
            taskStatus: 'Available',
            flagged: false,
            tags: ['non-existent-tag'],
            children: [],
            inInbox: false
          }
        ],
        projects: {},
        folders: {},
        tags: {}
      });

      const resultPromise = dumpDatabase();
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result.tasks[0]?.tagNames).toContain('Unknown Tag');
    });

    it('should convert task status to active/inactive correctly', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        exportDate: '2024-12-25T00:00:00Z',
        tasks: [
          {
            id: 'task-1',
            name: 'Active Task',
            taskStatus: 'Available',
            flagged: false,
            tags: [],
            children: [],
            inInbox: false
          },
          {
            id: 'task-2',
            name: 'Completed Task',
            taskStatus: 'Completed',
            flagged: false,
            tags: [],
            children: [],
            inInbox: false
          },
          {
            id: 'task-3',
            name: 'Dropped Task',
            taskStatus: 'Dropped',
            flagged: false,
            tags: [],
            children: [],
            inInbox: false
          }
        ],
        projects: {},
        folders: {},
        tags: {}
      });

      const resultPromise = dumpDatabase();
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result.tasks[0]?.active).toBe(true);
      expect(result.tasks[0]?.completed).toBe(false);
      expect(result.tasks[1]?.active).toBe(false);
      expect(result.tasks[1]?.completed).toBe(true);
      expect(result.tasks[2]?.active).toBe(false);
    });

    it('should handle tasks with children', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        exportDate: '2024-12-25T00:00:00Z',
        tasks: [
          {
            id: 'parent-task',
            name: 'Parent Task',
            taskStatus: 'Available',
            flagged: false,
            tags: [],
            children: ['child-1', 'child-2'],
            inInbox: false
          }
        ],
        projects: {},
        folders: {},
        tags: {}
      });

      const resultPromise = dumpDatabase();
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result.tasks[0]?.childIds).toEqual(['child-1', 'child-2']);
      expect(result.tasks[0]?.hasChildren).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error when script execution fails', async () => {
      vi.useRealTimers(); // Use real timers for this test
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('Script failed'));

      await expect(dumpDatabase()).rejects.toThrow('Script failed');
    });
  });

  describe('data conversion', () => {
    it('should handle empty tasks array', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        exportDate: '2024-12-25T00:00:00Z',
        tasks: [],
        projects: {},
        folders: {},
        tags: {}
      });

      const resultPromise = dumpDatabase();
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result.tasks).toEqual([]);
    });

    it('should handle null dates correctly', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        exportDate: '2024-12-25T00:00:00Z',
        tasks: [
          {
            id: 'task-1',
            name: 'Task without dates',
            taskStatus: 'Available',
            flagged: false,
            dueDate: null,
            deferDate: null,
            estimatedMinutes: null,
            tags: [],
            children: [],
            inInbox: true
          }
        ],
        projects: {},
        folders: {},
        tags: {}
      });

      const resultPromise = dumpDatabase();
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result.tasks[0]?.dueDate).toBeNull();
      expect(result.tasks[0]?.deferDate).toBeNull();
      expect(result.tasks[0]?.estimatedMinutes).toBeNull();
    });
  });
});
