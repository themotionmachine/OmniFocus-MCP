import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  batchUpdateTasks,
  generateBatchUpdateTasksScript
} from '../../../src/tools/primitives/batchUpdateTasks.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('batchUpdateTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with per-item results', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [{ itemId: 'task1', itemName: 'My Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });

    const result = await batchUpdateTasks({
      items: [{ id: 'task1' }],
      properties: { flagged: true }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.succeeded).toBe(1);
    }
  });

  it('handles partial failure', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
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
    });

    const result = await batchUpdateTasks({
      items: [{ id: 'task1' }, { id: 'bad' }],
      properties: { flagged: true }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.failed).toBe(1);
    }
  });
});

describe('generateBatchUpdateTasksScript', () => {
  it('generates script with flagged property', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { flagged: true }
    });

    expect(script).toContain('flagged');
    expect(script).toContain('(function()');
    expect(script).toContain('JSON.stringify');
  });

  it('generates script with dueDate', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { dueDate: '2026-01-15T00:00:00.000Z' }
    });

    expect(script).toContain('dueDate');
    expect(script).toContain('2026-01-15');
  });

  it('generates script with clearDueDate', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { clearDueDate: true }
    });

    expect(script).toContain('dueDate');
    expect(script).toContain('null');
  });

  it('generates script with deferDate', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { deferDate: '2026-01-10T00:00:00.000Z' }
    });

    expect(script).toContain('deferDate');
    expect(script).toContain('2026-01-10');
  });

  it('generates script with estimatedMinutes', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { estimatedMinutes: 30 }
    });

    expect(script).toContain('estimatedMinutes');
    expect(script).toContain('30');
  });

  it('generates version check for plannedDate (v4.7+)', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { plannedDate: '2026-01-15T00:00:00.000Z' }
    });

    expect(script).toContain('4.7');
    expect(script).toContain('VERSION_NOT_SUPPORTED');
    expect(script).toContain('plannedDate');
  });

  it('generates version check for clearPlannedDate (v4.7+)', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { clearPlannedDate: true }
    });

    expect(script).toContain('4.7');
    expect(script).toContain('VERSION_NOT_SUPPORTED');
  });

  it('generates removeTags before addTags (FR-014)', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { addTags: ['new-tag'], removeTags: ['old-tag'] }
    });

    // item.removeTag should appear before item.addTag in the per-item loop
    const removeIndex = script.indexOf('item.removeTag');
    const addIndex = script.indexOf('item.addTag');
    expect(removeIndex).toBeGreaterThanOrEqual(0);
    expect(addIndex).toBeGreaterThanOrEqual(0);
    expect(removeIndex).toBeLessThan(addIndex);
  });

  it('generates TAG_NOT_FOUND for missing tags', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { addTags: ['unknown-tag'] }
    });

    expect(script).toContain('TAG_NOT_FOUND');
  });

  it('generates note append behavior', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { note: 'Appended text' }
    });

    expect(script).toContain('note');
    expect(script).toContain('Appended text');
  });

  it('generates DISAMBIGUATION_REQUIRED for name lookup', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ name: 'Ambiguous Task' }],
      properties: { flagged: true }
    });

    expect(script).toContain('DISAMBIGUATION_REQUIRED');
  });

  it('generates NOT_FOUND for missing tasks', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { flagged: true }
    });

    expect(script).toContain('NOT_FOUND');
  });

  it('generates per-item try-catch for OPERATION_FAILED', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { flagged: true }
    });

    expect(script).toContain('OPERATION_FAILED');
  });

  it('resolves tags once before item loop', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }, { id: 'task2' }],
      properties: { addTags: ['Work'] }
    });

    // Tag resolution should appear before the item loop
    const tagResolutionIndex = script.indexOf('flattenedTags');
    const itemLoopIndex = script.indexOf('forEach');
    expect(tagResolutionIndex).toBeGreaterThanOrEqual(0);
    expect(itemLoopIndex).toBeGreaterThanOrEqual(0);
    expect(tagResolutionIndex).toBeLessThan(itemLoopIndex);
  });

  it('handles clearEstimatedMinutes', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { clearEstimatedMinutes: true }
    });

    expect(script).toContain('estimatedMinutes');
    expect(script).toContain('null');
  });

  it('handles clearDeferDate', () => {
    const script = generateBatchUpdateTasksScript({
      items: [{ id: 'task1' }],
      properties: { clearDeferDate: true }
    });

    expect(script).toContain('deferDate');
    expect(script).toContain('null');
  });
});
