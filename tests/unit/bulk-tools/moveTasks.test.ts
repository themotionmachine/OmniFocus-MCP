import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateMoveTasksScript, moveTasks } from '../../../src/tools/primitives/moveTasks.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('moveTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success response with per-item results', async () => {
    const mockResult = {
      success: true,
      results: [{ itemId: 'task1', itemName: 'My Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResult);

    const result = await moveTasks({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.summary.total).toBe(1);
    }
  });

  it('returns error when target not found', async () => {
    const mockResult = {
      success: false,
      error: "Project 'proj1' not found",
      code: 'TARGET_NOT_FOUND'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResult);

    const result = await moveTasks({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('TARGET_NOT_FOUND');
    }
  });

  it('handles partial failure (some items succeed, some fail)', async () => {
    const mockResult = {
      success: true,
      results: [
        { itemId: 'task1', itemName: 'Task 1', itemType: 'task', success: true },
        {
          itemId: 'bad',
          itemName: '',
          itemType: 'task',
          success: false,
          error: 'Not found',
          code: 'NOT_FOUND'
        }
      ],
      summary: { total: 2, succeeded: 1, failed: 1 }
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResult);

    const result = await moveTasks({
      items: [{ id: 'task1' }, { id: 'bad' }],
      position: { projectId: 'proj1' }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(1);
    }
  });
});

describe('generateMoveTasksScript', () => {
  it('generates script with projectId target', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('proj1');
    expect(script).toContain('Project.byIdentifier');
    expect(script).toContain('moveTasks');
    expect(script).toContain('(function()');
    expect(script).toContain('JSON.stringify');
  });

  it('generates script with projectName target', () => {
    const script = generateMoveTasksScript({
      items: [{ name: 'My Task' }],
      position: { projectName: 'My Project' }
    });

    expect(script).toContain('My Project');
    expect(script).toContain('flattenedProjects');
  });

  it('generates script with inbox target', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { inbox: true }
    });

    expect(script).toContain('inbox');
  });

  it('generates script with taskId target for subtask placement', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { taskId: 'parent-task-id' }
    });

    expect(script).toContain('parent-task-id');
    expect(script).toContain('Task.byIdentifier');
  });

  it('generates script with beginning placement', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1', placement: 'beginning' }
    });

    expect(script).toContain('beginning');
  });

  it('generates script with before placement and relativeTo', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1', placement: 'before', relativeTo: 'sibling-id' }
    });

    expect(script).toContain('sibling-id');
    expect(script).toContain('before');
  });

  it('generates script with after placement and relativeTo', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1', placement: 'after', relativeTo: 'sibling-id' }
    });

    expect(script).toContain('sibling-id');
    expect(script).toContain('after');
  });

  it('validates target pre-validation before item loop', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    // Target resolution should happen before item loop
    expect(script).toContain('TARGET_NOT_FOUND');
  });

  it('generates script with inactive target warning check', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    // Script should check for inactive target
    expect(script).toContain('warning');
  });

  it('generates script for 100-item batch', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `task${i}` }));
    const script = generateMoveTasksScript({
      items,
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('task99');
  });

  it('escapes special characters in names', () => {
    const script = generateMoveTasksScript({
      items: [{ name: 'Task with "quotes"' }],
      position: { projectName: 'Project with "quotes"' }
    });

    expect(script).not.toContain('"quotes"');
  });

  it('generates per-item NOT_FOUND handling', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('NOT_FOUND');
  });

  it('generates DISAMBIGUATION_REQUIRED handling for name lookup', () => {
    const script = generateMoveTasksScript({
      items: [{ name: 'Ambiguous Task' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('DISAMBIGUATION_REQUIRED');
  });

  it('generates post-move verification', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    // Should verify operation after moveTasks() call
    expect(script).toContain('containingProject');
  });

  it('generates RELATIVE_TARGET_NOT_FOUND when relativeTo not found', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1', placement: 'before', relativeTo: 'sibling-id' }
    });

    expect(script).toContain('RELATIVE_TARGET_NOT_FOUND');
  });

  it('wraps per-item in try-catch for OPERATION_FAILED', () => {
    const script = generateMoveTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('OPERATION_FAILED');
  });
});
