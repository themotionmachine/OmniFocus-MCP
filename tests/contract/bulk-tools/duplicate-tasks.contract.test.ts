import { describe, expect, it } from 'vitest';
import {
  DuplicateTasksErrorSchema,
  DuplicateTasksInputSchema,
  DuplicateTasksResponseSchema,
  DuplicateTasksSuccessSchema
} from '../../../src/contracts/bulk-tools/index.js';

describe('DuplicateTasksInputSchema', () => {
  it('accepts valid input with projectId and items', () => {
    const result = DuplicateTasksInputSchema.safeParse({
      items: [{ id: 'task1' }],
      position: { projectId: 'proj1' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts up to 100 items', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `task${i}` }));
    const result = DuplicateTasksInputSchema.safeParse({
      items,
      position: { projectId: 'proj1' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts inbox target', () => {
    const result = DuplicateTasksInputSchema.safeParse({
      items: [{ name: 'My Task' }],
      position: { inbox: true }
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = DuplicateTasksInputSchema.safeParse({
      items: [],
      position: { projectId: 'proj1' }
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 items', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ id: `task${i}` }));
    const result = DuplicateTasksInputSchema.safeParse({
      items,
      position: { projectId: 'proj1' }
    });
    expect(result.success).toBe(false);
  });
});

describe('DuplicateTasksSuccessSchema', () => {
  it('accepts success with newId and newName', () => {
    const result = DuplicateTasksSuccessSchema.safeParse({
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
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial failure with some copies', () => {
    const result = DuplicateTasksSuccessSchema.safeParse({
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

describe('DuplicateTasksErrorSchema', () => {
  it('accepts error with TARGET_NOT_FOUND code', () => {
    const result = DuplicateTasksErrorSchema.safeParse({
      success: false,
      error: "Project 'proj1' not found",
      code: 'TARGET_NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });
});

describe('DuplicateTasksResponseSchema', () => {
  it('discriminates on success: true', () => {
    const result = DuplicateTasksResponseSchema.safeParse({
      success: true,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('discriminates on success: false', () => {
    const result = DuplicateTasksResponseSchema.safeParse({
      success: false,
      error: 'Target not found'
    });
    expect(result.success).toBe(true);
  });
});
