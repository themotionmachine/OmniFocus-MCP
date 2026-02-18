import { describe, it, expect, vi, beforeEach } from 'vitest';
import { batchAddItems, BatchAddItemsParams } from './batchAddItems.js';

// Mock the underlying functions to avoid OmniFocus dependency
vi.mock('./addOmniFocusTask.js', () => ({
  addOmniFocusTask: vi.fn(),
}));

vi.mock('./addProject.js', () => ({
  addProject: vi.fn(),
}));

// Import the mocked modules
import { addOmniFocusTask } from './addOmniFocusTask.js';
import { addProject } from './addProject.js';

const mockAddTask = vi.mocked(addOmniFocusTask);
const mockAddProject = vi.mocked(addProject);

describe('batchAddItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates single task to addOmniFocusTask', async () => {
    mockAddTask.mockResolvedValue({ success: true, taskId: 't1' });

    const result = await batchAddItems([
      { type: 'task', name: 'Task 1' },
    ]);

    expect(mockAddTask).toHaveBeenCalledOnce();
    expect(mockAddTask).toHaveBeenCalledWith(expect.objectContaining({ name: 'Task 1' }));
    expect(result.success).toBe(true);
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].id).toBe('t1');
  });

  it('delegates single project to addProject', async () => {
    mockAddProject.mockResolvedValue({ success: true, projectId: 'p1' });

    const result = await batchAddItems([
      { type: 'project', name: 'Project 1' },
    ]);

    expect(mockAddProject).toHaveBeenCalledOnce();
    expect(mockAddProject).toHaveBeenCalledWith(expect.objectContaining({ name: 'Project 1' }));
    expect(result.success).toBe(true);
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].id).toBe('p1');
  });

  it('handles mixed batch with tempId/parentTempId resolution', async () => {
    mockAddProject.mockResolvedValue({ success: true, projectId: 'proj-real-id' });
    mockAddTask.mockResolvedValue({ success: true, taskId: 'task-real-id' });

    const items: BatchAddItemsParams[] = [
      { type: 'project', name: 'My Project', tempId: 'temp-proj' },
      { type: 'task', name: 'Task under project', parentTempId: 'temp-proj', hierarchyLevel: 1 },
    ];

    const result = await batchAddItems(items);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    // The task should have been called with the resolved project name
    expect(mockAddTask).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Task under project',
      projectName: 'My Project',
    }));
  });

  it('resolves task tempId to parentTaskId for child tasks', async () => {
    mockAddTask.mockResolvedValueOnce({ success: true, taskId: 'parent-id' });
    mockAddTask.mockResolvedValueOnce({ success: true, taskId: 'child-id' });

    const items: BatchAddItemsParams[] = [
      { type: 'task', name: 'Parent Task', tempId: 'temp-parent', hierarchyLevel: 0 },
      { type: 'task', name: 'Child Task', parentTempId: 'temp-parent', hierarchyLevel: 1 },
    ];

    const result = await batchAddItems(items);

    expect(result.success).toBe(true);
    expect(mockAddTask).toHaveBeenCalledTimes(2);
    // Second call should have parentTaskId set to parent's real ID
    expect(mockAddTask).toHaveBeenNthCalledWith(2, expect.objectContaining({
      name: 'Child Task',
      parentTaskId: 'parent-id',
    }));
  });

  it('detects cycles in tempId references', async () => {
    const items: BatchAddItemsParams[] = [
      { type: 'task', name: 'A', tempId: 'a', parentTempId: 'b' },
      { type: 'task', name: 'B', tempId: 'b', parentTempId: 'a' },
    ];

    const result = await batchAddItems(items);

    // Both items should fail with cycle error
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain('Cycle detected');
    expect(result.results[1].success).toBe(false);
    expect(result.results[1].error).toContain('Cycle detected');
  });

  it('reports error for unknown parentTempId', async () => {
    const items: BatchAddItemsParams[] = [
      { type: 'task', name: 'Orphan', parentTempId: 'nonexistent' },
    ];

    const result = await batchAddItems(items);

    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain('Unknown parentTempId');
  });

  it('processes items in hierarchy level order', async () => {
    const callOrder: string[] = [];

    mockAddTask.mockImplementation(async (params: any) => {
      callOrder.push(params.name);
      return { success: true, taskId: `id-${params.name}` };
    });

    const items: BatchAddItemsParams[] = [
      { type: 'task', name: 'Level1', tempId: 'l1', parentTempId: 'l0', hierarchyLevel: 1 },
      { type: 'task', name: 'Level0', tempId: 'l0', hierarchyLevel: 0 },
    ];

    await batchAddItems(items);

    // Level 0 should be processed before Level 1
    expect(callOrder[0]).toBe('Level0');
    expect(callOrder[1]).toBe('Level1');
  });

  it('propagates parent failure to child', async () => {
    mockAddTask.mockResolvedValue({ success: false, error: 'Parent creation failed' });

    const items: BatchAddItemsParams[] = [
      { type: 'task', name: 'Parent', tempId: 'p', hierarchyLevel: 0 },
      { type: 'task', name: 'Child', parentTempId: 'p', hierarchyLevel: 1 },
    ];

    const result = await batchAddItems(items);

    // Parent failed, so child should get unresolved error
    expect(result.results[0].success).toBe(false);
    expect(result.results[1].success).toBe(false);
    expect(result.results[1].error).toContain('Unresolved parentTempId');
  });

  it('overall success is true if at least one item succeeds', async () => {
    mockAddTask.mockResolvedValueOnce({ success: false, error: 'Failed' });
    mockAddTask.mockResolvedValueOnce({ success: true, taskId: 't2' });

    const items: BatchAddItemsParams[] = [
      { type: 'task', name: 'Fail' },
      { type: 'task', name: 'Succeed' },
    ];

    const result = await batchAddItems(items);
    expect(result.success).toBe(true);
  });

  it('overall success is false when all items fail', async () => {
    mockAddTask.mockResolvedValue({ success: false, error: 'Failed' });

    const items: BatchAddItemsParams[] = [
      { type: 'task', name: 'Fail1' },
      { type: 'task', name: 'Fail2' },
    ];

    const result = await batchAddItems(items);
    expect(result.success).toBe(false);
  });

  it('passes task-specific params through', async () => {
    mockAddTask.mockResolvedValue({ success: true, taskId: 't1' });

    await batchAddItems([{
      type: 'task',
      name: 'Detailed Task',
      note: 'A note',
      dueDate: '2024-06-01',
      deferDate: '2024-05-01',
      plannedDate: '2024-05-15',
      flagged: true,
      estimatedMinutes: 30,
      tags: ['Work'],
      projectName: 'My Project',
    }]);

    expect(mockAddTask).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Detailed Task',
      note: 'A note',
      dueDate: '2024-06-01',
      flagged: true,
      tags: ['Work'],
      projectName: 'My Project',
    }));
  });

  it('passes project-specific params through', async () => {
    mockAddProject.mockResolvedValue({ success: true, projectId: 'p1' });

    await batchAddItems([{
      type: 'project',
      name: 'New Proj',
      folderName: 'Work',
      sequential: true,
      tags: ['Important'],
    }]);

    expect(mockAddProject).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Proj',
      folderName: 'Work',
      sequential: true,
      tags: ['Important'],
    }));
  });
});
