import { describe, expect, it } from 'vitest';
import {
  BulkBatchItemResultSchema,
  ItemIdentifierSchema,
  PropertyUpdateSetSchema,
  SectionPositionSchema,
  SummarySchema,
  TaskPositionSchema
} from '../../../src/contracts/bulk-tools/index.js';

describe('ItemIdentifierSchema', () => {
  it('accepts id only', () => {
    const result = ItemIdentifierSchema.safeParse({ id: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('accepts name only', () => {
    const result = ItemIdentifierSchema.safeParse({ name: 'My Task' });
    expect(result.success).toBe(true);
  });

  it('accepts both id and name', () => {
    const result = ItemIdentifierSchema.safeParse({ id: 'abc123', name: 'My Task' });
    expect(result.success).toBe(true);
  });

  it('rejects when neither id nor name provided', () => {
    const result = ItemIdentifierSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty id string', () => {
    const result = ItemIdentifierSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name string', () => {
    const result = ItemIdentifierSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('BulkBatchItemResultSchema', () => {
  it('accepts minimal success result', () => {
    const result = BulkBatchItemResultSchema.safeParse({
      itemId: 'abc123',
      itemName: 'My Task',
      itemType: 'task',
      success: true
    });
    expect(result.success).toBe(true);
  });

  it('accepts failure result with error and code', () => {
    const result = BulkBatchItemResultSchema.safeParse({
      itemId: 'abc123',
      itemName: '',
      itemType: 'task',
      success: false,
      error: 'Item not found: abc123',
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });

  it('accepts project itemType', () => {
    const result = BulkBatchItemResultSchema.safeParse({
      itemId: 'abc123',
      itemName: 'My Project',
      itemType: 'project',
      success: true
    });
    expect(result.success).toBe(true);
  });

  it('accepts folder itemType', () => {
    const result = BulkBatchItemResultSchema.safeParse({
      itemId: 'abc123',
      itemName: 'My Folder',
      itemType: 'folder',
      success: true
    });
    expect(result.success).toBe(true);
  });

  it('accepts disambiguation result with candidates', () => {
    const result = BulkBatchItemResultSchema.safeParse({
      itemId: '',
      itemName: 'Duplicate Name',
      itemType: 'task',
      success: false,
      error: 'Multiple items match',
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { id: 'id1', name: 'Duplicate Name', type: 'task' },
        { id: 'id2', name: 'Duplicate Name', type: 'project' }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('accepts result with newId and newName (duplicate/convert operations)', () => {
    const result = BulkBatchItemResultSchema.safeParse({
      itemId: 'original-id',
      itemName: 'Original Task',
      itemType: 'task',
      success: true,
      newId: 'new-id',
      newName: 'Original Task'
    });
    expect(result.success).toBe(true);
  });

  it('accepts result with warning (inactive target)', () => {
    const result = BulkBatchItemResultSchema.safeParse({
      itemId: 'abc123',
      itemName: 'My Task',
      itemType: 'task',
      success: true,
      warning: 'Target project is completed'
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid itemType', () => {
    const result = BulkBatchItemResultSchema.safeParse({
      itemId: 'abc123',
      itemName: 'My Task',
      itemType: 'invalid',
      success: true
    });
    expect(result.success).toBe(false);
  });
});

describe('SummarySchema', () => {
  it('accepts valid summary', () => {
    const result = SummarySchema.safeParse({ total: 3, succeeded: 2, failed: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts zero counts', () => {
    const result = SummarySchema.safeParse({ total: 0, succeeded: 0, failed: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative values', () => {
    const result = SummarySchema.safeParse({ total: -1, succeeded: 0, failed: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer values', () => {
    const result = SummarySchema.safeParse({ total: 1.5, succeeded: 1, failed: 0 });
    expect(result.success).toBe(false);
  });
});

describe('TaskPositionSchema', () => {
  it('accepts projectId with default placement', () => {
    const result = TaskPositionSchema.safeParse({ projectId: 'proj1' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.placement).toBe('ending');
  });

  it('accepts projectName with explicit placement', () => {
    const result = TaskPositionSchema.safeParse({
      projectName: 'My Project',
      placement: 'beginning'
    });
    expect(result.success).toBe(true);
  });

  it('accepts taskId for subtask placement', () => {
    const result = TaskPositionSchema.safeParse({ taskId: 'task1', placement: 'ending' });
    expect(result.success).toBe(true);
  });

  it('accepts taskName for subtask placement', () => {
    const result = TaskPositionSchema.safeParse({ taskName: 'Parent Task' });
    expect(result.success).toBe(true);
  });

  it('accepts inbox target', () => {
    const result = TaskPositionSchema.safeParse({ inbox: true });
    expect(result.success).toBe(true);
  });

  it('accepts before placement with relativeTo', () => {
    const result = TaskPositionSchema.safeParse({
      projectId: 'proj1',
      placement: 'before',
      relativeTo: 'sibling-task-id'
    });
    expect(result.success).toBe(true);
  });

  it('accepts after placement with relativeTo', () => {
    const result = TaskPositionSchema.safeParse({
      projectId: 'proj1',
      placement: 'after',
      relativeTo: 'sibling-task-id'
    });
    expect(result.success).toBe(true);
  });

  it('rejects when no target specified', () => {
    const result = TaskPositionSchema.safeParse({ placement: 'ending' });
    expect(result.success).toBe(false);
  });

  it('rejects when multiple targets specified', () => {
    const result = TaskPositionSchema.safeParse({ projectId: 'proj1', taskId: 'task1' });
    expect(result.success).toBe(false);
  });

  it('rejects before placement without relativeTo', () => {
    const result = TaskPositionSchema.safeParse({ projectId: 'proj1', placement: 'before' });
    expect(result.success).toBe(false);
  });

  it('rejects after placement without relativeTo', () => {
    const result = TaskPositionSchema.safeParse({ projectId: 'proj1', placement: 'after' });
    expect(result.success).toBe(false);
  });
});

describe('SectionPositionSchema', () => {
  it('accepts beginning without relativeTo (library root)', () => {
    const result = SectionPositionSchema.safeParse({ placement: 'beginning' });
    expect(result.success).toBe(true);
  });

  it('accepts ending without relativeTo (library root)', () => {
    const result = SectionPositionSchema.safeParse({ placement: 'ending' });
    expect(result.success).toBe(true);
  });

  it('accepts beginning with folder relativeTo', () => {
    const result = SectionPositionSchema.safeParse({
      placement: 'beginning',
      relativeTo: 'folder-id'
    });
    expect(result.success).toBe(true);
  });

  it('accepts ending with folder relativeTo', () => {
    const result = SectionPositionSchema.safeParse({
      placement: 'ending',
      relativeTo: 'folder-id'
    });
    expect(result.success).toBe(true);
  });

  it('accepts before with relativeTo', () => {
    const result = SectionPositionSchema.safeParse({
      placement: 'before',
      relativeTo: 'section-id'
    });
    expect(result.success).toBe(true);
  });

  it('accepts after with relativeTo', () => {
    const result = SectionPositionSchema.safeParse({
      placement: 'after',
      relativeTo: 'section-id'
    });
    expect(result.success).toBe(true);
  });

  it('rejects before without relativeTo', () => {
    const result = SectionPositionSchema.safeParse({ placement: 'before' });
    expect(result.success).toBe(false);
  });

  it('rejects after without relativeTo', () => {
    const result = SectionPositionSchema.safeParse({ placement: 'after' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid placement', () => {
    const result = SectionPositionSchema.safeParse({ placement: 'middle' });
    expect(result.success).toBe(false);
  });
});

describe('PropertyUpdateSetSchema', () => {
  it('accepts flagged only', () => {
    const result = PropertyUpdateSetSchema.safeParse({ flagged: true });
    expect(result.success).toBe(true);
  });

  it('accepts dueDate only', () => {
    const result = PropertyUpdateSetSchema.safeParse({ dueDate: '2026-01-01T00:00:00.000Z' });
    expect(result.success).toBe(true);
  });

  it('accepts clearDueDate: true', () => {
    const result = PropertyUpdateSetSchema.safeParse({ clearDueDate: true });
    expect(result.success).toBe(true);
  });

  it('accepts deferDate only', () => {
    const result = PropertyUpdateSetSchema.safeParse({ deferDate: '2026-01-01T00:00:00.000Z' });
    expect(result.success).toBe(true);
  });

  it('accepts estimatedMinutes only', () => {
    const result = PropertyUpdateSetSchema.safeParse({ estimatedMinutes: 30 });
    expect(result.success).toBe(true);
  });

  it('accepts plannedDate only', () => {
    const result = PropertyUpdateSetSchema.safeParse({ plannedDate: '2026-01-01T00:00:00.000Z' });
    expect(result.success).toBe(true);
  });

  it('accepts note only', () => {
    const result = PropertyUpdateSetSchema.safeParse({ note: 'Append this text' });
    expect(result.success).toBe(true);
  });

  it('accepts addTags only', () => {
    const result = PropertyUpdateSetSchema.safeParse({ addTags: ['Work', 'urgent'] });
    expect(result.success).toBe(true);
  });

  it('accepts removeTags only', () => {
    const result = PropertyUpdateSetSchema.safeParse({ removeTags: ['old-tag'] });
    expect(result.success).toBe(true);
  });

  it('accepts both addTags and removeTags', () => {
    const result = PropertyUpdateSetSchema.safeParse({
      addTags: ['new-tag'],
      removeTags: ['old-tag']
    });
    expect(result.success).toBe(true);
  });

  it('accepts multiple properties together', () => {
    const result = PropertyUpdateSetSchema.safeParse({
      flagged: true,
      dueDate: '2026-01-01T00:00:00.000Z',
      estimatedMinutes: 30
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty properties object', () => {
    const result = PropertyUpdateSetSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects clearX: false only (no-op, does not count)', () => {
    const result = PropertyUpdateSetSchema.safeParse({ clearDueDate: false });
    expect(result.success).toBe(false);
  });

  it('rejects dueDate + clearDueDate mutual exclusion', () => {
    const result = PropertyUpdateSetSchema.safeParse({
      dueDate: '2026-01-01T00:00:00.000Z',
      clearDueDate: true
    });
    expect(result.success).toBe(false);
  });

  it('rejects deferDate + clearDeferDate mutual exclusion', () => {
    const result = PropertyUpdateSetSchema.safeParse({
      deferDate: '2026-01-01T00:00:00.000Z',
      clearDeferDate: true
    });
    expect(result.success).toBe(false);
  });

  it('rejects estimatedMinutes + clearEstimatedMinutes mutual exclusion', () => {
    const result = PropertyUpdateSetSchema.safeParse({
      estimatedMinutes: 30,
      clearEstimatedMinutes: true
    });
    expect(result.success).toBe(false);
  });

  it('rejects plannedDate + clearPlannedDate mutual exclusion', () => {
    const result = PropertyUpdateSetSchema.safeParse({
      plannedDate: '2026-01-01T00:00:00.000Z',
      clearPlannedDate: true
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty addTags array', () => {
    const result = PropertyUpdateSetSchema.safeParse({ addTags: [] });
    expect(result.success).toBe(false);
  });

  it('rejects empty removeTags array', () => {
    const result = PropertyUpdateSetSchema.safeParse({ removeTags: [] });
    expect(result.success).toBe(false);
  });
});
