import { describe, expect, it } from 'vitest';
import {
  CollapseItemsErrorSchema,
  CollapseItemsInputSchema,
  CollapseItemsResponseSchema,
  CollapseItemsSuccessSchema
} from '../../../src/contracts/window-tools/collapse-items.js';

// T017: Contract tests for collapse-items schemas

describe('CollapseItemsInputSchema', () => {
  it('should accept single item with id', () => {
    const result = CollapseItemsInputSchema.safeParse({ items: [{ id: 'task-123' }] });
    expect(result.success).toBe(true);
  });

  it('should accept items with completely=true', () => {
    const result = CollapseItemsInputSchema.safeParse({
      items: [{ id: 'task-123' }],
      completely: true
    });
    expect(result.success).toBe(true);
  });

  it('should accept items without completely (optional)', () => {
    const result = CollapseItemsInputSchema.safeParse({ items: [{ name: 'My Task' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completely).toBeUndefined();
    }
  });

  it('should accept 50 items (max boundary)', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }));
    const result = CollapseItemsInputSchema.safeParse({ items });
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const result = CollapseItemsInputSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('should reject 51 items (max 50)', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `item-${i}` }));
    const result = CollapseItemsInputSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });
});

describe('CollapseItemsSuccessSchema', () => {
  it('should accept valid success response with ALREADY_COLLAPSED no-op', () => {
    const result = CollapseItemsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-123',
          itemName: 'My Task',
          itemType: 'task',
          success: true,
          code: 'ALREADY_COLLAPSED'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });
});

describe('CollapseItemsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = CollapseItemsErrorSchema.safeParse({
      success: false,
      error: 'Content tree not available'
    });
    expect(result.success).toBe(true);
  });
});

describe('CollapseItemsResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = CollapseItemsResponseSchema.safeParse({
      success: true,
      results: [{ itemId: 'task-123', itemName: 'Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = CollapseItemsResponseSchema.safeParse({
      success: false,
      error: 'No window'
    });
    expect(result.success).toBe(true);
  });
});
