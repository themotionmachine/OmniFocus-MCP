import { describe, expect, it } from 'vitest';
import {
  ExpandItemsErrorSchema,
  ExpandItemsInputSchema,
  ExpandItemsResponseSchema,
  ExpandItemsSuccessSchema
} from '../../../src/contracts/window-tools/expand-items.js';

// T016: Contract tests for expand-items schemas

describe('ExpandItemsInputSchema', () => {
  it('should accept single item with id', () => {
    const result = ExpandItemsInputSchema.safeParse({ items: [{ id: 'task-123' }] });
    expect(result.success).toBe(true);
  });

  it('should accept items with completely=true', () => {
    const result = ExpandItemsInputSchema.safeParse({
      items: [{ id: 'task-123' }],
      completely: true
    });
    expect(result.success).toBe(true);
  });

  it('should accept items with completely=false', () => {
    const result = ExpandItemsInputSchema.safeParse({
      items: [{ id: 'task-123' }],
      completely: false
    });
    expect(result.success).toBe(true);
  });

  it('should accept items without completely (optional)', () => {
    const result = ExpandItemsInputSchema.safeParse({ items: [{ name: 'My Task' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completely).toBeUndefined();
    }
  });

  it('should accept 50 items (max boundary)', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }));
    const result = ExpandItemsInputSchema.safeParse({ items });
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const result = ExpandItemsInputSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('should reject 51 items (max 50)', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `item-${i}` }));
    const result = ExpandItemsInputSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });

  it('should reject items with neither id nor name', () => {
    const result = ExpandItemsInputSchema.safeParse({ items: [{}] });
    expect(result.success).toBe(false);
  });
});

describe('ExpandItemsSuccessSchema', () => {
  it('should accept valid success response with ALREADY_EXPANDED no-op', () => {
    const result = ExpandItemsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-123',
          itemName: 'My Task',
          itemType: 'task',
          success: true,
          code: 'ALREADY_EXPANDED'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });
});

describe('ExpandItemsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = ExpandItemsErrorSchema.safeParse({
      success: false,
      error: 'Version too old'
    });
    expect(result.success).toBe(true);
  });
});

describe('ExpandItemsResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = ExpandItemsResponseSchema.safeParse({
      success: true,
      results: [{ itemId: 'task-123', itemName: 'Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = ExpandItemsResponseSchema.safeParse({
      success: false,
      error: 'No window'
    });
    expect(result.success).toBe(true);
  });
});
