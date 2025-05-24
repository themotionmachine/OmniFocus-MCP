import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the individual add functions
const mockAddOmniFocusTask = jest.fn<any>();
const mockAddProject = jest.fn<any>();

jest.unstable_mockModule('../../../tools/primitives/addOmniFocusTask.js', () => ({
  addOmniFocusTask: mockAddOmniFocusTask
}));

jest.unstable_mockModule('../../../tools/primitives/addProject.js', () => ({
  addProject: mockAddProject
}));

// Import after mocking
const { batchAddItems } = await import('../../../tools/primitives/batchAddItems.js');

describe('batchAddItems', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task operations', () => {
    it('should add multiple tasks successfully', async () => {
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: true, taskId: 'task1' })
        .mockResolvedValueOnce({ success: true, taskId: 'task2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'task', name: 'Task 2' }
      ]);

      expect(result).toEqual({
        success: true,
        results: [
          { success: true, id: 'task1' },
          { success: true, id: 'task2' }
        ]
      });

      expect(mockAddOmniFocusTask).toHaveBeenCalledTimes(2);
      expect(mockAddOmniFocusTask).toHaveBeenCalledWith({
        name: 'Task 1',
        note: undefined,
        dueDate: undefined,
        deferDate: undefined,
        flagged: undefined,
        estimatedMinutes: undefined,
        tags: undefined,
        projectName: undefined,
        parentTaskId: undefined,
        parentTaskName: undefined
      });
    });

    it('should add nested tasks with parent references', async () => {
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: true, taskId: 'parent1' })
        .mockResolvedValueOnce({ success: true, taskId: 'child1' })
        .mockResolvedValueOnce({ success: true, taskId: 'child2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Parent Task' },
        { type: 'task', name: 'Child Task 1', parentTaskName: 'Parent Task' },
        { type: 'task', name: 'Child Task 2', parentTaskId: 'parent1' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results.length).toBe(3);

      // Verify parent task parameters were passed
      expect(mockAddOmniFocusTask).toHaveBeenNthCalledWith(2, expect.objectContaining({
        name: 'Child Task 1',
        parentTaskName: 'Parent Task'
      }));

      expect(mockAddOmniFocusTask).toHaveBeenNthCalledWith(3, expect.objectContaining({
        name: 'Child Task 2',
        parentTaskId: 'parent1'
      }));
    });
  });

  describe('Mixed operations', () => {
    it('should handle tasks and projects in same batch', async () => {
      mockAddOmniFocusTask.mockResolvedValueOnce({ success: true, taskId: 'task1' });
      mockAddProject.mockResolvedValueOnce({ success: true, projectId: 'proj1' });
      mockAddOmniFocusTask.mockResolvedValueOnce({ success: true, taskId: 'task2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'project', name: 'Project 1', folderName: 'Work' },
        { type: 'task', name: 'Task 2', projectName: 'Project 1' }
      ]);

      expect(result).toEqual({
        success: true,
        results: [
          { success: true, id: 'task1' },
          { success: true, id: 'proj1' },
          { success: true, id: 'task2' }
        ]
      });

      expect(mockAddOmniFocusTask).toHaveBeenCalledTimes(2);
      expect(mockAddProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should handle partial failures', async () => {
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: true, taskId: 'task1' })
        .mockResolvedValueOnce({ success: false, error: 'Parent not found' })
        .mockResolvedValueOnce({ success: true, taskId: 'task3' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'task', name: 'Task 2', parentTaskName: 'Nonexistent' },
        { type: 'task', name: 'Task 3' }
      ]);

      expect(result).toEqual({
        success: true, // Overall success if at least one item succeeded
        results: [
          { success: true, id: 'task1' },
          { success: false, error: 'Parent not found' },
          { success: true, id: 'task3' }
        ]
      });
    });

    it('should handle complete failure', async () => {
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: false, error: 'Error 1' })
        .mockResolvedValueOnce({ success: false, error: 'Error 2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'task', name: 'Task 2' }
      ]);

      expect(result).toEqual({
        success: false,
        results: [
          { success: false, error: 'Error 1' },
          { success: false, error: 'Error 2' }
        ]
      });
    });

    it('should handle invalid item type', async () => {
      const result = await batchAddItems([
        { type: 'invalid' as any, name: 'Invalid Item' }
      ]);

      expect(result).toEqual({
        success: false,
        results: [
          { success: false, error: 'Invalid item type: invalid' }
        ]
      });
    });

    it('should handle exceptions during processing', async () => {
      mockAddOmniFocusTask.mockRejectedValueOnce(new Error('Unexpected error'));

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' }
      ]);

      expect(result).toEqual({
        success: false,
        results: [
          { success: false, error: 'Unexpected error' }
        ]
      });
    });
  });

  describe('Complex nested structures', () => {
    it('should create a shopping list with nested items', async () => {
      // Simulate creating a shopping list hierarchy
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: true, taskId: 'shopping123' })
        .mockResolvedValueOnce({ success: true, taskId: 'milk123' })
        .mockResolvedValueOnce({ success: true, taskId: 'bread123' })
        .mockResolvedValueOnce({ success: true, taskId: 'eggs123' });

      const shoppingList = [
        { 
          type: 'task' as const, 
          name: 'Supermarket Shopping',
          dueDate: '2024-01-15',
          flagged: true
        },
        { 
          type: 'task' as const, 
          name: 'Buy milk',
          parentTaskName: 'Supermarket Shopping'
        },
        { 
          type: 'task' as const, 
          name: 'Buy bread',
          parentTaskName: 'Supermarket Shopping'
        },
        { 
          type: 'task' as const, 
          name: 'Buy eggs',
          parentTaskName: 'Supermarket Shopping'
        }
      ];

      const result = await batchAddItems(shoppingList);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(4);
      expect(result.results.every(r => r.success)).toBe(true);

      // Verify parent task was created with properties
      expect(mockAddOmniFocusTask).toHaveBeenNthCalledWith(1, expect.objectContaining({
        name: 'Supermarket Shopping',
        dueDate: '2024-01-15',
        flagged: true
      }));

      // Verify child tasks have parent reference
      for (let i = 2; i <= 4; i++) {
        expect(mockAddOmniFocusTask).toHaveBeenNthCalledWith(i, expect.objectContaining({
          parentTaskName: 'Supermarket Shopping'
        }));
      }
    });
  });
});