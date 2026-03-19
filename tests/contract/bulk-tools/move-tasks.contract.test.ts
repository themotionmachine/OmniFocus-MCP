import { describe, expect, it } from 'vitest';
import {
  MoveTasksErrorSchema,
  MoveTasksInputSchema,
  MoveTasksResponseSchema,
  MoveTasksSuccessSchema
} from '../../../src/contracts/bulk-tools/index.js';

describe('MoveTasksInputSchema', () => {
  it('accepts valid input with projectId and items', () => {
    const result = MoveTasksInputSchema.safeParse({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts up to 100 items', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `task${i}` }));
    const result = MoveTasksInputSchema.safeParse({
      items,
      position: { projectId: 'proj1' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts inbox target', () => {
    const result = MoveTasksInputSchema.safeParse({
      items: [{ id: 'task1' }],
      position: { inbox: true }
    });
    expect(result.success).toBe(true);
  });

  it('accepts before placement with relativeTo', () => {
    const result = MoveTasksInputSchema.safeParse({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1', placement: 'before', relativeTo: 'sibling-id' }
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = MoveTasksInputSchema.safeParse({
      items: [],
      position: { projectId: 'proj1' }
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 items', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ id: `task${i}` }));
    const result = MoveTasksInputSchema.safeParse({
      items,
      position: { projectId: 'proj1' }
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing position', () => {
    const result = MoveTasksInputSchema.safeParse({
      items: [{ id: 'task1' }]
    });
    expect(result.success).toBe(false);
  });
});

describe('MoveTasksSuccessSchema', () => {
  it('accepts valid success response', () => {
    const result = MoveTasksSuccessSchema.safeParse({
      success: true,
      results: [{ itemId: 'task1', itemName: 'My Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial failure result', () => {
    const result = MoveTasksSuccessSchema.safeParse({
      success: true,
      results: [
        { itemId: 'task1', itemName: 'My Task', itemType: 'task', success: true },
        {
          itemId: 'task2',
          itemName: '',
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

describe('MoveTasksErrorSchema', () => {
  it('accepts error with code', () => {
    const result = MoveTasksErrorSchema.safeParse({
      success: false,
      error: "Project 'proj1' not found",
      code: 'TARGET_NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });

  it('accepts error without code', () => {
    const result = MoveTasksErrorSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
  });
});

describe('MoveTasksResponseSchema', () => {
  it('discriminates on success: true', () => {
    const result = MoveTasksResponseSchema.safeParse({
      success: true,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('discriminates on success: false', () => {
    const result = MoveTasksResponseSchema.safeParse({
      success: false,
      error: 'Target not found',
      code: 'TARGET_NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });
});
