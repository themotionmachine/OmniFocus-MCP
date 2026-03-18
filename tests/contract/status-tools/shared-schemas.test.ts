import { describe, expect, it } from 'vitest';
import {
  DisambiguationErrorSchema,
  ItemIdentifierSchema,
  StatusBatchItemResultSchema,
  SummarySchema
} from '../../../src/contracts/status-tools/shared/index.js';

// T002: Contract tests for shared status-tools schemas

describe('ItemIdentifierSchema', () => {
  it('should accept identifier with id only', () => {
    const result = ItemIdentifierSchema.safeParse({ id: 'task-123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('task-123');
    }
  });

  it('should accept identifier with name only', () => {
    const result = ItemIdentifierSchema.safeParse({ name: 'My Task' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Task');
    }
  });

  it('should accept identifier with both id and name', () => {
    const result = ItemIdentifierSchema.safeParse({ id: 'task-123', name: 'My Task' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('task-123');
      expect(result.data.name).toBe('My Task');
    }
  });

  it('should reject identifier with neither id nor name', () => {
    const result = ItemIdentifierSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject identifier with empty string id and no name', () => {
    const result = ItemIdentifierSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('should reject identifier with empty string name and no id', () => {
    const result = ItemIdentifierSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject identifier with both empty strings', () => {
    const result = ItemIdentifierSchema.safeParse({ id: '', name: '' });
    expect(result.success).toBe(false);
  });

  it('should accept id with empty name (id is non-empty)', () => {
    const result = ItemIdentifierSchema.safeParse({ id: 'task-123', name: '' });
    expect(result.success).toBe(true);
  });

  it('should accept name with empty id (name is non-empty)', () => {
    const result = ItemIdentifierSchema.safeParse({ id: '', name: 'My Task' });
    expect(result.success).toBe(true);
  });
});

describe('StatusBatchItemResultSchema', () => {
  it('should accept successful result with minimal fields', () => {
    const result = StatusBatchItemResultSchema.safeParse({
      itemId: 'task-abc',
      itemName: 'Buy groceries',
      itemType: 'task',
      success: true
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.itemId).toBe('task-abc');
      expect(result.data.itemName).toBe('Buy groceries');
      expect(result.data.itemType).toBe('task');
      expect(result.data.success).toBe(true);
    }
  });

  it('should accept successful result with ALREADY_COMPLETED code', () => {
    const result = StatusBatchItemResultSchema.safeParse({
      itemId: 'task-abc',
      itemName: 'Buy groceries',
      itemType: 'task',
      success: true,
      code: 'ALREADY_COMPLETED'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('ALREADY_COMPLETED');
    }
  });

  it('should accept failed result with NOT_FOUND error', () => {
    const result = StatusBatchItemResultSchema.safeParse({
      itemId: 'bad-id',
      itemName: '',
      itemType: 'task',
      success: false,
      error: 'Item not found: bad-id',
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('Item not found: bad-id');
      expect(result.data.code).toBe('NOT_FOUND');
    }
  });

  it('should accept disambiguation result with candidates array', () => {
    const result = StatusBatchItemResultSchema.safeParse({
      itemId: '',
      itemName: 'Duplicate Name',
      itemType: 'task',
      success: false,
      error: "Multiple items match 'Duplicate Name'. Use ID.",
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { id: 'task-1', name: 'Duplicate Name', type: 'task' },
        { id: 'proj-1', name: 'Duplicate Name', type: 'project' }
      ]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.candidates).toHaveLength(2);
    }
  });

  it('should accept all 6 error codes', () => {
    const codes = [
      'NOT_FOUND',
      'DISAMBIGUATION_REQUIRED',
      'VERSION_NOT_SUPPORTED',
      'ALREADY_COMPLETED',
      'ALREADY_DROPPED',
      'ALREADY_ACTIVE'
    ];
    for (const code of codes) {
      const result = StatusBatchItemResultSchema.safeParse({
        itemId: 'x',
        itemName: 'x',
        itemType: 'task',
        success: false,
        error: 'test',
        code
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept project itemType', () => {
    const result = StatusBatchItemResultSchema.safeParse({
      itemId: 'proj-abc',
      itemName: 'My Project',
      itemType: 'project',
      success: true
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    expect(StatusBatchItemResultSchema.safeParse({}).success).toBe(false);
    expect(StatusBatchItemResultSchema.safeParse({ itemId: 'x', itemName: 'x' }).success).toBe(
      false
    );
  });
});

describe('SummarySchema', () => {
  it('should accept valid summary with all zeros', () => {
    const result = SummarySchema.safeParse({ total: 0, succeeded: 0, failed: 0 });
    expect(result.success).toBe(true);
  });

  it('should accept valid summary with positive counts', () => {
    const result = SummarySchema.safeParse({ total: 5, succeeded: 3, failed: 2 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(5);
      expect(result.data.succeeded).toBe(3);
      expect(result.data.failed).toBe(2);
    }
  });

  it('should reject negative numbers', () => {
    expect(SummarySchema.safeParse({ total: -1, succeeded: 0, failed: 0 }).success).toBe(false);
    expect(SummarySchema.safeParse({ total: 0, succeeded: -1, failed: 0 }).success).toBe(false);
    expect(SummarySchema.safeParse({ total: 0, succeeded: 0, failed: -1 }).success).toBe(false);
  });

  it('should reject non-integer numbers', () => {
    expect(SummarySchema.safeParse({ total: 1.5, succeeded: 0, failed: 0 }).success).toBe(false);
  });

  it('should reject missing fields', () => {
    expect(SummarySchema.safeParse({ total: 1 }).success).toBe(false);
    expect(SummarySchema.safeParse({}).success).toBe(false);
  });
});

describe('DisambiguationErrorSchema', () => {
  it('should accept valid disambiguation error', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: "Multiple items match 'Buy groceries'. Use ID.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['task-1', 'task-2']
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.data.matchingIds).toHaveLength(2);
    }
  });

  it('should accept with more than 2 matching IDs', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: 'Multiple matches',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id-1', 'id-2', 'id-3']
    });
    expect(result.success).toBe(true);
  });

  it('should reject with fewer than 2 matching IDs', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: 'test',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['only-one']
    });
    expect(result.success).toBe(false);
  });

  it('should reject with empty matching IDs', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: 'test',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: []
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: true', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: true,
      error: 'test',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['a', 'b']
    });
    expect(result.success).toBe(false);
  });

  it('should reject wrong code', () => {
    const result = DisambiguationErrorSchema.safeParse({
      success: false,
      error: 'test',
      code: 'NOT_FOUND',
      matchingIds: ['a', 'b']
    });
    expect(result.success).toBe(false);
  });
});
