import { describe, expect, it } from 'vitest';
import {
  FocusItemsErrorSchema,
  FocusItemsInputSchema,
  FocusItemsResponseSchema,
  FocusItemsSuccessSchema,
  FocusTargetSchema
} from '../../../src/contracts/window-tools/focus-items.js';

// T020: Contract tests for focus-items schemas

describe('FocusTargetSchema', () => {
  it('should accept id only', () => {
    const result = FocusTargetSchema.safeParse({ id: 'proj-123' });
    expect(result.success).toBe(true);
  });

  it('should accept name only', () => {
    const result = FocusTargetSchema.safeParse({ name: 'My Project' });
    expect(result.success).toBe(true);
  });

  it('should accept both id and name', () => {
    const result = FocusTargetSchema.safeParse({ id: 'proj-123', name: 'My Project' });
    expect(result.success).toBe(true);
  });

  it('should reject empty object', () => {
    const result = FocusTargetSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject empty id and empty name', () => {
    const result = FocusTargetSchema.safeParse({ id: '', name: '' });
    expect(result.success).toBe(false);
  });
});

describe('FocusItemsInputSchema', () => {
  it('should accept single target with id', () => {
    const result = FocusItemsInputSchema.safeParse({ items: [{ id: 'proj-123' }] });
    expect(result.success).toBe(true);
  });

  it('should accept 50 targets (max boundary)', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }));
    const result = FocusItemsInputSchema.safeParse({ items });
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const result = FocusItemsInputSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('should reject 51 targets (max 50)', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `item-${i}` }));
    const result = FocusItemsInputSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });

  it('should reject targets with neither id nor name', () => {
    const result = FocusItemsInputSchema.safeParse({ items: [{}] });
    expect(result.success).toBe(false);
  });
});

describe('FocusItemsSuccessSchema', () => {
  it('should accept valid success response with INVALID_TYPE error in results', () => {
    const result = FocusItemsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-123',
          itemName: 'My Task',
          itemType: 'task',
          success: false,
          error: 'Tasks cannot be focused',
          code: 'INVALID_TYPE'
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    expect(result.success).toBe(true);
  });
});

describe('FocusItemsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = FocusItemsErrorSchema.safeParse({
      success: false,
      error: 'Version too old'
    });
    expect(result.success).toBe(true);
  });
});

describe('FocusItemsResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = FocusItemsResponseSchema.safeParse({
      success: true,
      results: [{ itemId: 'proj-123', itemName: 'My Project', itemType: 'project', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = FocusItemsResponseSchema.safeParse({
      success: false,
      error: 'No window'
    });
    expect(result.success).toBe(true);
  });
});
