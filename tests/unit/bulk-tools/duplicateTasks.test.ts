import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  duplicateTasks,
  generateDuplicateTasksScript
} from '../../../src/tools/primitives/duplicateTasks.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('duplicateTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with newId and newName for each copy', async () => {
    const mockResult = {
      success: true,
      results: [
        {
          itemId: 'original',
          itemName: 'My Task',
          itemType: 'task',
          success: true,
          newId: 'copy-id',
          newName: 'My Task'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResult);

    const result = await duplicateTasks({
      items: [{ id: 'original' }],
      position: { projectId: 'proj1' }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].newId).toBe('copy-id');
      expect(result.results[0].newName).toBe('My Task');
    }
  });

  it('returns error when target not found', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Project 'proj1' not found",
      code: 'TARGET_NOT_FOUND'
    });

    const result = await duplicateTasks({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(result.success).toBe(false);
  });

  it('handles partial failure', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: 'task1',
          itemName: 'Task 1',
          itemType: 'task',
          success: true,
          newId: 'copy1',
          newName: 'Task 1'
        },
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
    });

    const result = await duplicateTasks({
      items: [{ id: 'task1' }, { id: 'bad' }],
      position: { projectId: 'proj1' }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.failed).toBe(1);
    }
  });
});

describe('generateDuplicateTasksScript', () => {
  it('generates script with projectId target', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('proj1');
    expect(script).toContain('duplicateTasks');
    expect(script).toContain('(function()');
  });

  it('generates script calling duplicateTasks with array and position', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('duplicateTasks([');
  });

  it('generates script accessing [0] of duplicateTasks result', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('[0]');
  });

  it('generates markIncomplete call for copies (FR-011)', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('markIncomplete');
  });

  it('generates newId and newName extraction', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('newId');
    expect(script).toContain('newName');
    expect(script).toContain('primaryKey');
  });

  it('generates script with inbox target', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { inbox: true }
    });

    expect(script).toContain('inbox');
  });

  it('generates script with before placement and relativeTo', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1', placement: 'before', relativeTo: 'sibling-id' }
    });

    expect(script).toContain('sibling-id');
    expect(script).toContain('RELATIVE_TARGET_NOT_FOUND');
  });

  it('generates inactive target warning check (AD-13)', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('warning');
  });

  it('generates target pre-validation (FR-016)', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('TARGET_NOT_FOUND');
  });

  it('generates DISAMBIGUATION_REQUIRED for name lookup', () => {
    const script = generateDuplicateTasksScript({
      items: [{ name: 'Ambiguous Task' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('DISAMBIGUATION_REQUIRED');
  });

  it('generates NOT_FOUND for missing items', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('NOT_FOUND');
  });

  it('generates OPERATION_FAILED for per-item try-catch', () => {
    const script = generateDuplicateTasksScript({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });

    expect(script).toContain('OPERATION_FAILED');
  });
});
