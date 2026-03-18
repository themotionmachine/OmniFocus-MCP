import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateGetNextTaskScript,
  getNextTask
} from '../../../src/tools/primitives/getNextTask.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

// Mock the script execution
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// US5: Unit tests for getNextTask primitive

const makeTask = (overrides = {}) => ({
  id: 'task-abc',
  name: 'First Task',
  note: 'Do the thing',
  flagged: false,
  taskStatus: 'Available',
  dueDate: null,
  deferDate: null,
  tags: [],
  project: { id: 'proj-123', name: 'My Project' },
  ...overrides
});

describe('getNextTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return task details for sequential project with available task', async () => {
    const mockResponse = {
      success: true,
      hasNext: true,
      task: makeTask({ name: 'First Sequential Task', flagged: true, taskStatus: 'Available' })
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getNextTask({ id: 'proj-123' });

    expect(result.success).toBe(true);
    if (result.success && result.hasNext) {
      expect(result.task.id).toBe('task-abc');
      expect(result.task.name).toBe('First Sequential Task');
      expect(result.task.flagged).toBe(true);
      expect(result.task.taskStatus).toBe('Available');
      expect(result.task.project).toEqual({ id: 'proj-123', name: 'My Project' });
    }
  });

  it('should return hasNext=false with NO_AVAILABLE_TASKS when all tasks completed', async () => {
    const mockResponse = {
      success: true,
      hasNext: false,
      reason: 'NO_AVAILABLE_TASKS',
      message: 'No available tasks in this project.'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getNextTask({ id: 'proj-complete' });

    expect(result.success).toBe(true);
    if (result.success && !result.hasNext) {
      expect(result.reason).toBe('NO_AVAILABLE_TASKS');
      expect(result.message).toBeTruthy();
    }
  });

  it('should return SINGLE_ACTIONS_PROJECT for single-actions project (checked BEFORE nextTask)', async () => {
    const mockResponse = {
      success: true,
      hasNext: false,
      reason: 'SINGLE_ACTIONS_PROJECT',
      message: 'Single-actions projects do not have a sequential next task.'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getNextTask({ name: 'Single Actions Project' });

    expect(result.success).toBe(true);
    if (result.success && !result.hasNext) {
      expect(result.reason).toBe('SINGLE_ACTIONS_PROJECT');
    }
  });

  it('should return task for parallel project', async () => {
    const mockResponse = {
      success: true,
      hasNext: true,
      task: makeTask({
        name: 'Parallel Task',
        taskStatus: 'Available',
        dueDate: '2026-03-25T00:00:00.000Z',
        deferDate: null,
        tags: [{ id: 'tag-1', name: 'Work' }]
      })
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getNextTask({ id: 'proj-parallel' });

    expect(result.success).toBe(true);
    if (result.success && result.hasNext) {
      expect(result.task.taskStatus).toBe('Available');
      expect(result.task.dueDate).toBe('2026-03-25T00:00:00.000Z');
      expect(result.task.tags).toHaveLength(1);
    }
  });

  it('should return error when project not found', async () => {
    const mockResponse = {
      success: false,
      error: "Project 'nonexistent' not found"
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getNextTask({ id: 'nonexistent' });

    expect(result.success).toBe(false);
    if (!result.success && !('code' in result)) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for multiple project name matches', async () => {
    const mockResponse = {
      success: false,
      error: "Multiple projects match name 'Duplicate'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['proj-1', 'proj-2']
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getNextTask({ name: 'Duplicate' });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toEqual(['proj-1', 'proj-2']);
    }
  });

  it('should return task with deferDate when set', async () => {
    const mockResponse = {
      success: true,
      hasNext: true,
      task: makeTask({
        deferDate: '2026-03-18T08:00:00.000Z',
        dueDate: '2026-03-31T00:00:00.000Z'
      })
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getNextTask({ id: 'proj-deferred' });

    expect(result.success).toBe(true);
    if (result.success && result.hasNext) {
      expect(result.task.deferDate).toBe('2026-03-18T08:00:00.000Z');
      expect(result.task.dueDate).toBe('2026-03-31T00:00:00.000Z');
    }
  });

  it('should handle catastrophic failure (executeOmniJS throws)', async () => {
    vi.mocked(executeOmniJS).mockRejectedValue(new Error('OmniJS execution failed'));

    await expect(getNextTask({ id: 'proj-error' })).rejects.toThrow('OmniJS execution failed');
  });

  it('should prefer id over name in script when both provided', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      hasNext: true,
      task: makeTask()
    });

    await getNextTask({ id: 'proj-by-id', name: 'Some Name' });

    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(scriptContent).toContain('proj-by-id');
  });
});

describe('generateGetNextTaskScript', () => {
  it('should contain containsSingletonActions check', () => {
    const script = generateGetNextTaskScript({ id: 'proj-123' });
    expect(script).toContain('containsSingletonActions');
  });

  it('should contain nextTask access', () => {
    const script = generateGetNextTaskScript({ id: 'proj-123' });
    expect(script).toContain('nextTask');
  });

  it('should contain SINGLE_ACTIONS_PROJECT reason code', () => {
    const script = generateGetNextTaskScript({ name: 'My Project' });
    expect(script).toContain('SINGLE_ACTIONS_PROJECT');
  });

  it('should contain NO_AVAILABLE_TASKS reason code', () => {
    const script = generateGetNextTaskScript({ id: 'proj-abc' });
    expect(script).toContain('NO_AVAILABLE_TASKS');
  });

  it('should use Project.byIdentifier when id provided', () => {
    const script = generateGetNextTaskScript({ id: 'proj-abc-123' });
    expect(script).toContain('Project.byIdentifier');
    expect(script).toContain('proj-abc-123');
  });

  it('should use flattenedProjects filter when name provided', () => {
    const script = generateGetNextTaskScript({ name: 'My Project' });
    expect(script).toContain('flattenedProjects');
    expect(script).toContain('My Project');
  });

  it('should check containsSingletonActions before accessing nextTask', () => {
    const script = generateGetNextTaskScript({ id: 'proj-123' });
    const singletonPos = script.indexOf('containsSingletonActions');
    const nextTaskPos = script.indexOf('nextTask');
    expect(singletonPos).toBeLessThan(nextTaskPos);
  });

  it('should escape special characters in project name', () => {
    const script = generateGetNextTaskScript({ name: 'Project "Alpha" \\ Beta' });
    // Escaped double quotes and backslashes
    expect(script).toContain('\\"Alpha\\"');
    expect(script).toContain('\\\\');
  });

  it('should include task field serialization with all required fields', () => {
    const script = generateGetNextTaskScript({ id: 'proj-123' });
    expect(script).toContain('id:');
    expect(script).toContain('name:');
    expect(script).toContain('note:');
    expect(script).toContain('flagged:');
    expect(script).toContain('taskStatus');
    expect(script).toContain('dueDate');
    expect(script).toContain('deferDate');
    expect(script).toContain('tags');
    expect(script).toContain('project');
  });

  it('should wrap in IIFE with try-catch returning JSON', () => {
    const script = generateGetNextTaskScript({ id: 'proj-123' });
    expect(script).toContain('(function()');
    expect(script).toContain('try {');
    expect(script).toContain('catch');
    expect(script).toContain('JSON.stringify');
  });
});
