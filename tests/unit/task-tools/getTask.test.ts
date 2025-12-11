import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

// Mock the script execution
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

// T017: Unit tests for getTask primitive - basic functionality (RED phase - should FAIL)
describe('getTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return full task by ID', async () => {
    const mockResponse = {
      success: true,
      task: {
        id: 'task123',
        name: 'Test Task',
        note: 'Task notes here',
        taskStatus: 'Available',
        completed: false,
        flagged: true,
        effectiveFlagged: true,
        deferDate: null,
        dueDate: '2025-12-31T00:00:00Z',
        plannedDate: null,
        effectiveDeferDate: null,
        effectiveDueDate: '2025-12-31T00:00:00Z',
        effectivePlannedDate: null,
        completionDate: null,
        dropDate: null,
        added: '2025-01-01T00:00:00Z',
        modified: '2025-06-15T00:00:00Z',
        estimatedMinutes: 60,
        sequential: false,
        completedByChildren: false,
        shouldUseFloatingTimeZone: false,
        hasChildren: false,
        inInbox: false,
        containingProject: { id: 'proj1', name: 'My Project' },
        parent: null,
        tags: [{ id: 'tag1', name: 'Work' }]
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ id: 'task123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.id).toBe('task123');
      expect(result.task.name).toBe('Test Task');
      expect(result.task.note).toBe('Task notes here');
      expect(result.task.taskStatus).toBe('Available');
      expect(result.task.completed).toBe(false);
      expect(result.task.flagged).toBe(true);
      expect(result.task.effectiveFlagged).toBe(true);
      expect(result.task.dueDate).toBe('2025-12-31T00:00:00Z');
      expect(result.task.estimatedMinutes).toBe(60);
      expect(result.task.containingProject).toEqual({ id: 'proj1', name: 'My Project' });
      expect(result.task.tags).toEqual([{ id: 'tag1', name: 'Work' }]);
    }
  });

  it('should return full task by name', async () => {
    const mockResponse = {
      success: true,
      task: {
        id: 'task456',
        name: 'Named Task',
        note: '',
        taskStatus: 'Blocked',
        completed: false,
        flagged: false,
        effectiveFlagged: false,
        deferDate: '2025-12-15T09:00:00Z',
        dueDate: null,
        plannedDate: '2025-12-20T00:00:00Z',
        effectiveDeferDate: '2025-12-15T09:00:00Z',
        effectiveDueDate: null,
        effectivePlannedDate: '2025-12-20T00:00:00Z',
        completionDate: null,
        dropDate: null,
        added: '2025-06-01T00:00:00Z',
        modified: '2025-06-15T00:00:00Z',
        estimatedMinutes: null,
        sequential: false,
        completedByChildren: false,
        shouldUseFloatingTimeZone: false,
        hasChildren: true,
        inInbox: false,
        containingProject: null,
        parent: { id: 'parent1', name: 'Parent Task' },
        tags: []
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ name: 'Named Task' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify temp file path contains get_task identifier
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('get_task');
    expect(scriptPath).toContain('.js');

    if (result.success) {
      expect(result.task.id).toBe('task456');
      expect(result.task.name).toBe('Named Task');
      expect(result.task.taskStatus).toBe('Blocked');
      expect(result.task.deferDate).toBe('2025-12-15T09:00:00Z');
      expect(result.task.plannedDate).toBe('2025-12-20T00:00:00Z');
      expect(result.task.hasChildren).toBe(true);
      expect(result.task.parent).toEqual({ id: 'parent1', name: 'Parent Task' });
      expect(result.task.containingProject).toBeNull();
    }
  });

  it('should prefer id over name when both provided', async () => {
    const mockResponse = {
      success: true,
      task: {
        id: 'task-by-id',
        name: 'Task Found By ID',
        note: '',
        taskStatus: 'Available',
        completed: false,
        flagged: false,
        effectiveFlagged: false,
        deferDate: null,
        dueDate: null,
        plannedDate: null,
        effectiveDeferDate: null,
        effectiveDueDate: null,
        effectivePlannedDate: null,
        completionDate: null,
        dropDate: null,
        added: '2025-01-01T00:00:00Z',
        modified: '2025-01-01T00:00:00Z',
        estimatedMinutes: null,
        sequential: false,
        completedByChildren: false,
        shouldUseFloatingTimeZone: false,
        hasChildren: false,
        inInbox: true,
        containingProject: null,
        parent: null,
        tags: []
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ id: 'task-by-id', name: 'Some Name' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.id).toBe('task-by-id');
      expect(result.task.name).toBe('Task Found By ID');
    }
  });

  it('should return error when task not found by ID', async () => {
    const mockResponse = {
      success: false,
      error: "Task 'nonexistent123' not found"
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ id: 'nonexistent123' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Task 'nonexistent123' not found");
    }
  });

  it('should return error when task not found by name', async () => {
    const mockResponse = {
      success: false,
      error: "Task 'Nonexistent Task' not found"
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ name: 'Nonexistent Task' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Task 'Nonexistent Task' not found");
    }
  });

  it('should return disambiguation error for multiple name matches', async () => {
    const mockResponse = {
      success: false,
      error: "Multiple tasks match name 'Test'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task1', 'task2', 'task3']
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ name: 'Test' });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toEqual(['task1', 'task2', 'task3']);
      expect(result.error).toBe("Multiple tasks match name 'Test'");
    }
  });

  it('should handle completed task with completionDate', async () => {
    const mockResponse = {
      success: true,
      task: {
        id: 'completed-task',
        name: 'Completed Task',
        note: 'Done!',
        taskStatus: 'Completed',
        completed: true,
        flagged: false,
        effectiveFlagged: false,
        deferDate: null,
        dueDate: null,
        plannedDate: null,
        effectiveDeferDate: null,
        effectiveDueDate: null,
        effectivePlannedDate: null,
        completionDate: '2025-06-10T14:30:00Z',
        dropDate: null,
        added: '2025-06-01T00:00:00Z',
        modified: '2025-06-10T14:30:00Z',
        estimatedMinutes: null,
        sequential: false,
        completedByChildren: false,
        shouldUseFloatingTimeZone: false,
        hasChildren: false,
        inInbox: false,
        containingProject: { id: 'proj1', name: 'Archive' },
        parent: null,
        tags: []
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ id: 'completed-task' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.completed).toBe(true);
      expect(result.task.taskStatus).toBe('Completed');
      expect(result.task.completionDate).toBe('2025-06-10T14:30:00Z');
    }
  });

  it('should handle dropped task with dropDate', async () => {
    const mockResponse = {
      success: true,
      task: {
        id: 'dropped-task',
        name: 'Dropped Task',
        note: 'Abandoned',
        taskStatus: 'Dropped',
        completed: false,
        flagged: false,
        effectiveFlagged: false,
        deferDate: null,
        dueDate: null,
        plannedDate: null,
        effectiveDeferDate: null,
        effectiveDueDate: null,
        effectivePlannedDate: null,
        completionDate: null,
        dropDate: '2025-06-05T10:00:00Z',
        added: '2025-01-01T00:00:00Z',
        modified: '2025-06-05T10:00:00Z',
        estimatedMinutes: null,
        sequential: false,
        completedByChildren: false,
        shouldUseFloatingTimeZone: false,
        hasChildren: false,
        inInbox: false,
        containingProject: null,
        parent: null,
        tags: []
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ id: 'dropped-task' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.taskStatus).toBe('Dropped');
      expect(result.task.dropDate).toBe('2025-06-05T10:00:00Z');
      expect(result.task.completed).toBe(false);
    }
  });

  it('should handle task with multiple tags', async () => {
    const mockResponse = {
      success: true,
      task: {
        id: 'multi-tag-task',
        name: 'Tagged Task',
        note: '',
        taskStatus: 'Available',
        completed: false,
        flagged: false,
        effectiveFlagged: false,
        deferDate: null,
        dueDate: null,
        plannedDate: null,
        effectiveDeferDate: null,
        effectiveDueDate: null,
        effectivePlannedDate: null,
        completionDate: null,
        dropDate: null,
        added: '2025-01-01T00:00:00Z',
        modified: '2025-01-01T00:00:00Z',
        estimatedMinutes: null,
        sequential: false,
        completedByChildren: false,
        shouldUseFloatingTimeZone: false,
        hasChildren: false,
        inInbox: false,
        containingProject: null,
        parent: null,
        tags: [
          { id: 'tag1', name: 'Work' },
          { id: 'tag2', name: 'Urgent' },
          { id: 'tag3', name: 'Review' }
        ]
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ id: 'multi-tag-task' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.tags).toHaveLength(3);
      expect(result.task.tags).toEqual([
        { id: 'tag1', name: 'Work' },
        { id: 'tag2', name: 'Urgent' },
        { id: 'tag3', name: 'Review' }
      ]);
    }
  });

  it('should handle task with sequential and completedByChildren flags', async () => {
    const mockResponse = {
      success: true,
      task: {
        id: 'parent-task',
        name: 'Parent Task',
        note: '',
        taskStatus: 'Blocked',
        completed: false,
        flagged: false,
        effectiveFlagged: false,
        deferDate: null,
        dueDate: null,
        plannedDate: null,
        effectiveDeferDate: null,
        effectiveDueDate: null,
        effectivePlannedDate: null,
        completionDate: null,
        dropDate: null,
        added: '2025-01-01T00:00:00Z',
        modified: '2025-01-01T00:00:00Z',
        estimatedMinutes: null,
        sequential: true,
        completedByChildren: true,
        shouldUseFloatingTimeZone: false,
        hasChildren: true,
        inInbox: false,
        containingProject: { id: 'proj1', name: 'My Project' },
        parent: null,
        tags: []
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ id: 'parent-task' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.sequential).toBe(true);
      expect(result.task.completedByChildren).toBe(true);
      expect(result.task.hasChildren).toBe(true);
    }
  });

  it('should handle task with floating timezone flag', async () => {
    const mockResponse = {
      success: true,
      task: {
        id: 'floating-task',
        name: 'All Day Task',
        note: '',
        taskStatus: 'Available',
        completed: false,
        flagged: false,
        effectiveFlagged: false,
        deferDate: '2025-12-25T00:00:00Z',
        dueDate: '2025-12-25T23:59:59Z',
        plannedDate: null,
        effectiveDeferDate: '2025-12-25T00:00:00Z',
        effectiveDueDate: '2025-12-25T23:59:59Z',
        effectivePlannedDate: null,
        completionDate: null,
        dropDate: null,
        added: '2025-01-01T00:00:00Z',
        modified: '2025-01-01T00:00:00Z',
        estimatedMinutes: null,
        sequential: false,
        completedByChildren: false,
        shouldUseFloatingTimeZone: true,
        hasChildren: false,
        inInbox: false,
        containingProject: null,
        parent: null,
        tags: []
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ id: 'floating-task' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.shouldUseFloatingTimeZone).toBe(true);
    }
  });

  it('should handle task in inbox', async () => {
    const mockResponse = {
      success: true,
      task: {
        id: 'inbox-task',
        name: 'Inbox Task',
        note: '',
        taskStatus: 'Available',
        completed: false,
        flagged: false,
        effectiveFlagged: false,
        deferDate: null,
        dueDate: null,
        plannedDate: null,
        effectiveDeferDate: null,
        effectiveDueDate: null,
        effectivePlannedDate: null,
        completionDate: null,
        dropDate: null,
        added: '2025-01-01T00:00:00Z',
        modified: '2025-01-01T00:00:00Z',
        estimatedMinutes: null,
        sequential: false,
        completedByChildren: false,
        shouldUseFloatingTimeZone: false,
        hasChildren: false,
        inInbox: true,
        containingProject: null,
        parent: null,
        tags: []
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getTask({ id: 'inbox-task' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.inInbox).toBe(true);
      expect(result.task.containingProject).toBeNull();
    }
  });
});
