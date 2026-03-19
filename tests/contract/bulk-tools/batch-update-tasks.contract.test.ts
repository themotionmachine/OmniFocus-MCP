import { describe, expect, it } from 'vitest';
import {
  BatchUpdateTasksErrorSchema,
  BatchUpdateTasksInputSchema,
  BatchUpdateTasksResponseSchema,
  BatchUpdateTasksSuccessSchema
} from '../../../src/contracts/bulk-tools/index.js';

describe('BatchUpdateTasksInputSchema', () => {
  it('accepts valid input with flagged property', () => {
    const result = BatchUpdateTasksInputSchema.safeParse({
      items: [{ id: 'task1' }],
      properties: { flagged: true }
    });
    expect(result.success).toBe(true);
  });

  it('accepts up to 100 items', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `task${i}` }));
    const result = BatchUpdateTasksInputSchema.safeParse({
      items,
      properties: { flagged: false }
    });
    expect(result.success).toBe(true);
  });

  it('accepts addTags and removeTags together', () => {
    const result = BatchUpdateTasksInputSchema.safeParse({
      items: [{ id: 'task1' }],
      properties: { addTags: ['Work'], removeTags: ['Personal'] }
    });
    expect(result.success).toBe(true);
  });

  it('accepts clearDueDate: true', () => {
    const result = BatchUpdateTasksInputSchema.safeParse({
      items: [{ id: 'task1' }],
      properties: { clearDueDate: true }
    });
    expect(result.success).toBe(true);
  });

  it('accepts dueDate property', () => {
    const result = BatchUpdateTasksInputSchema.safeParse({
      items: [{ id: 'task1' }],
      properties: { dueDate: '2026-01-15T00:00:00.000Z' }
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = BatchUpdateTasksInputSchema.safeParse({
      items: [],
      properties: { flagged: true }
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 items', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ id: `task${i}` }));
    const result = BatchUpdateTasksInputSchema.safeParse({
      items,
      properties: { flagged: true }
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty properties', () => {
    const result = BatchUpdateTasksInputSchema.safeParse({
      items: [{ id: 'task1' }],
      properties: {}
    });
    expect(result.success).toBe(false);
  });

  it('rejects dueDate + clearDueDate mutual exclusion', () => {
    const result = BatchUpdateTasksInputSchema.safeParse({
      items: [{ id: 'task1' }],
      properties: { dueDate: '2026-01-15', clearDueDate: true }
    });
    expect(result.success).toBe(false);
  });
});

describe('BatchUpdateTasksSuccessSchema', () => {
  it('accepts valid success response', () => {
    const result = BatchUpdateTasksSuccessSchema.safeParse({
      success: true,
      results: [{ itemId: 'task1', itemName: 'My Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial failure result', () => {
    const result = BatchUpdateTasksSuccessSchema.safeParse({
      success: true,
      results: [
        { itemId: 'task1', itemName: 'Task 1', itemType: 'task', success: true },
        {
          itemId: '',
          itemName: 'Unknown',
          itemType: 'task',
          success: false,
          error: 'Not found',
          code: 'NOT_FOUND'
        }
      ],
      summary: { total: 2, succeeded: 1, failed: 1 }
    });
    expect(result.success).toBe(true);
  });
});

describe('BatchUpdateTasksErrorSchema', () => {
  it('accepts error with VALIDATION_ERROR code', () => {
    const result = BatchUpdateTasksErrorSchema.safeParse({
      success: false,
      error: 'At least one property must be specified',
      code: 'VALIDATION_ERROR'
    });
    expect(result.success).toBe(true);
  });
});

describe('BatchUpdateTasksResponseSchema', () => {
  it('discriminates on success: true', () => {
    const result = BatchUpdateTasksResponseSchema.safeParse({
      success: true,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('discriminates on success: false', () => {
    const result = BatchUpdateTasksResponseSchema.safeParse({
      success: false,
      error: 'Operation failed'
    });
    expect(result.success).toBe(true);
  });
});
