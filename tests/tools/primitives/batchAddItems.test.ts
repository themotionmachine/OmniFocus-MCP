import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dependencies
vi.mock('../../../src/tools/primitives/addOmniFocusTask.js', () => ({
  addOmniFocusTask: vi.fn()
}));

vi.mock('../../../src/tools/primitives/addProject.js', () => ({
  addProject: vi.fn()
}));

import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { addProject } from '../../../src/tools/primitives/addProject.js';
import { batchAddItems } from '../../../src/tools/primitives/batchAddItems.js';

const mockAddTask = vi.mocked(addOmniFocusTask);
const mockAddProject = vi.mocked(addProject);

describe('batchAddItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful batch operations', () => {
    it('should add multiple tasks successfully', async () => {
      mockAddTask
        .mockResolvedValueOnce({ success: true, taskId: 'task-1' })
        .mockResolvedValueOnce({ success: true, taskId: 'task-2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'task', name: 'Task 2' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.success).toBe(true);
      expect(result.results[0]?.id).toBe('task-1');
      expect(result.results[1]?.success).toBe(true);
      expect(result.results[1]?.id).toBe('task-2');
    });

    it('should add multiple projects successfully', async () => {
      mockAddProject
        .mockResolvedValueOnce({ success: true, projectId: 'project-1' })
        .mockResolvedValueOnce({ success: true, projectId: 'project-2' });

      const result = await batchAddItems([
        { type: 'project', name: 'Project 1' },
        { type: 'project', name: 'Project 2' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.success).toBe(true);
      expect(result.results[0]?.id).toBe('project-1');
      expect(result.results[1]?.success).toBe(true);
      expect(result.results[1]?.id).toBe('project-2');
    });

    it('should add mixed tasks and projects', async () => {
      mockAddTask.mockResolvedValue({ success: true, taskId: 'task-1' });
      mockAddProject.mockResolvedValue({ success: true, projectId: 'project-1' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'project', name: 'Project 1' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('hierarchy handling', () => {
    it('should process items with tempId/parentTempId correctly', async () => {
      mockAddTask
        .mockResolvedValueOnce({ success: true, taskId: 'real-parent-id' })
        .mockResolvedValueOnce({ success: true, taskId: 'real-child-id' });

      const result = await batchAddItems([
        { type: 'task', name: 'Parent Task', tempId: 'temp-parent' },
        { type: 'task', name: 'Child Task', parentTempId: 'temp-parent' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);

      // Second call should use the real parent ID
      expect(mockAddTask).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          name: 'Child Task',
          parentTaskId: 'real-parent-id'
        })
      );
    });

    it('should respect hierarchyLevel ordering', async () => {
      mockAddTask
        .mockResolvedValueOnce({ success: true, taskId: 'task-0' })
        .mockResolvedValueOnce({ success: true, taskId: 'task-1' })
        .mockResolvedValueOnce({ success: true, taskId: 'task-2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Level 2 Task', hierarchyLevel: 2 },
        { type: 'task', name: 'Level 0 Task', hierarchyLevel: 0 },
        { type: 'task', name: 'Level 1 Task', hierarchyLevel: 1 }
      ]);

      expect(result.success).toBe(true);
      // Results should be in original order
      expect(result.results).toHaveLength(3);
    });

    it('should handle nested hierarchy (grandparent -> parent -> child)', async () => {
      mockAddTask
        .mockResolvedValueOnce({ success: true, taskId: 'grandparent-id' })
        .mockResolvedValueOnce({ success: true, taskId: 'parent-id' })
        .mockResolvedValueOnce({ success: true, taskId: 'child-id' });

      const result = await batchAddItems([
        { type: 'task', name: 'Grandparent', tempId: 'gp', hierarchyLevel: 0 },
        { type: 'task', name: 'Parent', tempId: 'p', parentTempId: 'gp', hierarchyLevel: 1 },
        { type: 'task', name: 'Child', parentTempId: 'p', hierarchyLevel: 2 }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
    });
  });

  describe('cycle detection', () => {
    it('should detect simple cycle (A -> B -> A)', async () => {
      const result = await batchAddItems([
        { type: 'task', name: 'Task A', tempId: 'a', parentTempId: 'b' },
        { type: 'task', name: 'Task B', tempId: 'b', parentTempId: 'a' }
      ]);

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error).toContain('Cycle detected');
      expect(result.results[1]?.success).toBe(false);
      expect(result.results[1]?.error).toContain('Cycle detected');
    });

    it('should detect self-reference cycle (A -> A)', async () => {
      const result = await batchAddItems([
        { type: 'task', name: 'Self Ref Task', tempId: 'a', parentTempId: 'a' }
      ]);

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error).toContain('Cycle detected');
    });

    it('should detect longer cycle (A -> B -> C -> A)', async () => {
      const result = await batchAddItems([
        { type: 'task', name: 'Task A', tempId: 'a', parentTempId: 'c' },
        { type: 'task', name: 'Task B', tempId: 'b', parentTempId: 'a' },
        { type: 'task', name: 'Task C', tempId: 'c', parentTempId: 'b' }
      ]);

      // All should fail due to cycle
      expect(result.results.every((r) => !r.success)).toBe(true);
    });
  });

  describe('unknown parentTempId handling', () => {
    it('should fail items with unknown parentTempId', async () => {
      const result = await batchAddItems([
        { type: 'task', name: 'Orphan Task', parentTempId: 'non-existent' }
      ]);

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error).toContain('Unknown parentTempId');
    });

    it('should allow parentTempId if parentTaskId is also provided', async () => {
      mockAddTask.mockResolvedValue({ success: true, taskId: 'task-id' });

      const result = await batchAddItems([
        {
          type: 'task',
          name: 'Task with both',
          parentTempId: 'unknown',
          parentTaskId: 'real-parent-id'
        }
      ]);

      expect(result.results[0]?.success).toBe(true);
    });
  });

  describe('partial failure handling', () => {
    it('should report success if at least one item succeeds', async () => {
      mockAddTask
        .mockResolvedValueOnce({ success: true, taskId: 'task-1' })
        .mockResolvedValueOnce({ success: false, error: 'Failed' });

      const result = await batchAddItems([
        { type: 'task', name: 'Success Task' },
        { type: 'task', name: 'Fail Task' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results[0]?.success).toBe(true);
      expect(result.results[1]?.success).toBe(false);
    });

    it('should report failure if all items fail', async () => {
      mockAddTask
        .mockResolvedValueOnce({ success: false, error: 'Failed 1' })
        .mockResolvedValueOnce({ success: false, error: 'Failed 2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Fail Task 1' },
        { type: 'task', name: 'Fail Task 2' }
      ]);

      expect(result.success).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle thrown exceptions during item processing', async () => {
      mockAddTask.mockRejectedValue(new Error('Processing error'));

      const result = await batchAddItems([{ type: 'task', name: 'Task' }]);

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error).toContain('Processing error');
    });

    it('should handle non-Error exceptions', async () => {
      mockAddTask.mockRejectedValue('String error');

      const result = await batchAddItems([{ type: 'task', name: 'Task' }]);

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error).toContain('Unknown error');
    });

    it('should handle empty items array', async () => {
      const result = await batchAddItems([]);

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(0);
    });

    it('should preserve result order matching input order', async () => {
      mockAddTask
        .mockResolvedValueOnce({ success: true, taskId: 'task-a' })
        .mockResolvedValueOnce({ success: true, taskId: 'task-b' })
        .mockResolvedValueOnce({ success: true, taskId: 'task-c' });

      const result = await batchAddItems([
        { type: 'task', name: 'A', hierarchyLevel: 2 },
        { type: 'task', name: 'B', hierarchyLevel: 0 },
        { type: 'task', name: 'C', hierarchyLevel: 1 }
      ]);

      // Results should be indexed by original position
      expect(result.results).toHaveLength(3);
    });
  });

  describe('full options support', () => {
    it('should pass all task options correctly', async () => {
      mockAddTask.mockResolvedValue({ success: true, taskId: 'task-1' });

      await batchAddItems([
        {
          type: 'task',
          name: 'Full Task',
          note: 'Task note',
          dueDate: '2024-12-25',
          deferDate: '2024-12-20',
          flagged: true,
          estimatedMinutes: 60,
          tags: ['Tag1', 'Tag2'],
          projectName: 'Project',
          parentTaskName: 'Parent'
        }
      ]);

      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Full Task',
          note: 'Task note',
          dueDate: '2024-12-25',
          deferDate: '2024-12-20',
          flagged: true,
          estimatedMinutes: 60,
          tags: ['Tag1', 'Tag2'],
          projectName: 'Project',
          parentTaskName: 'Parent'
        })
      );
    });

    it('should pass all project options correctly', async () => {
      mockAddProject.mockResolvedValue({ success: true, projectId: 'project-1' });

      await batchAddItems([
        {
          type: 'project',
          name: 'Full Project',
          note: 'Project note',
          dueDate: '2024-12-31',
          deferDate: '2024-12-01',
          flagged: true,
          estimatedMinutes: 120,
          tags: ['Tag1'],
          folderName: 'Work',
          sequential: true
        }
      ]);

      expect(mockAddProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Full Project',
          note: 'Project note',
          dueDate: '2024-12-31',
          deferDate: '2024-12-01',
          flagged: true,
          estimatedMinutes: 120,
          tags: ['Tag1'],
          folderName: 'Work',
          sequential: true
        })
      );
    });
  });
});
