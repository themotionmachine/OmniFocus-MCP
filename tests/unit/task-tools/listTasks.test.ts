import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listTasks } from '../../../src/tools/primitives/listTasks.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

// Mock the script execution
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
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

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

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

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await listTasks({ projectId: 'proj123' });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalled();

    // Verify the script was called with project filter content
    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(scriptContent).toContain('proj123');

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

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await listTasks({ projectName: 'My Project' });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalled();

    // Verify the script was called with project name filter content
    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(scriptContent).toContain('My Project');

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

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

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
          taskStatus: 'Available',
          dueDate: '2025-06-15T00:00:00Z',
          flagged: false,
          deferDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: [],
          tagNames: []
        }
      ]
    };

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

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
          name: 'Blocked task',
          taskStatus: 'Blocked',
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

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await listTasks({ status: ['Available', 'Blocked'] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].taskStatus).toBe('Available');
      expect(result.tasks[1].taskStatus).toBe('Blocked');
    }
  });

  it('should filter by flagged', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Flagged task',
          taskStatus: 'Available',
          flagged: true,
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

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

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
          name: 'Completed task',
          taskStatus: 'Completed',
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

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await listTasks({ includeCompleted: true });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[1].taskStatus).toBe('Completed');
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

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await listTasks({ limit: 2 });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalled();
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
          taskStatus: 'Available',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: ['t1', 't2'],
          tagNames: ['Work', 'Urgent']
        }
      ]
    };

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await listTasks({ tagIds: ['t1', 't2'], tagFilterMode: 'all' });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalled();

    // Verify the script content was generated with tag filter
    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(scriptContent).toContain('t1');
    expect(scriptContent).toContain('t2');
  });

  it('should filter by tagIds with tagFilterMode "any" (OR logic)', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task with t1',
          taskStatus: 'Available',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: ['t1'],
          tagNames: ['Work']
        },
        {
          id: 'task2',
          name: 'Task with t2',
          taskStatus: 'Available',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: ['t2'],
          tagNames: ['Urgent']
        }
      ]
    };

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await listTasks({ tagIds: ['t1'], tagFilterMode: 'any' });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalled();

    // Verify the script content was generated with tag filter
    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(scriptContent).toContain('t1');
  });

  it('should filter by tagNames', async () => {
    const mockResponse = {
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task with Work tag',
          taskStatus: 'Available',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: ['t1'],
          tagNames: ['Work']
        },
        {
          id: 'task2',
          name: 'Task with Urgent tag',
          taskStatus: 'Available',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: ['t2'],
          tagNames: ['Urgent']
        }
      ]
    };

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await listTasks({ tagNames: ['Work', 'Urgent'], tagFilterMode: 'any' });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalled();

    // Verify the script content was generated with tag names
    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(scriptContent).toContain('Work');
    expect(scriptContent).toContain('Urgent');
  });
});
