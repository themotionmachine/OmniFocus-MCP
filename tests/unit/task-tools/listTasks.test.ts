import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listTasks } from '../../../src/tools/primitives/listTasks.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

// Mock the script execution
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

// T007: Unit test for listTasks primitive (RED phase - should FAIL)
describe('listTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return tasks on success', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 't1',
          name: 'Task 1',
          taskStatus: 'Available',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: [],
          tagNames: []
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe('t1');
      expect(result.tasks[0].name).toBe('Task 1');
    }
  });
});

// T008: Unit tests for listTasks with project filter
describe('listTasks with project filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter by projectId', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task in project',
          taskStatus: 'Available',
          projectId: 'proj123',
          projectName: 'My Project',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          tagIds: [],
          tagNames: []
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({ projectId: 'proj123' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the function was called with a temp file path
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_tasks');
    expect(scriptPath).toContain('.js');

    // Verify the result contains tasks from the specified project
    if (result.success) {
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].projectId).toBe('proj123');
    }
  });

  it('should filter by projectName', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task in named project',
          taskStatus: 'Available',
          projectId: 'proj456',
          projectName: 'My Project',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          tagIds: [],
          tagNames: []
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({ projectName: 'My Project' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the function was called with a temp file path
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_tasks');
    expect(scriptPath).toContain('.js');

    // Verify the result contains tasks from the specified project
    if (result.success) {
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].projectName).toBe('My Project');
    }
  });

  it('should return empty array if no tasks match project filter', async () => {
    const mockResponse = {
      success: true,
      tasks: []
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({ projectId: 'nonexistent' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks).toHaveLength(0);
    }
  });
});

// T010: Unit tests for listTasks primitive with date and status filters
describe('listTasks with date and status filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter by date range (dueAfter/dueBefore)', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task due in range',
          status: 'Available',
          dueDate: '2025-06-15T00:00:00Z',
          flagged: false,
          completed: false
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({
      dueAfter: '2025-01-01T00:00:00Z',
      dueBefore: '2025-12-31T23:59:59Z'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].dueDate).toBe('2025-06-15T00:00:00Z');
    }
  });

  it('should filter by status array', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Available task',
          status: 'Available',
          flagged: false,
          completed: false
        },
        {
          id: 'task2',
          name: 'Blocked task',
          status: 'Blocked',
          flagged: false,
          completed: false
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({ status: ['Available', 'Blocked'] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].status).toBe('Available');
      expect(result.tasks[1].status).toBe('Blocked');
    }
  });

  it('should filter by flagged', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Flagged task',
          status: 'Available',
          flagged: true,
          completed: false
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({ flagged: true });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].flagged).toBe(true);
    }
  });

  it('should include completed tasks when includeCompleted is true', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Active task',
          status: 'Available',
          flagged: false,
          completed: false
        },
        {
          id: 'task2',
          name: 'Completed task',
          status: 'Available',
          flagged: false,
          completed: true
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({ includeCompleted: true });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[1].completed).toBe(true);
    }
  });

  it('should apply limit post-filter', async () => {
    // Mock returns limited result (as OmniFocus would apply limit in script)
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          taskStatus: 'Available',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: [],
          tagNames: []
        },
        {
          id: 'task2',
          name: 'Task 2',
          taskStatus: 'Available',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: [],
          tagNames: []
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({ limit: 2 });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();
    // Verify the script path contains limit indicator
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_tasks');
    if (result.success) {
      expect(result.tasks).toHaveLength(2);
    }
  });
});

// T009: Unit tests for listTasks with tag filter
describe('listTasks with tag filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter by tagIds with tagFilterMode "all" (AND logic)', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task with both tags',
          status: 'Available',
          flagged: false,
          completed: false,
          tags: [
            { id: 't1', name: 'Work' },
            { id: 't2', name: 'Urgent' }
          ]
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({ tagIds: ['t1', 't2'], tagFilterMode: 'all' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the function was called with a temp file path
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_tasks');
    expect(scriptPath).toContain('.js');
  });

  it('should filter by tagIds with tagFilterMode "any" (OR logic)', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task with t1',
          status: 'Available',
          flagged: false,
          completed: false,
          tags: [{ id: 't1', name: 'Work' }]
        },
        {
          id: 'task2',
          name: 'Task with t2',
          status: 'Available',
          flagged: false,
          completed: false,
          tags: [{ id: 't2', name: 'Urgent' }]
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({ tagIds: ['t1'], tagFilterMode: 'any' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the function was called with a temp file path
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_tasks');
    expect(scriptPath).toContain('.js');
  });

  it('should filter by tagNames', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task with Work tag',
          status: 'Available',
          flagged: false,
          completed: false,
          tags: [{ id: 't1', name: 'Work' }]
        },
        {
          id: 'task2',
          name: 'Task with Urgent tag',
          status: 'Available',
          flagged: false,
          completed: false,
          tags: [{ id: 't2', name: 'Urgent' }]
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTasks({ tagNames: ['Work', 'Urgent'], tagFilterMode: 'any' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the function was called with a temp file path
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_tasks');
    expect(scriptPath).toContain('.js');
  });
});
