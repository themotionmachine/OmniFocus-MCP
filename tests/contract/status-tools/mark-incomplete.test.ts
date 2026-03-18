import { describe, expect, it } from 'vitest';
import {
  MarkIncompleteErrorSchema,
  MarkIncompleteInputSchema,
  MarkIncompleteResponseSchema,
  MarkIncompleteSuccessSchema
} from '../../../src/contracts/status-tools/mark-incomplete.js';

// T009: Contract tests for mark-incomplete schemas

describe('MarkIncompleteInputSchema', () => {
  it('should accept a single item by ID', () => {
    const result = MarkIncompleteInputSchema.safeParse({
      items: [{ id: 'task-123' }]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].id).toBe('task-123');
    }
  });

  it('should accept a single item by name', () => {
    const result = MarkIncompleteInputSchema.safeParse({
      items: [{ name: 'Buy groceries' }]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].name).toBe('Buy groceries');
    }
  });

  it('should accept a single item with both id and name', () => {
    const result = MarkIncompleteInputSchema.safeParse({
      items: [{ id: 'task-123', name: 'Buy groceries' }]
    });
    expect(result.success).toBe(true);
  });

  it('should accept exactly 100 items (max boundary)', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `task-${i}` }));
    const result = MarkIncompleteInputSchema.safeParse({ items });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(100);
    }
  });

  it('should accept multiple items (batch)', () => {
    const result = MarkIncompleteInputSchema.safeParse({
      items: [{ id: 'task-1' }, { id: 'proj-1' }, { name: 'My Task' }]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(3);
    }
  });

  it('should reject empty items array (min=1)', () => {
    const result = MarkIncompleteInputSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('should reject 101 items (max=100)', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ id: `task-${i}` }));
    const result = MarkIncompleteInputSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });

  it('should reject an item with neither id nor name', () => {
    const result = MarkIncompleteInputSchema.safeParse({
      items: [{}]
    });
    expect(result.success).toBe(false);
  });

  it('should reject an item with empty string id and no name', () => {
    const result = MarkIncompleteInputSchema.safeParse({
      items: [{ id: '' }]
    });
    expect(result.success).toBe(false);
  });

  it('should reject an item with empty string name and no id', () => {
    const result = MarkIncompleteInputSchema.safeParse({
      items: [{ name: '' }]
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing items field', () => {
    const result = MarkIncompleteInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('MarkIncompleteSuccessSchema', () => {
  it('should accept valid success response with one result', () => {
    const result = MarkIncompleteSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-abc',
          itemName: 'Buy groceries',
          itemType: 'task',
          success: true
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
      expect(result.data.results).toHaveLength(1);
      expect(result.data.summary.total).toBe(1);
    }
  });

  it('should accept success response with ALREADY_ACTIVE code (no-op)', () => {
    const result = MarkIncompleteSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-abc',
          itemName: 'Active Task',
          itemType: 'task',
          success: true,
          code: 'ALREADY_ACTIVE'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results[0].code).toBe('ALREADY_ACTIVE');
    }
  });

  it('should accept partial failure response (mixed results)', () => {
    const result = MarkIncompleteSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-good',
          itemName: 'Good Task',
          itemType: 'task',
          success: true
        },
        {
          itemId: 'task-bad',
          itemName: '',
          itemType: 'task',
          success: false,
          error: 'Item not found: task-bad',
          code: 'NOT_FOUND'
        }
      ],
      summary: { total: 2, succeeded: 1, failed: 1 }
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results[0].success).toBe(true);
      expect(result.data.results[1].success).toBe(false);
      expect(result.data.summary.succeeded).toBe(1);
      expect(result.data.summary.failed).toBe(1);
    }
  });

  it('should accept project itemType', () => {
    const result = MarkIncompleteSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'proj-abc',
          itemName: 'My Project',
          itemType: 'project',
          success: true
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation result with candidates', () => {
    const result = MarkIncompleteSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: '',
          itemName: 'Duplicate Name',
          itemType: 'task',
          success: false,
          error: "Multiple items match 'Duplicate Name'. Use ID.",
          code: 'DISAMBIGUATION_REQUIRED',
          candidates: [
            { id: 'task-1', name: 'Duplicate Name', type: 'task' },
            { id: 'task-2', name: 'Duplicate Name', type: 'task' }
          ]
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results[0].candidates).toHaveLength(2);
    }
  });

  it('should reject success=false', () => {
    const result = MarkIncompleteSuccessSchema.safeParse({
      success: false,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    expect(MarkIncompleteSuccessSchema.safeParse({ success: true }).success).toBe(false);
    expect(MarkIncompleteSuccessSchema.safeParse({ success: true, results: [] }).success).toBe(
      false
    );
  });
});

describe('MarkIncompleteErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = MarkIncompleteErrorSchema.safeParse({
      success: false,
      error: 'OmniFocus is not running'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('OmniFocus is not running');
    }
  });

  it('should reject success=true', () => {
    const result = MarkIncompleteErrorSchema.safeParse({
      success: true,
      error: 'some error'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing error field', () => {
    const result = MarkIncompleteErrorSchema.safeParse({ success: false });
    expect(result.success).toBe(false);
  });
});

describe('MarkIncompleteResponseSchema', () => {
  it('should accept success response', () => {
    const result = MarkIncompleteResponseSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-abc',
          itemName: 'Buy groceries',
          itemType: 'task',
          success: true
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
    }
  });

  it('should accept error response', () => {
    const result = MarkIncompleteResponseSchema.safeParse({
      success: false,
      error: 'Script failed'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
    }
  });

  it('should correctly discriminate on success field', () => {
    const successData = {
      success: true,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    };
    const successResult = MarkIncompleteResponseSchema.safeParse(successData);
    expect(successResult.success).toBe(true);

    const errorData = { success: false, error: 'fail' };
    const errorResult = MarkIncompleteResponseSchema.safeParse(errorData);
    expect(errorResult.success).toBe(true);
  });

  it('should reject invalid shape', () => {
    const result = MarkIncompleteResponseSchema.safeParse({ success: true });
    expect(result.success).toBe(false);
  });
});
